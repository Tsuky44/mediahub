import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'admin') {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const { id } = await params
        console.log(`[UserGroups] Attempting to delete group ${id}`)

        // Use a transaction to ensure both operations succeed or fail together
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

        return new NextResponse('Deleted', { status: 200 })
    } catch (error: any) {
        console.error('[UserGroups] Error deleting group:', error)
        return new NextResponse(JSON.stringify({ 
            error: 'Internal Server Error', 
            details: error.message 
        }), { status: 500 })
    }
}
