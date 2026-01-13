import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'admin') {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const adminInstanceId = parseInt((session.user as any).instanceId)
        console.log('[UserGroups] Admin Instance ID from session:', adminInstanceId, 'Raw:', (session.user as any).instanceId)
        
        if (isNaN(adminInstanceId)) {
            console.error('[UserGroups] Invalid instanceId in session:', (session.user as any).instanceId)
            return new NextResponse('Invalid session', { status: 400 })
        }

        // 3. Fetch current instance details early to check if it exists
        const currentInstance = await (prisma as any).instance.findUnique({
            where: { id: adminInstanceId },
            select: {
                id: true,
                name: true,
                type: true
            }
        })
        
        if (!currentInstance) {
            console.error(`[UserGroups] Instance ${adminInstanceId} not found in database`)
            return new NextResponse('Instance not found', { status: 404 })
        }
        console.log(`[UserGroups] Fetching candidates for instance: ${currentInstance.name} (${currentInstance.type})`)

        // 1. Fetch all users from Activity Logs
        // Using findMany instead of groupBy to avoid SQLite/Prisma groupBy issues causing 500
        const allLogs = await (prisma as any).embyActivityLog.findMany({
            where: {
                instanceId: adminInstanceId,
                embyUserId: { not: '' }
            },
            select: {
                instanceId: true,
                embyUserId: true,
                userName: true,
                source: true
            }
        })

        // Manual deduplication with source prioritization
        // We prioritize plex/jellyfin over emby to show the correct source type if multiple exist
        const logUsersMap = new Map<string, any>()
        allLogs.forEach((log: any) => {
            if (!log.embyUserId) return
            const key = `${log.instanceId}:${log.embyUserId}`
            
            const existing = logUsersMap.get(key)
            if (!existing) {
                logUsersMap.set(key, log)
            } else {
                // If existing is emby but new one is plex/jellyfin, update it
                const sourcePriority: Record<string, number> = { 'plex': 3, 'jellyfin': 2, 'emby': 1 }
                const currentPriority = sourcePriority[existing.source?.toLowerCase()] || 0
                const newPriority = sourcePriority[log.source?.toLowerCase()] || 0
                
                if (newPriority > currentPriority) {
                    logUsersMap.set(key, log)
                }
            }
        })
        const logUsers = Array.from(logUsersMap.values())
        console.log(`[UserGroups] Found ${logUsers.length} unique users in activity logs`)

        // 2. Fetch all registered users for this instance
        const dbUsers = await (prisma as any).user.findMany({
            where: {
                instanceId: adminInstanceId,
                embyUserId: { not: null }
            },
            select: {
                instanceId: true,
                embyUserId: true,
                name: true
            }
        })
        console.log(`[UserGroups] Found ${dbUsers.length} unique users in DB`)

        // 4. Fetch existing group members to exclude them
        const existingMembers = await (prisma as any).userGroupMember.findMany()
        const linkedSet = new Set(existingMembers.map((m: any) => `${m.instanceId}:${m.userId}`))
        console.log(`[UserGroups] Total linked accounts already: ${linkedSet.size}`)

        // 5. Merge and Format
        const candidates = new Map<string, any>()

        // Add from Logs
        logUsers.forEach((log: any) => {
            if (!log.embyUserId) return
            const key = `${log.instanceId}:${log.embyUserId}`
            if (linkedSet.has(key)) return 

            const source = log.source || currentInstance.type

            if (candidates.has(key)) return

            candidates.set(key, {
                instanceId: log.instanceId,
                userId: log.embyUserId,
                username: log.userName || 'Unknown',
                instanceName: currentInstance.name,
                instanceType: source,
                source: 'logs'
            })
        })

        // Add from DB Users
        dbUsers.forEach((user: any) => {
            if (!user.embyUserId) return
            const key = `${user.instanceId}:${user.embyUserId}`
            if (linkedSet.has(key)) return 

            if (candidates.has(key)) {
                const existing = candidates.get(key)
                existing.source = 'both'
                if (user.name) existing.username = user.name
            } else {
                candidates.set(key, {
                    instanceId: user.instanceId,
                    userId: user.embyUserId,
                    username: user.name || 'Unknown',
                    instanceName: currentInstance.name,
                    instanceType: currentInstance.type,
                    source: 'db'
                })
            }
        })

        return NextResponse.json(Array.from(candidates.values()).sort((a, b) => a.username.localeCompare(b.username)))

    } catch (error) {
        console.error('[UserGroups] Error fetching candidates:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
