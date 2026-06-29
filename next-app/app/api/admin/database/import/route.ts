import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users, settings, watchLater, accounts, sessions, mediaRequests, watchEvents, auditLogs, userGroups, userGroupMembers } from '@/lib/db/schema'
import { decryptData } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

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

    // Execute import
    // Note: Due to foreign key constraints, deletion order matters (Child -> Parent)
    // And creation order matters (Parent -> Child)

    // 1. DELETE ALL EXISTING DATA (Order: Child -> Parent)
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

    // 2. RESTORE DATA (Order: Parent -> Child)
    
    // Independent
    if (dbData.settings?.length) {
      for (const s of dbData.settings) {
        await db.insert(settings).values(s)
      }
    }

    // Users
    if (dbData.users?.length) {
      for (const u of dbData.users) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { roleId, permissions, roleVersion, ...userData } = u
        
        // Ensure role is valid string
        let role = userData.role
        if (role !== 'admin' && role !== 'user') {
          role = 'user'
        }

        await db.insert(users).values({ ...userData, role })
      }
    }

    // Groups
    if (dbData.userGroups?.length) {
      for (const g of dbData.userGroups) {
        await db.insert(userGroups).values(g)
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

    revalidatePath('/', 'layout')

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Database Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
