import { db } from '@/lib/db/drizzle'
import { userGroupMembers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const canManage = (session.user as { role?: string }).role === 'admin'

    if (!canManage) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const { userGroupId, userId, username } = await req.json()

        if (!userGroupId || !userId) {
            return new NextResponse('Missing fields', { status: 400 })
        }

        // Check if already in a group?
        // A user (userId) should ideally only be in one group.
        // The unique constraint in schema handles this

        const [member] = await db.insert(userGroupMembers).values({
            userGroupId,
            userId: parseInt(String(userId))
        }).returning()

        await logAction(
            parseInt(String((session.user as { id?: string | number }).id)),
            'ADD_MEMBER',
            'UserGroup',
            userGroupId.toString(),
            { memberId: member.id, userId, username }
        )

        return NextResponse.json(member)
    } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
            return new NextResponse('User already in a group', { status: 409 })
        }
        console.error('[UserGroups] Error adding member:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const canManage = (session.user as { role?: string }).role === 'admin'

    if (!canManage) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const { memberId } = await req.json()

        await db.delete(userGroupMembers).where(eq(userGroupMembers.id, memberId))

        await logAction(
            parseInt(String((session.user as { id?: string | number }).id)),
            'REMOVE_MEMBER',
            'UserGroupMember',
            memberId.toString(),
            null
        )

        return new NextResponse('Deleted', { status: 200 })
    } catch (error) {
        console.error('[UserGroups] Error removing member:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
