import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'
import { logAction } from '@/lib/audit'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

  // Check permission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session.user as any).role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userPermissions = (session.user as any).permissions || []
  const hasAccess = userRole === 'admin' || userPermissions.includes(PERMISSIONS.ROLES_MANAGE)

  if (!hasAccess) return new NextResponse('Forbidden', { status: 403 })

  try {
    const { displayName, description, permissions, priority } = await req.json()
    const { id } = await params

    // Check if system role
    const currentRole = await prisma.role.findUnique({ where: { id } })
    if (!currentRole) return new NextResponse('Role not found', { status: 404 })

    const role = await prisma.role.update({
      where: { id },
      data: {
        displayName,
        description,
        priority,
        permissions: {
          set: permissions?.map((p: string) => ({ name: p })) || []
        }
      },
      include: {
        permissions: true
      }
    })

    await logAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parseInt((session.user as any).id),
      'UPDATE',
      'Role',
      role.id,
      { displayName, permissions }
    )

    return NextResponse.json(role)
  } catch (error) {
    console.error('Error updating role:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

  // Check permission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session.user as any).role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userPermissions = (session.user as any).permissions || []
  const hasAccess = userRole === 'admin' || userPermissions.includes(PERMISSIONS.ROLES_MANAGE)

  if (!hasAccess) return new NextResponse('Forbidden', { status: 403 })

  try {
    const { id } = await params

    // Check if system role
    const currentRole = await prisma.role.findUnique({ where: { id } })
    if (!currentRole) return new NextResponse('Role not found', { status: 404 })
    
    if (currentRole.isSystem) {
        return new NextResponse('Cannot delete system role', { status: 400 })
    }

    // Check if role is assigned to users
    const usageCount = await prisma.user.count({ where: { roleId: id } })
    if (usageCount > 0) {
        return new NextResponse(`Role is assigned to ${usageCount} users`, { status: 400 })
    }

    await prisma.role.delete({ where: { id } })

    await logAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parseInt((session.user as any).id),
      'DELETE',
      'Role',
      id,
      { name: currentRole.name }
    )

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting role:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
