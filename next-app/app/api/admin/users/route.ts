import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as any).role === 'admin'
  const hasAccess = isSuperAdmin 
  
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await (prisma as any).user.findMany({
    orderBy: { name: 'asc' },
    include: { roleRef: true }
  })
  return NextResponse.json(users)
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as any).role === 'admin'
  const hasAccess = isSuperAdmin

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, role, roleId } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const userToUpdate = await (prisma as any).user.findUnique({
    where: { 
      id: parseInt(id)
    }
  })

  if (!userToUpdate) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const dataToUpdate: any = {}
  if (role !== undefined) dataToUpdate.role = role
  if (roleId !== undefined) dataToUpdate.roleId = roleId

  const updatedUser = await (prisma as any).user.update({
    where: { id: parseInt(id) },
    data: dataToUpdate,
    include: { roleRef: true }
  })

  await logAction(
    parseInt((session.user as any).id),
    'UPDATE',
    'User',
    id.toString(),
    { role, roleId }
  )

  return NextResponse.json(updatedUser)
}
