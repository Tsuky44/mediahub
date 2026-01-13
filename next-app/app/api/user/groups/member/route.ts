import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'admin') {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const { userGroupId, instanceId, userId, username } = await req.json()

        if (!userGroupId || !instanceId || !userId) {
            return new NextResponse('Missing fields', { status: 400 })
        }

        // Check if already in a group?
        // A user (instanceId + userId) should ideally only be in one group.
        // The unique constraint in schema handles this: @@unique([instanceId, userId])

        const member = await (prisma as any).userGroupMember.create({
            data: {
                userGroupId,
                instanceId,
                userId: String(userId),
                username
            }
        })

        return NextResponse.json(member)
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
    if (!session || (session.user as any).role !== 'admin') {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const { memberId } = await req.json()

        await (prisma as any).userGroupMember.delete({
            where: {
                id: memberId
            }
        })

        return new NextResponse('Deleted', { status: 200 })
    } catch (error) {
        console.error('[UserGroups] Error removing member:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
