/**
 * QbitWatchPoller — surveille la progression des torrents spécifiques dans qBittorrent
 * pour dispatcher uniquement deux événements critiques :
 *   1. MEDIA_DOWNLOADING : Quand le torrent dépasse 1% de progression (une seule fois)
 *   2. MEDIA_DOWNLOAD_COMPLETE : Quand le torrent atteint 100% de progression (une seule fois)
 * 
 * Avantage : Zéro appel API vers Sonarr/Radarr, aucune surcharge, aucun crash de container.
 */

import { getQBittorrentService, type Torrent } from '@/lib/services/qbittorrent'
import { logger } from '@/lib/logger'
import { dispatch } from '../dispatcher'
import { NOTIFICATION_EVENTS } from '../types'
import type { MediaInfo, RequesterInfo } from '../types'

export interface WatchEntry {
  hash?: string
  releaseName?: string
  media: MediaInfo
  requester?: RequesterInfo
  hasNotifiedDownloading?: boolean
  hasNotifiedCompleted?: boolean
  createdAt: number
}

export class QbitWatchPoller {
  /** clé (hash ou releaseName) → WatchEntry */
  private watches = new Map<string, WatchEntry>()
  private timer: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(private readonly intervalMs = 15_000) {}

  start(): void {
    if (this.isRunning) return
    this.isRunning = true

    // Tick initial immédiat pour ne pas rater les téléchargements rapides
    this.tick().catch((err) =>
      logger.error('[NotifV2][QbitWatchPoller] Initial tick error:', err)
    )

    this.timer = setInterval(() => {
      this.tick().catch((err) =>
        logger.error('[NotifV2][QbitWatchPoller] Tick error:', err)
      )
    }, this.intervalMs)
    logger.info('[NotifV2][QbitWatchPoller] Started (polling qBittorrent every 15s)')
  }

  stop(): void {
    this.isRunning = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.watches.clear()
    logger.info('[NotifV2][QbitWatchPoller] Stopped')
  }

  /**
   * Ajoute un torrent à surveiller.
   * Peut être appelé depuis les webhooks OnGrab de Sonarr/Radarr.
   */
  addWatch(entry: Omit<WatchEntry, 'createdAt'>): void {
    const key = (entry.hash || entry.releaseName || '').toLowerCase()
    if (!key) return

    if (this.watches.has(key)) {
      logger.info(`[NotifV2][QbitWatchPoller] Torrent already watched: ${key}`)
      return
    }

    const fullEntry: WatchEntry = {
      ...entry,
      createdAt: Date.now(),
    }

    this.watches.set(key, fullEntry)
    logger.info(
      `[NotifV2][QbitWatchPoller] Added watch for ${entry.media.title} (release: ${entry.releaseName || 'unknown'}, hash: ${entry.hash || 'unknown'})`
    )
  }

  get activeCount(): number {
    return this.watches.size
  }

