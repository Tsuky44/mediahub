import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { notificationEvents, notificationDeliveries } from '@/lib/db/schema'
import { eq, desc, sql, gte, and } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { purgeNotifDedupForTmdbId } from '@/lib/notifications-v2/bootstrap'
import { getOutboxWorkerInstance } from '@/lib/notifications-v2/outbox/outbox-worker'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch 100 recent events with their deliveries
    const events = await db.query.notificationEvents.findMany({
      orderBy: [desc(notificationEvents.createdAt), desc(notificationEvents.id)],
      limit: 100,
      with: {
        deliveries: true,
      },
    })

    // 2. Calculate statistics for the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Total events
    const totalEventsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationEvents)
      .where(gte(notificationEvents.createdAt, sevenDaysAgo))
    const totalEvents = totalEventsResult[0]?.count ?? 0

    // Delivery stats
    const statsResult = await db
      .select({
        status: notificationDeliveries.status,
        count: sql<number>`count(*)`,
      })
      .from(notificationDeliveries)
      .where(gte(notificationDeliveries.createdAt, sevenDaysAgo))
      .groupBy(notificationDeliveries.status)

    let totalSent = 0
    let totalFailed = 0
    let totalPending = 0

    for (const row of statsResult) {
      if (row.status === 'sent') totalSent = row.count
      else if (row.status === 'failed') totalFailed = row.count
      else if (row.status === 'pending' || row.status === 'processing') totalPending += row.count
    }

    const totalDeliveries = totalSent + totalFailed + totalPending
    const successRate = totalDeliveries > 0 ? Math.round((totalSent / totalDeliveries) * 100) : 100

    return NextResponse.json({
      events,
      stats: {
        totalEvents,
        totalSent,
        totalFailed,
        totalPending,
        successRate,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action } = body

    if (action === 'retry') {
      const { deliveryId } = body
      if (!deliveryId) {
        return NextResponse.json({ error: 'Missing deliveryId' }, { status: 400 })
      }

      // Re-mettre à pending avec nextRetryAt = now, attempts = 0
      await db
        .update(notificationDeliveries)
        .set({
          status: 'pending',
          nextRetryAt: new Date(),
          attempts: 0,
          lastError: null,
        })
        .where(eq(notificationDeliveries.id, Number(deliveryId)))

      // Trigger le worker immédiatement
      getOutboxWorkerInstance()?.triggerNow()

      return NextResponse.json({ success: true, message: 'Delivery scheduled for immediate retry' })
    }

    if (action === 'purge-dedup') {
      const { tmdbId } = body
      if (!tmdbId) {
        return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 })
      }

      await purgeNotifDedupForTmdbId(String(tmdbId))
      return NextResponse.json({ success: true, message: `Successfully purged dedup keys for TMDB ${tmdbId}` })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
