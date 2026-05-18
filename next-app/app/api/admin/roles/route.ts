﻿import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { roles, permissions, users } from '@/lib/db/schema'
import { eq, asc, sql } from 'drizzle-orm'
import { getRealUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getRealUser()
  
  if (!user || (user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rolesList = await db.select().from(roles).orderBy(asc(roles.name))
  // TODO: Fetch permissions and user counts separately if needed

  return NextResponse.json(rolesList)
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

    const [role] = await db.insert(roles).values({
      name,
      description
    }).returning()
    
    // Insert permissions separately
    if (permissions && permissions.length > 0 && role) {
      await db.insert(permissions).values(
        permissions.map((p: any) => ({
          roleId: role.id,
          action: p.action,
          subject: p.subject,
          conditions: p.conditions ? JSON.stringify(p.conditions) : null
        }))
      )
    }

    try {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt((user as any).id), 'CREATE', 'Role', role.id, { name, description })
    } catch (e) {
        console.error('Failed to log role creation:', e)
    }

    return NextResponse.json(role)
  } catch (error) {
    console.error('Failed to create role:', error)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}
