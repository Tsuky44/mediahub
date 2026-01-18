import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { PERMISSIONS } from '@/lib/permissions'
import { logAction } from '@/lib/audit'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
        const { id } = await params
        console.log(`[UserGroups] Attempting to delete group ${id}`)

        // Use a transaction to ensure both operations succeed or fail together
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).$transaction(async (tx: any) => {
            // 1. Delete all members of the group
            const membersDeleted = await tx.userGroupMember.deleteMany({
                where: {
                    userGroupId: id
                }
            })
            console.log(`[UserGroups] Deleted ${membersDeleted.count} members for group ${id}`)

            // 2. Delete the group itself
            await tx.userGroup.delete({
                where: {
                    id
                }
            })
            console.log(`[UserGroups] Deleted group ${id}`)
        })

        await logAction(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parseInt((session.user as any).id),
            'DELETE',
            'UserGroup',
            (await params).id,
            null
        )

        return new NextResponse('Deleted', { status: 200 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('[UserGroups] Error deleting group:', error)
        return new NextResponse(JSON.stringify({ 
            error: 'Internal Server Error', 
            details: error.message 
        }), { status: 500 })
    }
}