  private async tick(): Promise<void> {
    if (this.watches.size === 0) return

    let qbit
    try {
      qbit = await getQBittorrentService()
      if (!qbit) return
    } catch {
      return
    }

    let allTorrents: Torrent[] = []
    try {
      allTorrents = await qbit.getTorrents('all')
      if (!Array.isArray(allTorrents)) return
    } catch (err) {
      logger.warn('[NotifV2][QbitWatchPoller] Failed to fetch torrents from qBittorrent:', (err as Error).message)
      return
    }

    const now = Date.now()

    for (const [key, entry] of Array.from(this.watches.entries())) {
      // 1. Essayer de trouver le torrent correspondant dans qBit
      let torrent: Torrent | undefined

      if (entry.hash) {
        torrent = allTorrents.find(t => t.hash.toLowerCase() === entry.hash!.toLowerCase())
      }

      if (!torrent && entry.releaseName) {
        // Recherche floue/substring sur le nom du release
        const releaseLower = entry.releaseName.toLowerCase()
        torrent = allTorrents.find(t => {
          const torrentNameLower = t.name.toLowerCase()
          return torrentNameLower.includes(releaseLower) || releaseLower.includes(torrentNameLower)
        })

        // Si trouvé par nom, lier le hash pour les prochains ticks
        if (torrent) {
          entry.hash = torrent.hash
        }
      }

      // 2. Si le torrent n'est pas trouvé
      if (!torrent) {
        // Nettoyer après 1 heure s'il n'apparaît jamais (évite les fuites de mémoire)
        if (now - entry.createdAt > 1 * 60 * 60 * 1000) {
          logger.info(`[NotifV2][QbitWatchPoller] Removing stale watch (not found in qBit after 1h): ${entry.media.title}`)
          this.watches.delete(key)
        }
        continue
      }

      // 3. Traiter les transitions d'état de progression
      const progressPercent = torrent.progress * 100
      const isCompletedState = progressPercent >= 100 || 
                               torrent.state === 'uploading' || 
                               torrent.state === 'stalledUP' || 
                               torrent.state === 'pausedUP'

      // A. Commencement du téléchargement (> 1%)
      // On ne l'envoie pas si l'état est déjà complété ou si on a déjà notifié le téléchargement terminé.
      // On impose un délai de 10s depuis la création de la surveillance pour laisser le temps au grabBatcher
      // de Sonarr (qui a un délai de 5s) de dispatcher le MEDIA_GRABBED en premier.
      const timeSinceWatch = now - entry.createdAt
      if (progressPercent > 1 && !entry.hasNotifiedDownloading && !isCompletedState && !entry.hasNotifiedCompleted && timeSinceWatch >= 10000) {
        entry.hasNotifiedDownloading = true
        logger.info(`[NotifV2][QbitWatchPoller] Torrent ${torrent.name} started downloading (>1%: ${progressPercent.toFixed(1)}%) -> dispatching MEDIA_DOWNLOADING`)
        
        await dispatch(NOTIFICATION_EVENTS.MEDIA_DOWNLOADING, {
          media: entry.media,
          requester: entry.requester,
          download: {
            quality: torrent.name.includes('1080p') ? '1080p' : torrent.name.includes('2160p') ? '2160p' : undefined,
            size: `${(torrent.size / 1_073_741_824).toFixed(2)} GB`,
            progress: progressPercent,
            releaseName: torrent.name,
          }
        }).catch(err => logger.error('[NotifV2][QbitWatchPoller] Error dispatching MEDIA_DOWNLOADING:', err))
      }

      // B. Fin du téléchargement (100% ou complété)
      if (isCompletedState && !entry.hasNotifiedCompleted) {
        entry.hasNotifiedCompleted = true
        logger.info(`[NotifV2][QbitWatchPoller] Torrent ${torrent.name} completed (100%) -> dispatching MEDIA_DOWNLOAD_COMPLETE`)

        await dispatch(NOTIFICATION_EVENTS.MEDIA_DOWNLOAD_COMPLETE, {
          media: entry.media,
          requester: entry.requester,
          download: {
            quality: torrent.name.includes('1080p') ? '1080p' : torrent.name.includes('2160p') ? '2160p' : undefined,
            size: `${(torrent.size / 1_073_741_824).toFixed(2)} GB`,
            progress: 100,
            releaseName: torrent.name,
          }
        }).catch(err => logger.error('[NotifV2][QbitWatchPoller] Error dispatching MEDIA_DOWNLOAD_COMPLETE:', err))

        // Retirer de la surveillance une fois terminé
        this.watches.delete(key)
      }
    }
  }
}

// Global Singleton pour éviter les duplications lors des rechargements à chaud (Next.js dev)
const globalForQbitWatch = globalThis as unknown as {
  __qbitWatchPollerInstance?: QbitWatchPoller
}

export function getQbitWatchPoller(): QbitWatchPoller {
  if (!globalForQbitWatch.__qbitWatchPollerInstance) {
    globalForQbitWatch.__qbitWatchPollerInstance = new QbitWatchPoller()
  }
  return globalForQbitWatch.__qbitWatchPollerInstance
}
