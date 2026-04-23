'use server'

import { prisma } from '@/lib/prisma'
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
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' }
    })
    return users
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
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

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
    const reqs = await prisma.mediaRequest.findMany({ include: { user: true } })
    let imported = 0

    for (const req of reqs) {
      // Check if audit log already exists
      const exists = await prisma.auditLog.findFirst({
        where: {
          action: 'MEDIA_REQUEST',
          entityId: req.id.toString(),
        }
      })
      
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

        await prisma.auditLog.create({
          data: {
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
          }
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
