import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users, settings, watchLater, accounts, sessions, mediaRequests, watchEvents, auditLogs, userGroups, userGroupMembers } from '@/lib/db/schema'
import { encryptData } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password is required for encryption' }, { status: 400 })
    }

    // Fetch all data
    // Note: For explicit relations (Group<->Member), we can fetch the join table directly.
    const [
      usersData,
      settingsData,
      watchLaterData,
      accountsData,
      sessionsData,
      mediaRequestsData,
      watchEventsData,
      auditLogsData,
      userGroupsData,
      userGroupMembersData
    ] = await Promise.all([
      db.query.users.findMany(),
      db.query.settings.findMany({
        columns: {
          id: true,
          key: true,
          value: true,
          category: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      // db.query.notifications.findMany(), // V1 notifications supprimées - table notifications n'existe plus
      db.query.watchLater.findMany(),
      db.query.accounts.findMany(),
      db.query.sessions.findMany(),
      db.query.mediaRequests.findMany(),
      db.query.watchEvents.findMany(),
      db.query.auditLogs.findMany(),
      db.query.userGroups.findMany(),
      db.query.userGroupMembers.findMany(),
    ])

    const dbDump = {
      version: '1.0',
      type: 'full_database',
      exportedAt: new Date().toISOString(),
      data: {
        users: usersData,
        settings: settingsData,
        // notifications: notificationsData, // V1 notifications supprimées
        watchLater: watchLaterData,
        accounts: accountsData,
        sessions: sessionsData,
        mediaRequests: mediaRequestsData,
        watchEvents: watchEventsData,
        auditLogs: auditLogsData,
        userGroups: userGroupsData,
        userGroupMembers: userGroupMembersData
      }
    }

    const jsonString = JSON.stringify(dbDump)
    
    // Encrypt
    const encryptedData = await encryptData(jsonString, password)

    // Return as a downloadable file content
    return new NextResponse(encryptedData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="mediahub-db-backup-${new Date().toISOString().split('T')[0]}.enc"`
      }
    })

  } catch (error: any) {
    console.error('Database Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
