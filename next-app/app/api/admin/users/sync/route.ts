import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEmbyServiceForUser, getPlexServiceForUser, getJellyfinServiceForUser } from '@/lib/auth'
import { logAction } from '@/lib/audit'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as any).role === 'admin'
  
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let provider = 'all'
  try {
      const body = await req.json()
      if (body.provider) provider = body.provider
  } catch (e) {
      // Body might be empty
  }

  let details: string[] = []

  try {
    // 1. Fetch enabled settings to know which services to sync
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['auth_emby_enabled', 'auth_plex_enabled', 'auth_jellyfin_enabled', 'default_role_id']
        }
      },
      select: { key: true, value: true }
    })
    
    const isEmbyEnabled = settings.find(s => s.key === 'auth_emby_enabled')?.value === 'true'
    const isPlexEnabled = settings.find(s => s.key === 'auth_plex_enabled')?.value === 'true'
    const isJellyfinEnabled = settings.find(s => s.key === 'auth_jellyfin_enabled')?.value === 'true'
    const defaultRoleId = settings.find(s => s.key === 'default_role_id')?.value

    // Fetch admin role
    const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } })
    const adminRoleId = adminRole?.id

    const shouldSyncEmby = (provider === 'all' || provider === 'emby') && isEmbyEnabled
    const shouldSyncPlex = (provider === 'all' || provider === 'plex') && isPlexEnabled
    const shouldSyncJellyfin = (provider === 'all' || provider === 'jellyfin') && isJellyfinEnabled

    let embySyncSuccess = false
    let plexSyncSuccess = false
    let jellyfinSyncSuccess = false

    const activeUserIds = new Set<string>()
    const activeEmbyIds = new Set<string>()
    const activePlexIds = new Set<string>()
    const activeJellyfinIds = new Set<string>()

    let createdCount = 0
    let updatedCount = 0
    let deletedCount = 0

    // 2. Sync Emby Users
    if (shouldSyncEmby) {
      const embyService = await getEmbyServiceForUser()
      if (!embyService && provider === 'emby') {
        throw new Error('Emby non configuré (URL ou Clé API manquante)')
      }

      if (embyService) {
        try {
          const embyUsers = await embyService.getUsers()
          if (Array.isArray(embyUsers) && embyUsers.length > 0) {
            embySyncSuccess = true
            log(`[SyncUsers] Found ${embyUsers.length} Emby users`)
            
            for (const u of embyUsers) {
              try {
                activeEmbyIds.add(u.Id)
                const email = u.Email || u.ConnectUserName || null // Use ConnectUserName as fallback
                
                // Try to find existing user by Emby ID
                let user = await prisma.user.findFirst({ where: { embyUserId: u.Id } })
                
                // If not found, try by Email (if email exists)
                if (!user && email) {
                    user = await prisma.user.findFirst({ where: { email } })
                }

                if (user) {
                  await prisma.user.update({
                    where: { id: user.id },
                    data: {
                      embyUserId: u.Id,
                      // Only update name/image if it's currently missing or we want to force sync?
                      // Let's preserve local name if it exists, but update if embyUserId was just linked
                    }
                  })
                  activeUserIds.add(user.id.toString())
                  updatedCount++
                } else {
                  // Create new user
                  const safeName = u.Name.replace(/[^a-zA-Z0-9]/g, '') || `User${u.Id}`
                  const userEmail = email || `${safeName.toLowerCase()}@emby.local`
                  
                  // Check if generated email already exists to avoid unique constraint error
                  const existingEmail = await prisma.user.findUnique({ where: { email: userEmail } })
                  if (existingEmail) {
                      warn(`[SyncUsers] Email ${userEmail} already exists but not linked to Emby User ${u.Id}. Skipping creation or generating unique email.`)
                      // Option: append random string to email? or skip?
                      // Let's skip for now to avoid mess, or try to link?
                      // If we are here, it means we didn't find the user by embyUserId OR by email (if email was provided by Emby).
                      // So this must be a generated email collision.
                      details.push(`Emby user ${u.Name}: Email collision for ${userEmail}`)
                      continue
                  }

                  const newUser = await prisma.user.create({
                    data: {
                      name: u.Name,
                      email: userEmail, // Fallback email
                      embyUserId: u.Id,
                      role: u.Policy?.IsAdministrator ? 'admin' : 'user',
                      roleId: u.Policy?.IsAdministrator ? adminRoleId : defaultRoleId || undefined,
                      image: u.PrimaryImageTag ? embyService.getItemImageUrl(u.Id) : null
                    }
                  })
                  
                  await logAction(parseInt((session.user as any).id), 'CREATE', 'User', newUser.id.toString(), {
                    provider: 'Emby',
                    userName: newUser.name,
                    userEmail: newUser.email
                  })
                  
                  try {
                      const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
                      await ExternalNotificationService.send('user_created', {
                          title: 'Nouvel utilisateur',
                          message: `L'utilisateur ${newUser.name} a été créé (via synchronisation Emby).`,
                          data: { name: newUser.name, email: newUser.email, provider: 'Emby' }
                      })
                  } catch (e) {}

                  activeUserIds.add(newUser.id.toString())
                  createdCount++
                }
              } catch (err: any) {
                error(`[SyncUsers] Failed to process Emby user ${u.Name}:`, err)
                details.push(`Emby user ${u.Name}: ${err.message}`)
              }
            }
          } else {
            warn('[SyncUsers] Emby returned 0 users. Skipping cleanup for Emby.')
            details.push('Emby: 0 users found (cleanup skipped)')
        }
      } catch (e) {
          error(`[SyncUsers] Emby sync failed:`, e)
        }
      }
    }

    // 3. Sync Plex Users
    if (shouldSyncPlex) {
        const plexService = await getPlexServiceForUser()
        if (!plexService && provider === 'plex') {
            throw new Error('Plex non configuré (URL ou Token manquant)')
        }

        if (plexService) {
            try {
                const plexUsers = await plexService.getUsers() // Returns [{Id, Name, Email?}]
                if (Array.isArray(plexUsers) && plexUsers.length > 0) {
                    plexSyncSuccess = true
                    for (const u of plexUsers) {
                        try {
                            activePlexIds.add(u.Id)
                            // Plex users usually have email if they are Plex Home users or Friends
                            // Our getUsers implementation maps Id and Name. Let's see if we can get Email.
                            
                            const userName = u.Name || `Plex User ${u.Id}`
                            const userEmail = u.Email || `${userName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@plex.local`

                            let user = await prisma.user.findFirst({ where: { plexUserId: u.Id } })
                            
                            if (!user) {
                                // Do NOT match by name to avoid merging different people with same nickname
                                // user = await prisma.user.findFirst({ where: { name: userName } })
                            }
        
                            if (user) {
                                await prisma.user.update({
                                    where: { id: user.id },
                                    data: { 
                                        plexUserId: u.Id,
                                        image: u.Thumb ? (u.Thumb.startsWith('http') ? u.Thumb : plexService.getItemImageUrl(u.Thumb)) : user.image
                                    }
                                })
                                activeUserIds.add(user.id.toString())
                                updatedCount++
                            } else {
                                const newUser = await prisma.user.create({
                                data: {
                                    name: userName,
                                    email: userEmail,
                                    plexUserId: u.Id,
                                    role: 'user',
                                    roleId: defaultRoleId || undefined,
                                    image: u.Thumb ? (u.Thumb.startsWith('http') ? u.Thumb : plexService.getItemImageUrl(u.Thumb)) : null
                                }
                            })
                            
                                await logAction(parseInt((session.user as any).id), 'CREATE', 'User', newUser.id.toString(), {
                                  provider: 'Plex',
                                  userName: newUser.name,
                                  userEmail: newUser.email
                                })
                                
                                try {
                                    const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
                                    await ExternalNotificationService.send('user_created', {
                                        title: 'Nouvel utilisateur',
                                        message: `L'utilisateur ${newUser.name} a été créé (via synchronisation Plex).`,
                                        data: { name: newUser.name, email: newUser.email, provider: 'Plex' }
                                    })
                                } catch (e) {}

                                activeUserIds.add(newUser.id.toString())
                                createdCount++
                            }
                        } catch (err: any) {
                            error(`[SyncUsers] Failed to process Plex user ${u.Name}:`, err)
                            details.push(`Plex user ${u.Name}: ${err.message}`)
                        }
                    }
                } else {
                    warn('[SyncUsers] Plex returned 0 users. Skipping cleanup for Plex.')
                    details.push('Plex: 0 users found (cleanup skipped)')
                }
            } catch (e: any) {
                error(`[SyncUsers] Plex sync failed:`, e)
                details.push(`Plex sync failed: ${e.message}`)
            }
        }
    }

    // 4. Sync Jellyfin Users
    if (shouldSyncJellyfin) {
        const jellyfinService = await getJellyfinServiceForUser()
        if (!jellyfinService && provider === 'jellyfin') {
            throw new Error('Jellyfin non configuré (URL manquante)')
        }

        if (jellyfinService) {
            try {
                const jellyfinUsers = await jellyfinService.getUsers()
                if (Array.isArray(jellyfinUsers) && jellyfinUsers.length > 0) {
                    jellyfinSyncSuccess = true
                    for (const u of jellyfinUsers) {
                        activeJellyfinIds.add(u.Id)
                        
                        const userName = u.Name || `Jellyfin User ${u.Id}`
                        const userEmail = `${userName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@jellyfin.local`

                        let user = await prisma.user.findFirst({ where: { jellyfinUserId: u.Id } })
                        
                        if (!user) {
                             // Do NOT match by name to avoid merging different people with same nickname
                        }
    
                        if (user) {
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { jellyfinUserId: u.Id }
                            })
                            activeUserIds.add(user.id.toString())
                            updatedCount++
                        } else {
                             const newUser = await prisma.user.create({
                                data: {
                                    name: userName,
                                    email: userEmail,
                                    jellyfinUserId: u.Id,
                                    role: u.Policy?.IsAdministrator ? 'admin' : 'user',
                                    roleId: u.Policy?.IsAdministrator ? adminRoleId : defaultRoleId || undefined,
                                    image: u.PrimaryImageTag ? jellyfinService.getItemImageUrl(u.Id) : null
                                }
                            })
                            
                            await logAction(parseInt((session.user as any).id), 'CREATE', 'User', newUser.id.toString(), {
                              provider: 'Jellyfin',
                              userName: newUser.name,
                              userEmail: newUser.email
                            })
                            
                            try {
                                const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
                                await ExternalNotificationService.send('user_created', {
                                    title: 'Nouvel utilisateur',
                                    message: `L'utilisateur ${newUser.name} a été créé (via synchronisation Jellyfin).`,
                                    data: { name: newUser.name, email: newUser.email, provider: 'Jellyfin' }
                                })
                            } catch (e) {}

                            activeUserIds.add(newUser.id.toString())
                            createdCount++
                        }
                    }
                } else {
                    warn('[SyncUsers] Jellyfin returned 0 users. Skipping cleanup for Jellyfin.')
                    details.push('Jellyfin: 0 users found (cleanup skipped)')
                }
            } catch (e) {
                error(`[SyncUsers] Jellyfin sync failed:`, e)
            }
        }
    }

    // 5. Cleanup Logic
    // We want to remove users who are NOT present in ANY of the enabled services
    // BUT we must be careful not to delete the current admin user or users created manually (if any)
    // The user said: "detecte si un user est plus sur le les serveur plex jelyfin emby sa le suprime"
    
    // Get all users
    const allUsers = await prisma.user.findMany()
    const currentUserId = (session.user as any).id

    // Pre-calculate counts and protection flags to optimize loop
    const existingEmbyCount = allUsers.filter(u => u.embyUserId).length
    const foundEmbyCount = activeEmbyIds.size
    const skipEmbyCleanup = shouldSyncEmby && embySyncSuccess && existingEmbyCount > 5 && foundEmbyCount < existingEmbyCount * 0.2

    if (skipEmbyCleanup) {
        warn(`[SyncUsers] Emby Mass Unlink Protection: Existing ${existingEmbyCount}, Found ${foundEmbyCount}. Skipping cleanup.`)
        details.push(`Emby: Mass unlink protection triggered (Existing: ${existingEmbyCount}, Found: ${foundEmbyCount}). Cleanup skipped.`)
    }

    const existingPlexCount = allUsers.filter(u => u.plexUserId).length
    const foundPlexCount = activePlexIds.size
    const skipPlexCleanup = shouldSyncPlex && plexSyncSuccess && existingPlexCount > 5 && foundPlexCount < existingPlexCount * 0.2

    if (skipPlexCleanup) {
        warn(`[SyncUsers] Plex Mass Unlink Protection: Existing ${existingPlexCount}, Found ${foundPlexCount}. Skipping cleanup.`)
        details.push(`Plex: Mass unlink protection triggered (Existing: ${existingPlexCount}, Found: ${foundPlexCount}). Cleanup skipped.`)
    }

    const existingJellyfinCount = allUsers.filter(u => u.jellyfinUserId).length
    const foundJellyfinCount = activeJellyfinIds.size
    const skipJellyfinCleanup = shouldSyncJellyfin && jellyfinSyncSuccess && existingJellyfinCount > 5 && foundJellyfinCount < existingJellyfinCount * 0.2

    if (skipJellyfinCleanup) {
        warn(`[SyncUsers] Jellyfin Mass Unlink Protection: Existing ${existingJellyfinCount}, Found ${foundJellyfinCount}. Skipping cleanup.`)
        details.push(`Jellyfin: Mass unlink protection triggered (Existing: ${existingJellyfinCount}, Found: ${foundJellyfinCount}). Cleanup skipped.`)
    }

    for (const user of allUsers) {
        // Skip current user (safety)
        if (user.id === parseInt(currentUserId)) continue;

        // Skip users that might be purely local (e.g. system accounts if any)
        // For now, we assume all users should be linked to at least one service if that service is enabled.
        
        // Check Emby
        if (user.embyUserId) {
            // Only cleanup Emby link if we actually synced Emby successfully
            if (shouldSyncEmby && embySyncSuccess && !skipEmbyCleanup) {
                if (!activeEmbyIds.has(user.embyUserId)) {
                     await prisma.user.update({ where: { id: user.id }, data: { embyUserId: null } })
                }
            }
        }

        // Check Plex
        if (user.plexUserId) {
             // Only cleanup Plex link if we actually synced Plex successfully
            if (shouldSyncPlex && plexSyncSuccess && !skipPlexCleanup) {
                if (!activePlexIds.has(user.plexUserId)) {
                     await prisma.user.update({ where: { id: user.id }, data: { plexUserId: null } })
                }
            }
        }

        // Check Jellyfin
        if (user.jellyfinUserId) {
             // Only cleanup Jellyfin link if we actually synced Jellyfin successfully
            if (shouldSyncJellyfin && jellyfinSyncSuccess && !skipJellyfinCleanup) {
                if (!activeJellyfinIds.has(user.jellyfinUserId)) {
                     await prisma.user.update({ where: { id: user.id }, data: { jellyfinUserId: null } })
                }
            }
        }

        // Re-evaluate user after potential link removals
        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
        
        const hasEmby = !!updatedUser?.embyUserId
        const hasPlex = !!updatedUser?.plexUserId
        const hasJellyfin = !!updatedUser?.jellyfinUserId

        // A user is "valid" if they have at least one link to an ACTIVE user on an ENABLED service (if sync succeeded),
        // OR a link to a DISABLED service (which we can't verify, so we keep).
        // If sync failed for a service, we assume links are valid to avoid accidental deletion.
        
        // Logic:
        // If we synced Emby, validity depends on activeEmbyIds.
        // If we didn't sync Emby (or failed), validity is just "hasEmby" (we assume it's valid).
        const validEmby = hasEmby // It's valid if it exists (we already removed invalid ones above if we synced)
        const validPlex = hasPlex 
        const validJellyfin = hasJellyfin 

        if (!validEmby && !validPlex && !validJellyfin) {
            // User has no valid links remaining.
            // Delete them.
            log(`[SyncUsers] Deleting user ${user.name} (ID: ${user.id}) - No longer found on any enabled service`)
            
            // Log individual deletion before deleting the user so we have the user context
            await logAction(
              parseInt(currentUserId),
              'DELETE',
              'User',
              user.id.toString(),
              { 
                reason: 'Removed during sync (no longer on any active provider)',
                userName: user.name,
                userEmail: user.email
              }
            )
            
            await prisma.user.delete({ where: { id: user.id } })
            deletedCount++
        }
    }

    await logAction(
      parseInt((session.user as any).id),
      'SYNC',
      'User',
      'Batch',
      { created: createdCount, updated: updatedCount, deleted: deletedCount }
    )

    return NextResponse.json({ 
      success: true, 
      created: createdCount, 
      updated: updatedCount,
      deleted: deletedCount,
      emby: embySyncSuccess,
      plex: plexSyncSuccess,
      jellyfin: jellyfinSyncSuccess,
      details
    })
  } catch (error: any) {
    error('[SyncUsers] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
