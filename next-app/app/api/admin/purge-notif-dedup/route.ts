/**
 * Route admin pour purger les dedup_keys bloquantes.
 * Supprime les vieilles clÃ©s sans suffixe de date et les seeds.
 * GET â†’ stats, POST â†’ purge
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { notificationEvents } from '@/lib/db/schema'
import { sql, eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Compter les clÃ©s sans suffixe de date (bloquantes)
  const allEvents = await db.query.notificationEvents.findMany({
    where: sql`${notificationEvents.event} IN ('MEDIA_GRABBED','MEDIA_DOWNLOADING','MEDIA_DOWNLOAD_COMPLETE','MEDIA_IMPORTING','MEDIA_AVAILABLE') AND ${notificationEvents.status} = 'dispatched'`,
    columns: { id: true, dedupKey: true, event: true, createdAt: true },
    limit: 500,
  })

  const oldKeys = allEvents.filter((e) => {
    if (!e.dedupKey) return false
    return !/\d{4}-\d{2}-\d{2}$/.test(e.dedupKey)
  })

  const seedKeys = allEvents.filter((e) => e.dedupKey?.includes(':seed:') || false)

  return NextResponse.json({
    total: allEvents.length,
    blockedOldKeys: oldKeys.length,
    seedKeys: seedKeys.length,
    sample: oldKeys.slice(0, 10).map((e) => ({ id: e.id, key: e.dedupKey, event: e.event })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, number> = {}

  // 1) Purge les seeds
  try {
    const r = await db
      .delete(notificationEvents)
      .where(sql`json_extract(${notificationEvents.payload}, '$.requester.name') = 'seed'`)
    results.seedsPurged = (r as any)?.changes ?? 0
  } catch {
    results.seedsPurged = -1
  }

  // 2) Purge les clÃ©s sans suffixe de date pour les events rÃ©pÃ©tables
  try {
    const r = await db
      .delete(notificationEvents)
      .where(sql`
        ${notificationEvents.event} IN ('MEDIA_GRABBED','MEDIA_DOWNLOADING','MEDIA_DOWNLOAD_COMPLETE','MEDIA_IMPORTING','MEDIA_AVAILABLE')
        AND ${notificationEvents.dedupKey} NOT LIKE '%-____-__-__'
        AND ${notificationEvents.status} = 'dispatched'
      `)
    results.oldKeysPurged = (r as any)?.changes ?? 0
  } catch {
    results.oldKeysPurged = -1
  }

  return NextResponse.json({ success: true, results })
}
