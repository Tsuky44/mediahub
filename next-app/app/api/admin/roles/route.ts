import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRealUser } from '@/lib/auth'

export async function GET() {
  const user = await getRealUser()
  
  if (!user || (user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roles = await (prisma as any).role.findMany({
    include: {
      _count: {
        select: { users: true }
      },
      permissions: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  return NextResponse.json(roles)
}

export async function POST(request: Request) {
  const user = await getRealUser()
  
  if (!user || (user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, description, permissions } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const role = await (prisma as any).role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions?.map((p: any) => ({
            action: p.action,
            subject: p.subject,
            conditions: p.conditions ? JSON.stringify(p.conditions) : null
          })) || []
        }
      },
      include: {
        permissions: true
      }
    })

    return NextResponse.json(role)
  } catch (error) {
    console.error('Failed to create role:', error)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}
