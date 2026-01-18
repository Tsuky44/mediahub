import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { PERMISSIONS } from '@/lib/permissions'
import { logAction } from '@/lib/audit'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userPermissions = (session.user as any).permissions || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canManage = (session.user as any).role === 'admin' || userPermissions.includes(PERMISSIONS.SETTINGS_MANAGE)

    if (!canManage) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const { userGroupId, instanceId, userId, username } = await req.json()

        if (!userGroupId || !instanceId || !userId) {
            return new NextResponse('Missing fields', { status: 400 })
        }

        // Check if already in a group?
        // A user (instanceId + userId) should ideally only be in one group.
        // The unique constraint in schema handles this: @@unique([instanceId, userId])

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const member = await (prisma as any).userGroupMember.create({
            data: {
                userGroupId,
                instanceId,
                userId: String(userId),
                username
            }
        })

        await logAction(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parseInt((session.user as any).id),
            'ADD_MEMBER',
            'UserGroup',
            userGroupId,
            { memberId: member.id, userId, username }
        )

        return NextResponse.json(member)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.code === 'P2002') {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userPermissions = (session.user as any).permissions || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canManage = (session.user as any).role === 'admin' || userPermissions.includes(PERMISSIONS.SETTINGS_MANAGE)

    if (!canManage) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const { memberId } = await req.json()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).userGroupMember.delete({
            where: {
                id: memberId
            }
        })

        await logAction(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parseInt((session.user as any).id),
            'REMOVE_MEMBER',
            'UserGroupMember',
            memberId,
            null
        )

        return new NextResponse('Deleted', { status: 200 })
    } catch (error) {
        console.error('[UserGroups] Error removing member:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
