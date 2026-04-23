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

        // 1. Fetch all registered users
        const dbUsers = await prisma.user.findMany({
            select: {
                id: true,
                embyUserId: true,
                name: true
            }
        })
        log(`[UserGroups] Found ${dbUsers.length} users in DB`)

        // 2. Fetch existing group members to exclude them
        const existingMembers = await prisma.userGroupMember.findMany()
        const linkedSet = new Set(existingMembers.map((m: any) => m.userId))
        log(`[UserGroups] Total linked accounts already: ${linkedSet.size}`)

        // 3. Build Candidates List
        const candidates: any[] = []

        dbUsers.forEach((user: any) => {
            // Skip if already linked
            if (linkedSet.has(user.id)) return

            candidates.push({
                userId: user.id, // Int
                username: user.name || 'Unknown',
                source: 'db',
                embyUserId: user.embyUserId // Optional extra info
            })
        })

        return NextResponse.json(candidates.sort((a, b) => a.username.localeCompare(b.username)))

    } catch (e) {
        error('[UserGroups] Error fetching candidates:', e)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
