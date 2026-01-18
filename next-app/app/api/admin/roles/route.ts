import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'
import { logAction } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

  // Check permission
  const userRole = (session.user as any).role
  const userPermissions = (session.user as any).permissions || []
  const hasAccess = userRole === 'admin' || userPermissions.includes(PERMISSIONS.ROLES_MANAGE)

  if (!hasAccess) return new NextResponse('Forbidden', { status: 403 })

  const roles = await prisma.role.findMany({
    include: {
      permissions: true,
      _count: {
        select: { users: true }
      }
    },
    orderBy: {
      priority: 'desc'
    }
  })

  return NextResponse.json(roles)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

  // Check permission
  const userRole = (session.user as any).role
  const userPermissions = (session.user as any).permissions || []
  const hasAccess = userRole === 'admin' || userPermissions.includes(PERMISSIONS.ROLES_MANAGE)

  if (!hasAccess) return new NextResponse('Forbidden', { status: 403 })

  try {
    const { name, displayName, description, permissions, priority } = await req.json()

    // Validate
    if (!name) return new NextResponse('Name is required', { status: 400 })

    // Check uniqueness
    const existing = await prisma.role.findUnique({ where: { name } })
    if (existing) return new NextResponse('Role already exists', { status: 400 })

    // Create role
    const role = await prisma.role.create({
      data: {
        name,
        displayName: displayName || name,
        description,
        priority: priority || 0,
        permissions: {
          connect: permissions?.map((p: string) => ({ name: p })) || []
        }
      },
      include: {
        permissions: true
      }
    })

    await logAction(
      parseInt((session.user as any).id),
      'CREATE',
      'Role',
      role.id,
      { name, permissions }
    )

    return NextResponse.json(role)
  } catch (error) {
    console.error('Error creating role:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
