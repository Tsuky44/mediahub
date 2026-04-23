import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decryptData } from '@/lib/crypto'
import { isAppConfigured } from '@/lib/setup'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    // 1. Check if app is already configured
    const configured = await isAppConfigured()
    if (configured) {
      return NextResponse.json(
        { error: 'L\'application est déjà configurée. La restauration n\'est possible que lors de l\'installation initiale.' },
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
      return NextResponse.json({ error: 'Déchiffrement échoué. Mot de passe invalide ou fichier corrompu.' }, { status: 400 })
    }

    const backup = JSON.parse(decryptedJson)

    // 3. Detect format and restore
    if (backup.type === 'full_database' && backup.data) {
      // Full Database Restore
      const dbData = backup.data
      await prisma.$transaction(async (tx) => {
        // DELETE ALL EXISTING DATA (Order: Child -> Parent)
        // Explicit deletion is safer than relying on cascade
        await tx.userGroupMember.deleteMany()
        await tx.mediaRequest.deleteMany()
        await tx.notification.deleteMany()
        await tx.watchLater.deleteMany()
        await tx.account.deleteMany()
        await tx.session.deleteMany()
        await tx.auditLog.deleteMany()
        await tx.watchEvent.deleteMany()
        
        // Delete Users
        await tx.user.deleteMany()

        // Delete Groups
        await tx.userGroup.deleteMany()

        // Delete Independent tables
        await tx.setting.deleteMany()

        // RESTORE DATA (Order: Parent -> Child)
        
        // Independent
        if (dbData.settings?.length) {
          const settingsToRestore = dbData.settings.map((s: any) => ({
            key: s.key,
            value: s.value,
            category: s.category || s.group || 'general',
            createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined
          }))
          await tx.setting.createMany({ data: settingsToRestore })
        }

        // Users
        if (dbData.users?.length) {
          const usersToCreate = dbData.users.map((u: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { roleId, permissions, roleVersion, ...userData } = u
            let role = userData.role
            if (role !== 'admin' && role !== 'user') {
              role = 'user'
            }
            return { ...userData, role }
          })
          await tx.user.createMany({ data: usersToCreate })
        }

        // Groups
        if (dbData.userGroups?.length) await tx.userGroup.createMany({ data: dbData.userGroups })

        // Dependent Data
        if (dbData.userGroupMembers?.length) await tx.userGroupMember.createMany({ data: dbData.userGroupMembers })
        
        if (dbData.accounts?.length) await tx.account.createMany({ data: dbData.accounts })
        if (dbData.sessions?.length) await tx.session.createMany({ data: dbData.sessions })
        if (dbData.notifications?.length) await tx.notification.createMany({ data: dbData.notifications })
        if (dbData.watchLater?.length) await tx.watchLater.createMany({ data: dbData.watchLater })
        if (dbData.mediaRequests?.length) await tx.mediaRequest.createMany({ data: dbData.mediaRequests })
        if (dbData.watchEvents?.length) await tx.watchEvent.createMany({ data: dbData.watchEvents })
        if (dbData.auditLogs?.length) await tx.auditLog.createMany({ data: dbData.auditLogs })
      })
      
    } else if (backup.settings && Array.isArray(backup.settings)) {
      // Settings Only Restore
      const operations = backup.settings.map((setting: any) => {
        return prisma.setting.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            category: setting.category || setting.group || 'general',
          },
          create: {
            key: setting.key,
            value: setting.value,
            category: setting.category || setting.group || 'general',
          }
        })
      })
      await prisma.$transaction(operations)
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
