import { db } from '@/lib/db/drizzle'
import { userGroups, userGroupMembers, users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canManage = (session.user as any).role === 'admin'

    if (!canManage) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const groups = await db.query.userGroups.findMany({
            with: {
                members: {
                    with: {
                        user: true
                    }
                }
            },
            orderBy: sql`name ASC`
        })

        return NextResponse.json(groups)
    } catch (error) {
        console.error('[UserGroups] Error fetching groups:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canManage = (session.user as any).role === 'admin'

    if (!canManage) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const { name } = await req.json()

        if (!name) {
            return new NextResponse('Name is required', { status: 400 })
        }

        const [group] = await db.insert(userGroups).values({
            name,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning()

        await logAction(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parseInt((session.user as any).id),
            'CREATE',
            'UserGroup',
            group.id.toString(),
            { name }
        )

        return NextResponse.json(group)
    } catch (error) {
        console.error('[UserGroups] Error creating group:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
