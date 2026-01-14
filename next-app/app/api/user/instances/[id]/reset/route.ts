import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'admin') {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const { id } = await params
        const instanceId = parseInt(id)

        if (isNaN(instanceId)) {
            return new NextResponse('Invalid instance ID', { status: 400 })
        }

        console.log(`[Instance Reset] Resetting instance ${instanceId}`)

        // Start a transaction to clear everything
        await (prisma as any).$transaction(async (tx: any) => {
            // 1. Delete all activity logs
            const logs = await tx.embyActivityLog.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${logs.count} activity logs`)
            
            // 2. Delete all watch events
            const events = await tx.watchEvent.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${events.count} watch events`)
            
            // 3. Delete all group members
            const groupMembers = await tx.userGroupMember.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${groupMembers.count} group members`)
            
            // 4. Delete all media requests
            const requests = await tx.mediaRequest.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${requests.count} media requests`)
            
            // 5. Delete all notifications
            const notifications = await tx.notification.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${notifications.count} notifications`)
            
            // 6. Delete all watch later items
            const watchLater = await tx.watchLater.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${watchLater.count} watch later items`)
            
            // 7. Delete all availability index items
            const availability = await tx.mediaAvailabilityIndex.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${availability.count} availability items`)
            
            // 8. Delete all file shares
            const shares = await tx.fileShare.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${shares.count} file shares`)
            
            // 9. Delete all live sessions
            const liveSessions = await tx.embyLiveSession.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${liveSessions.count} live sessions`)
            
            // 10. Delete all users of this instance
            // We delete all accounts and sessions via Cascade automatically
            const users = await tx.user.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${users.count} users`)

            // 11. Delete all settings for this instance
            // (Keeping the core Instance fields like embyUrl, embyApiKey, etc.)
            const settings = await tx.setting.deleteMany({ where: { instanceId } })
            console.log(`[Instance Reset] Deleted ${settings.count} settings`)
        })

        console.log(`[Instance Reset] Instance ${instanceId} reset successfully`)
        return new NextResponse('Reset successful', { status: 200 })
    } catch (error: any) {
        console.error('[Instance Reset] Error resetting instance:', error)
        return new NextResponse(JSON.stringify({ 
            error: 'Internal Server Error', 
            details: error.message 
        }), { status: 500 })
    }
}
