import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { settings, users, userGroups, userGroupMembers, accounts, sessions, watchLater, mediaRequests, watchEvents, auditLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { decryptData } from '@/lib/crypto'
import { isAppConfigured } from '@/lib/setup'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // 1. Check if app is already configured
    const configured = await isAppConfigured()
    if (configured) {
      return NextResponse.json(
        { error: 'L\'application est dÃ©jÃ  configurÃ©e. La restauration n\'est possible que lors de l\'installation initiale.' },
        { status: 403 }
      )
    }

    const { data, password } = await request.json()

    if (!data || !password) {
      return NextResponse.json({ error: 'Fichier et mot de passe requis' }, { status: 400 })
    }

    // 2. Decrypt
    let decryptedJson: string
    try {
      decryptedJson = await decryptData(data, password)
    } catch (e) {
      return NextResponse.json({ error: 'DÃ©chiffrement Ã©chouÃ©. Mot de passe invalide ou fichier corrompu.' }, { status: 400 })
    }

    const backup = JSON.parse(decryptedJson)

    // 3. Detect format and restore
    if (backup.type === 'full_database' && backup.data) {
      // Full Database Restore
      const dbData = backup.data
      
      // DELETE ALL EXISTING DATA (Order: Child -> Parent)
      await db.delete(userGroupMembers)
      await db.delete(mediaRequests)
      // await db.delete(notifications) // V1 notifications supprimées - table notifications n'existe plus
      await db.delete(watchLater)
      await db.delete(accounts)
      await db.delete(sessions)
      await db.delete(auditLogs)
      await db.delete(watchEvents)
      await db.delete(users)
      await db.delete(userGroups)
      await db.delete(settings)

      // RESTORE DATA (Order: Parent -> Child)
      
      // Independent
      if (dbData.settings?.length) {
        for (const s of dbData.settings) {
          await db.insert(settings).values({
            key: s.key,
            value: s.value,
            category: s.category || s.group || 'general',
            createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
          })
        }
      }

      // Users
      if (dbData.users?.length) {
        for (const u of dbData.users) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { roleId, permissions, roleVersion, ...userData } = u
          let role = userData.role
          if (role !== 'admin' && role !== 'user') {
            role = 'user'
          }
          await db.insert(users).values({
            ...userData,
            role,
            createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
            updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date()
          })
        }
      }

      // Groups
      if (dbData.userGroups?.length) {
        for (const g of dbData.userGroups) {
          await db.insert(userGroups).values({
            ...g,
            createdAt: g.createdAt ? new Date(g.createdAt) : new Date(),
            updatedAt: g.updatedAt ? new Date(g.updatedAt) : new Date()
          })
        }
      }

      // Dependent Data
      if (dbData.userGroupMembers?.length) {
        for (const m of dbData.userGroupMembers) {
          await db.insert(userGroupMembers).values(m)
        }
      }
      if (dbData.accounts?.length) {
        for (const a of dbData.accounts) {
          await db.insert(accounts).values(a)
        }
      }
      if (dbData.sessions?.length) {
        for (const s of dbData.sessions) {
          await db.insert(sessions).values(s)
        }
      }
      // V1 notifications supprimées - plus d'import de notifications
      // if (dbData.notifications?.length) {
      //   for (const n of dbData.notifications) {
      //     await db.insert(notifications).values(n)
      //   }
      // }
      if (dbData.watchLater?.length) {
        for (const w of dbData.watchLater) {
          await db.insert(watchLater).values(w)
        }
      }
      if (dbData.mediaRequests?.length) {
        for (const r of dbData.mediaRequests) {
          await db.insert(mediaRequests).values(r)
        }
      }
      if (dbData.watchEvents?.length) {
        for (const e of dbData.watchEvents) {
          await db.insert(watchEvents).values(e)
        }
      }
      if (dbData.auditLogs?.length) {
        for (const a of dbData.auditLogs) {
          await db.insert(auditLogs).values(a)
        }
      }
      
    } else if (backup.settings && Array.isArray(backup.settings)) {
      // Settings Only Restore
      for (const setting of backup.settings) {
        const existing = await db.query.settings.findFirst({
          where: eq(settings.key, setting.key)
        })
        if (existing) {
          await db.update(settings)
            .set({
              value: setting.value,
              category: setting.category || setting.group || 'general',
              updatedAt: new Date()
            })
            .where(eq(settings.key, setting.key))
        } else {
          await db.insert(settings).values({
            key: setting.key,
            value: setting.value,
            category: setting.category || setting.group || 'general',
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      }
    } else {
      return NextResponse.json({ error: 'Format de fichier non reconnu' }, { status: 400 })
    }

    revalidatePath('/')
    revalidatePath('/dashboard')
    revalidatePath('/api/settings') 
    revalidatePath('/setup')
    revalidatePath('/login')

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Restore error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
