import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decryptData } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, password } = await request.json()

    if (!data || !password) {
      return NextResponse.json({ error: 'Data and password are required' }, { status: 400 })
    }

    // Decrypt
    let decryptedJson: string
    try {
      decryptedJson = await decryptData(data, password)
    } catch (e) {
      return NextResponse.json({ error: 'Decryption failed. Invalid password or corrupted file.' }, { status: 400 })
    }

    const backup = JSON.parse(decryptedJson)

    if (backup.type !== 'full_database' || !backup.data) {
      return NextResponse.json({ error: 'Invalid database backup file format' }, { status: 400 })
    }

    const dbData = backup.data

    // Execute import in a transaction
    // Note: Due to foreign key constraints, deletion order matters (Child -> Parent)
    // And creation order matters (Parent -> Child)

    await prisma.$transaction(async (tx) => {
      // 1. DELETE ALL EXISTING DATA (Order: Child -> Parent)
      
      // Delete most dependent first
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

      // 2. RESTORE DATA (Order: Parent -> Child)
      
      // Independent
      if (dbData.settings?.length) await tx.setting.createMany({ data: dbData.settings })

      // Users
      if (dbData.users?.length) {
        // We restore users but without role relations/permissions
        const usersToCreate = dbData.users.map((u: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { roleId, permissions, roleVersion, ...userData } = u
          
          // Ensure role is valid string
          let role = userData.role
          if (role !== 'admin' && role !== 'user') {
            role = 'user'
          }

          return {
            ...userData,
            role
          }
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

    revalidatePath('/', 'layout')

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Database Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
