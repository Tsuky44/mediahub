import { db } from '@/lib/db/drizzle'
import { userGroups, userGroupMembers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
        const { id } = await params
        log(`[UserGroups] Attempting to delete group ${id}`)

        // Delete all members of the group first
        const membersDeleted = await db.delete(userGroupMembers)
            .where(eq(userGroupMembers.userGroupId, id))
            .returning()
        log(`[UserGroups] Deleted ${membersDeleted.length} members for group ${id}`)

        // Delete the group itself
        await db.delete(userGroups).where(eq(userGroups.id, id))
        log(`[UserGroups] Deleted group ${id}`)

        await logAction(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parseInt((session.user as any).id),
            'DELETE',
            'UserGroup',
            id,
            null
        )

        return new NextResponse('Deleted', { status: 200 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        error('[UserGroups] Error deleting group:', error)
        return new NextResponse(JSON.stringify({ 
            error: 'Internal Server Error', 
            details: error.message 
        }), { status: 500 })
    }
}
