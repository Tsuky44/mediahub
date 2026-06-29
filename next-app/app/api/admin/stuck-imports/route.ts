/**
 * API routes pour gérer les imports bloqués (stuck imports)
 * 
 * GET /api/admin/stuck-imports - Liste les imports bloqués
 * POST /api/admin/stuck-imports - Nettoyer/supprimer des imports bloqués
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { getStuckImportDetector, type StuckItem } from '@/lib/notifications-v2/pollers/stuck-import-detector'
import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService } from '@/lib/services/sonarr'
import { logger } from '@/lib/logger'

interface StuckItemResponse extends StuckItem {
  stuckDuration: number // ms
  isConfirmed: boolean
}

// GET /api/admin/stuck-imports - Liste les imports bloqués
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ability = defineAbilityFor(user)
    if (ability.cannot('manage', 'all')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const detector = getStuckImportDetector()
    const allStuck = detector.getStuckItems()
    const confirmedStuck = detector.getConfirmedStuckItems()
    const confirmedIds = new Set(confirmedStuck.map(i => `${i.type}:${i.id}`))
    const now = Date.now()

    const items: StuckItemResponse[] = allStuck.map(item => ({
      ...item,
      stuckDuration: now - item.firstSeenStuck,
      isConfirmed: confirmedIds.has(`${item.type}:${item.id}`),
    }))

    // Trier par durée (les plus anciens d'abord)
    items.sort((a, b) => b.stuckDuration - a.stuckDuration)

    const stats = detector.getStats()

    return NextResponse.json({
      items,
      stats: {
        stuckCount: stats.stuckCount,
        confirmedStuckCount: stats.confirmedStuckCount,
        consecutiveErrors: stats.consecutiveErrors,
        isSlow: stats.isSlow,
        currentInterval: stats.currentInterval,
      },
    })
  } catch (e) {
    logger.error('[API][stuck-imports] GET failed:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/stuck-imports - Actions sur les imports bloqués
// Body: { action: 'remove', items: [{ id, type }] }
// ou { action: 'removeAllConfirmed' }
// ou { action: 'refresh' }
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ability = defineAbilityFor(user)
    if (ability.cannot('manage', 'all')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, items } = body

    if (action === 'refresh') {
      // Rafraîchir en forçant un nouveau fetch des queues
      const [radarr, sonarr] = await Promise.all([
        getRadarrService(),
        getSonarrService(),
      ])
      
      const [radarrQueue, sonarrQueue] = await Promise.all([
        radarr ? radarr.getQueue().catch(() => []) : Promise.resolve([]),
        sonarr ? sonarr.getQueue().catch(() => []) : Promise.resolve([]),
      ])

      const detector = getStuckImportDetector()
      detector.updateQueues(radarrQueue, sonarrQueue)

      return NextResponse.json({ success: true, message: 'Queues refreshed' })
    }

    if (action === 'remove' && Array.isArray(items)) {
      const results = await Promise.all(
        items.map(async ({ id, type }: { id: number; type: 'radarr' | 'sonarr' }) => {
          try {
            if (type === 'radarr') {
              const radarr = await getRadarrService()
              if (!radarr) {
                return { id, type, success: false, error: 'Radarr not configured' }
              }
              const result = await radarr.removeFromQueue(id, {
                removeFromClient: false, // Garder le fichier, juste retirer de la queue
                blocklist: false,
                skipRedownload: true,
              })
              
              if (result.success) {
                // Retirer du détecteur
                getStuckImportDetector().removeItem(id, 'radarr')
              }
              
              return { id, type, ...result }
            } else {
              const sonarr = await getSonarrService()
              if (!sonarr) {
                return { id, type, success: false, error: 'Sonarr not configured' }
              }
              const result = await sonarr.removeFromQueue(id, {
                removeFromClient: false,
                blocklist: false,
                skipRedownload: true,
              })
              
              if (result.success) {
                getStuckImportDetector().removeItem(id, 'sonarr')
              }
              
              return { id, type, ...result }
            }
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            return { id, type, success: false, error: errorMsg }
          }
        })
      )

      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount,
        },
      })
    }

    if (action === 'removeAllConfirmed') {
      const detector = getStuckImportDetector()
      const confirmed = detector.getConfirmedStuckItems()
      
      const radarr = await getRadarrService()
      const sonarr = await getSonarrService()
      
      const results = await Promise.all(
        confirmed.map(async (item) => {
          try {
            if (item.type === 'radarr' && radarr) {
              const result = await radarr.removeFromQueue(item.id, {
                removeFromClient: false,
                blocklist: false,
                skipRedownload: true,
              })
              if (result.success) {
                detector.removeItem(item.id, 'radarr')
              }
              return { id: item.id, type: item.type, ...result }
            } else if (item.type === 'sonarr' && sonarr) {
              const result = await sonarr.removeFromQueue(item.id, {
                removeFromClient: false,
                blocklist: false,
                skipRedownload: true,
              })
              if (result.success) {
                detector.removeItem(item.id, 'sonarr')
              }
              return { id: item.id, type: item.type, ...result }
            }
            return { id: item.id, type: item.type, success: false, error: 'Service not available' }
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            return { id: item.id, type: item.type, success: false, error: errorMsg }
          }
        })
      )

      const successCount = results.filter(r => r.success).length
      
      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: results.length - successCount,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (e) {
    logger.error('[API][stuck-imports] POST failed:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
