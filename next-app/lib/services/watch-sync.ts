import { db } from '@/lib/db/drizzle'
import { users, watchEvents } from '@/lib/db/schema'
import { eq, and, gte, desc } from 'drizzle-orm'
import { EmbyService } from './emby'
import { getSetting } from '@/lib/settings'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); }

interface EmbySession {
  UserId: string
  UserName?: string
  NowPlayingItem: {
    Id: string | number
    Name?: string
    Type?: string
    SeriesName?: string
  }
  PlayState: { IsPaused: boolean; PositionTicks?: number }
}

/**
 * Ce service permet de synchroniser les sessions de lecture actives
 * sans dépendre des webhooks d'Emby.
 * Il peut être appelé périodiquement (ex: toutes les minutes).
 */
export async function syncActiveSessions() {
    log('[Sync] Starting active sessions background sync...')
    
    try {
        const embyUrl = await getSetting('emby_url')
        const embyApiKey = await getSetting('emby_api_key')

        if (!embyUrl || !embyApiKey) {
            error('[Sync] Emby not configured (url or api_key missing).')
            return { success: false, error: 'Emby not configured' }
        }

        const embyService = new EmbyService(embyUrl, embyApiKey)
        
        let sessions: EmbySession[] = []
        try {
            sessions = (await embyService.getSessions()) as EmbySession[]
        } catch (e) {
            error('[Sync] Failed to fetch sessions:', e)
            return { success: false, error: e }
        }

        const livePlaying = sessions.filter((s: EmbySession) => s.NowPlayingItem && s.PlayState)

        if (livePlaying.length === 0) {
            log(`[Sync] No active sessions found.`)
            return { success: true, processed: 0 }
        }

        log(`[Sync] Found ${livePlaying.length} active sessions.`)

        let totalProcessed = 0

        for (const session of livePlaying) {
            try {
                const embyUserId = session.UserId
                const item = session.NowPlayingItem
                const playbackInfo = session.PlayState
                const itemId = String(item.Id)
                
                // On n'enregistre que si on est en lecture (pas en pause)
                if (playbackInfo.IsPaused) continue

                const positionTicks = playbackInfo.PositionTicks || 0
                const durationMinutes = Math.round(positionTicks / 600000000)

                // On n'enregistre que si la durée est significative (> 1 min)
                if (durationMinutes < 1) continue

                // Trouver l'utilisateur local
                const user = await db.query.users.findFirst({
                    where: eq(users.embyUserId, embyUserId)
                })

                // Chercher un événement récent (dernières 12h) pour cet item/user
                const existingEvent = await db.query.watchEvents.findFirst({
                    where: and(
                        eq(watchEvents.embyUserId, embyUserId),
                        eq(watchEvents.itemId, itemId),
                        gte(watchEvents.playedAt, new Date(Date.now() - 1000 * 60 * 60 * 12))
                    ),
                    orderBy: [desc(watchEvents.playedAt)]
                })

                if (existingEvent) {
                    // Si l'événement existe, on met à jour la durée si elle a augmenté
                    if (durationMinutes > (existingEvent.durationMinutes || 0)) {
                        await db.update(watchEvents)
                            .set({
                                durationMinutes: durationMinutes,
                                playedAt: new Date()
                            })
                            .where(eq(watchEvents.id, existingEvent.id))
                        log(`[Sync] Updated ${item.Name} for ${session.UserName} (${durationMinutes} min)`)
                    }
                } else {
                    // Création d'un nouvel événement
                    await db.insert(watchEvents).values({
                        embyUserId,
                        userId: user?.id,
                        itemId,
                        itemType: item.Type,
                        itemName: item.Name,
                        seriesName: item.SeriesName,
                        durationMinutes,
                        playedAt: new Date(),
                        plays: 1
                    })
                    log(`[Sync] Recorded NEW playback for ${item.Name} (${durationMinutes} min)`)
                }
                totalProcessed++
            } catch (err) {
                error(`[Sync] Error processing session for ${session.UserName}:`, err)
            }
        }
        
        return { success: true, processed: totalProcessed }
    } catch (e) {
        error('[Sync] Critical error during session sync:', e)
        return { success: false, error: e }
    }
}
