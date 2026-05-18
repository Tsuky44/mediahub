import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { roles, permissions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getRealUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRealUser()
  if (!user || user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  // TODO: Fetch permissions separately if needed

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
  if (!user || user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { name, description, permissions } = await request.json()

  try {
    // Check if role is system role and prevent name change
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1)

    if (role.isSystem && name !== role.name) {
      return NextResponse.json({ error: 'Cannot rename system role' }, { status: 400 })
    }

    // Update basic info
    const [updatedRole] = await db.update(roles).set({
      name,
      description
    }).where(eq(roles.id, id)).returning()

    // If permissions are provided, update them
    if (permissions) {
      // First delete all existing permissions
      await db.delete(permissions).where(eq(permissions.roleId, id))

      // Then create new ones
      if (permissions.length > 0) {
        await db.insert(permissions).values(
          permissions.map((p: { action: string; subject: string; conditions?: unknown }) => ({
            roleId: id,
            action: p.action,
            subject: p.subject,
            conditions: p.conditions ? JSON.stringify(p.conditions) : null
          }))
        )
      }
    }

    try {
        const { logAction } = await import('@/lib/audit')
        await logAction(user?.id ? parseInt(String(user.id)) : 0, 'UPDATE', 'Role', id, { name, description })
    } catch (e) {
        logger.error('Failed to log role update:', e)
    }

    return NextResponse.json(updatedRole)
  } catch (error) {
    logger.error('Failed to update role:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRealUser()
  if (!user || user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  
  try {
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
    // TODO: Check user count separately

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system role' }, { status: 400 })
    }

    // TODO: Check if role has assigned users
    
    await db.delete(roles).where(eq(roles.id, id))

    try {
        const { logAction } = await import('@/lib/audit')
        await logAction(user?.id ? parseInt(String(user.id)) : 0, 'DELETE', 'Role', id, { name: role.name })
    } catch (e) {
        logger.error('Failed to log role deletion:', e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete role:', error)
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
}
