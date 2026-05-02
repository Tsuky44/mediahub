import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRealUser } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRealUser()
  if (!user || (user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: true
    }
  })

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  return NextResponse.json(role)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRealUser()
  if (!user || (user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { name, description, permissions } = await request.json()

  try {
    // Check if role is system role and prevent name change
    const role = await prisma.role.findUnique({
      where: { id }
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.isSystem && name !== role.name) {
      return NextResponse.json({ error: 'Cannot rename system role' }, { status: 400 })
    }

    // Update basic info
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name,
        description
      }
    })

    // If permissions are provided, update them
    if (permissions) {
      // First delete all existing permissions
      await prisma.permission.deleteMany({
        where: { roleId: id }
      })

      // Then create new ones
      if (permissions.length > 0) {
        await prisma.permission.createMany({
          data: permissions.map((p: { action?: string; subject?: string; conditions?: unknown }) => ({
            roleId: id,
            action: p.action,
            subject: p.subject,
            conditions: p.conditions ? JSON.stringify(p.conditions) : null
          }))
        })
      }
    }

    try {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt(String((user as { id?: string | number }).id)), 'UPDATE', 'Role', id, { name, description })
    } catch (e) {
        console.error('Failed to log role update:', e)
    }

    return NextResponse.json(updatedRole)
  } catch (error) {
    console.error('Failed to update role:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRealUser()
  if (!user || (user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  
  try {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system role' }, { status: 400 })
    }

    if (role._count.users > 0) {
      return NextResponse.json({ error: 'Cannot delete role with assigned users' }, { status: 400 })
    }

    await prisma.role.delete({
      where: { id }
    })

    try {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt(String((user as { id?: string | number }).id)), 'DELETE', 'Role', id, { name: role.name })
    } catch (e) {
        console.error('Failed to log role deletion:', e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete role:', error)
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
}
