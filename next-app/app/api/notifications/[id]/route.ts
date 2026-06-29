import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { notifications } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

interface Params {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user || !(user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const notificationId = parseInt(id)
    const userId = parseInt((user as any).id)

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[NotificationsAPI] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
