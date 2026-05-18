'use server'

import { db } from '@/lib/db/drizzle'
import { users, auditLogs, mediaRequests } from '@/lib/db/schema'
import { eq, asc, desc, and, sql } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'

export async function getLogUsers() {
  const user = await getCurrentUser()
  if (!user) return []

  const ability = defineAbilityFor(user)
  if (!ability.can('manage', 'all') && user.role !== 'admin') {
    return []
  }

  try {
    const usersList = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(asc(users.name))
    return usersList
  } catch (error) {
    console.error('Failed to fetch users for logs:', error)
    return []
  }
}

export async function getActivityLogs(page = 1, limit = 50, filters?: any) {
  const user = await getCurrentUser()
  if (!user) return { logs: [], total: 0 }

  const ability = defineAbilityFor(user)
  // Seuls les admins ou ceux qui peuvent gérer 'all' peuvent voir les logs
  if (!ability.can('manage', 'all') && user.role !== 'admin') {
    return { logs: [], total: 0 }
  }

  const where: any = {}
  
  if (filters?.userId) {
    where.userId = parseInt(filters.userId)
  }
  
  if (filters?.action) {
    where.action = filters.action
  }

  try {
    // Build where conditions
    const conditions = []
    if (filters?.userId) conditions.push(eq(auditLogs.userId, parseInt(filters.userId)))
    if (filters?.action) conditions.push(eq(auditLogs.action, filters.action))
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    
    // TODO: Implement pagination with Drizzle - simplified version for now
    const logsQuery = db.select().from(auditLogs)
    if (whereClause) logsQuery.where(whereClause)
    
    const [logs, totalCount] = await Promise.all([
      logsQuery.orderBy(desc(auditLogs.createdAt)),
      db.select({ count: sql`count(*)` }).from(auditLogs).then(r => r[0]?.count || 0)
    ])
    const total = Number(totalCount)

    return { logs, total }
  } catch (error) {
    console.error('Failed to fetch activity logs:', error)
    return { logs: [], total: 0 }
  }
}

export async function importPastRequestsIntoLogs() {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const ability = defineAbilityFor(user)
  if (!ability.can('manage', 'all') && user.role !== 'admin') {
    return { success: false, error: 'Forbidden' }
  }

  try {
    const reqs = await db.select().from(mediaRequests)
    let imported = 0

    for (const req of reqs) {
      // Check if audit log already exists
      const [exists] = await db.select().from(auditLogs).where(
        and(eq(auditLogs.action, 'MEDIA_REQUEST'), eq(auditLogs.entityId, req.id.toString()))
      ).limit(1)
      
      if (!exists) {
        let season = undefined
        try {
          if (req.metadata) {
            const meta = JSON.parse(req.metadata)
            if (meta.seasons && meta.seasons.length > 0) {
              season = meta.seasons[0]
            }
          }
        } catch (e) {}

        await db.insert(auditLogs).values({
          userId: req.userId,
          action: 'MEDIA_REQUEST',
          entity: 'MediaRequest',
          entityId: req.id.toString(),
          ipAddress: 'historique',
          userAgent: 'system',
          details: JSON.stringify({
            tmdbId: req.tmdbId,
            mediaType: req.mediaType,
            title: req.title,
            ...(season !== undefined ? { season } : {})
          }),
          createdAt: req.requestedAt || req.createdAt
        })
        imported++
      }
    }
    return { success: true, imported }
  } catch (error) {
    console.error('Failed to import past requests into logs:', error)
    return { success: false, error: 'Internal error' }
  }
}
