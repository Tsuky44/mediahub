import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as any).role === 'admin'
  
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { userIds, action, role, roleId } = await request.json()

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 })
    }

    const currentUserId = parseInt((session.user as any).id)

    if (action === 'delete') {
      if (userIds.includes(currentUserId)) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
      }

      await prisma.$transaction(
        userIds.map((id: number) => 
          prisma.user.delete({
            where: { id }
          })
        )
      )

      await logAction(
        currentUserId,
        'BULK_DELETE',
        'User',
        userIds.join(','),
        { count: userIds.length }
      )

      return NextResponse.json({ success: true, count: userIds.length, action: 'delete' })
    }

    const dataToUpdate: any = {}
    if (role !== undefined) dataToUpdate.role = role
    if (roleId !== undefined) dataToUpdate.roleId = roleId

    // Update all users in transaction
    await prisma.$transaction(
      userIds.map((id: number) => 
        prisma.user.update({
          where: { id },
          data: dataToUpdate
        })
      )
    )

    // Log action
    await logAction(
      currentUserId,
      'BULK_UPDATE',
      'User',
      userIds.join(','),
      { role, roleId, count: userIds.length }
    )

    return NextResponse.json({ success: true, count: userIds.length, action: 'update' })
  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
