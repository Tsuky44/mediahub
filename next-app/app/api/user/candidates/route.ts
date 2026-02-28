import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'admin') {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        log('[UserGroups] Fetching candidates')

        // 1. Fetch all users from Activity Logs
        // Using findMany instead of groupBy to avoid SQLite/Prisma groupBy issues causing 500
        const allLogs = await (prisma as any).embyActivityLog.findMany({
            where: {
                embyUserId: { not: '' }
            },
            select: {
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
            const key = log.embyUserId
            
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
        log(`[UserGroups] Found ${logUsers.length} unique users in activity logs`)

        // 2. Fetch all registered users
        const dbUsers = await (prisma as any).user.findMany({
            where: {
                embyUserId: { not: null }
            },
            select: {
                embyUserId: true,
                name: true
            }
        })
        log(`[UserGroups] Found ${dbUsers.length} unique users in DB`)

        // 4. Fetch existing group members to exclude them
        const existingMembers = await (prisma as any).userGroupMember.findMany()
        const linkedSet = new Set(existingMembers.map((m: any) => m.userId))
        log(`[UserGroups] Total linked accounts already: ${linkedSet.size}`)

        // 5. Merge and Format
        const candidates = new Map<string, any>()

        // Add from Logs
        logUsers.forEach((log: any) => {
            if (!log.embyUserId) return
            const key = log.embyUserId
            if (linkedSet.has(key)) return 

            if (candidates.has(key)) return

            candidates.set(key, {
                userId: log.embyUserId,
                username: log.userName || 'Unknown',
                source: 'logs'
            })
        })

        // Add from DB Users
        dbUsers.forEach((user: any) => {
            if (!user.embyUserId) return
            const key = user.embyUserId
            if (linkedSet.has(key)) return 
            
            if (candidates.has(key)) {
                const existing = candidates.get(key)
                existing.source = 'both'
                if (user.name) existing.username = user.name
            } else {
                candidates.set(key, {
                    userId: user.embyUserId,
                    username: user.name || 'Unknown',
                    source: 'db'
                })
            }
        })

        return NextResponse.json(Array.from(candidates.values()).sort((a, b) => a.username.localeCompare(b.username)))

    } catch (e) {
        error('[UserGroups] Error fetching candidates:', e)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
