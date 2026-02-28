import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptData } from '@/lib/crypto'

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
      users,
      settings,
      notifications,
      watchLater,
      accounts,
      sessions,
      mediaRequests,
      watchEvents,
      auditLogs,
      dockerGroups,
      dockerGroupMembers,
      userGroups,
      userGroupMembers,
      mediaAvailability,
      fileShares,
      embyActivityLogs
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.setting.findMany(),
      prisma.notification.findMany(),
      prisma.watchLater.findMany(),
      prisma.account.findMany(),
      prisma.session.findMany(),
      prisma.mediaRequest.findMany(),
      prisma.watchEvent.findMany(),
      prisma.auditLog.findMany(),
      prisma.dockerGroup.findMany(),
      prisma.dockerGroupMember.findMany(),
      prisma.userGroup.findMany(),
      prisma.userGroupMember.findMany(),
      prisma.mediaAvailabilityIndex.findMany(),
      prisma.fileShare.findMany(),
      prisma.embyActivityLog.findMany(),
    ])

    const dbDump = {
      version: '1.0',
      type: 'full_database',
      exportedAt: new Date().toISOString(),
      data: {
        users,
        settings,
        notifications,
        watchLater,
        accounts,
        sessions,
        mediaRequests,
        watchEvents,
        auditLogs,
        dockerGroups,
        dockerGroupMembers,
        userGroups,
        userGroupMembers,
        mediaAvailability,
        fileShares,
        embyActivityLogs
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
