import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { supportTickets } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getRealUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

interface Params {
  params: Promise<{ id: string }>
}

// PATCH - Admin only: update ticket status
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getRealUser()
    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json() as { status?: string }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (body.status) updateData.status = body.status

    const result = await db.update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    logger.error('[SupportTickets] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Admin only: delete a ticket
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getRealUser()
    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    await db.delete(supportTickets).where(eq(supportTickets.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[SupportTickets] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
