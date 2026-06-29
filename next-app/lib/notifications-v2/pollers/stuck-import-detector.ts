/**
 * StuckImportDetector — Détecte et gère les imports bloqués dans Sonarr/Radarr
 *
 * Problème: Quand Sonarr/Radarr ne peut pas importer un fichier (permissions,
 * chemin inexistant, etc.), l'item reste en queue avec l'état 'importBlocked'
 * ou 'importPending' indéfiniment. Cela cause:
 *   1. Spam de notifications
 *   2. Surcharge des APIs (poll constant)
 *   3. Crash potentiel des containers Docker
 *
 * Solution:
 *   - Tracker le moment où un item entre en état bloqué
 *   - Détecter après un seuil configurable (défaut: 30 min)
 *   - Permettre le nettoyage automatique ou manuel
 *   - Implémenter un backoff pour les APIs surchargeées
 */

import type { RadarrQueueItem } from '@/lib/services/radarr'
import type { SonarrQueueItem } from '@/lib/services/sonarr'
import { logger } from '@/lib/logger'

export interface StuckItem {
  id: number
  type: 'radarr' | 'sonarr'
  title: string
  state: 'importBlocked' | 'importPending' | 'importing'
  firstSeenStuck: number // timestamp
  lastSeen: number // timestamp
  mediaTitle?: string
  seriesTitle?: string
  seasonNumber?: number
  movieId?: number
  seriesId?: number
  downloadId?: string
  size: number
  trackedDownloadState?: string
  trackedDownloadStatus?: string
  status?: string
  timeleft?: string
  estimatedCompletionTime?: string
}

export interface StuckImportConfig {
  /** Temps avant de considérer un item comme "bloqué" (ms) - défaut: 30 min */
  stuckThresholdMs: number
  /** Intervalle max de polling quand les APIs sont OK (ms) - défaut: 15s */
  normalIntervalMs: number
  /** Intervalle de polling quand les APIs sont lentes (ms) - défaut: 60s */
  slowIntervalMs: number
  /** Intervalle de polling quand les APIs sont en erreur (ms) - défaut: 5 min */
  errorIntervalMs: number
  /** Nombre d'erreurs consécutives avant de considérer l'API comme "en erreur" */
  errorThreshold: number
  /** Auto-supprimer les items bloqués après ce temps (ms), 0 = désactivé */
  autoRemoveAfterMs: number
}

const DEFAULT_CONFIG: StuckImportConfig = {
  stuckThresholdMs: 30 * 60 * 1000, // 30 minutes
  normalIntervalMs: 15_000, // 15 secondes
  slowIntervalMs: 60_000, // 1 minute
  errorIntervalMs: 5 * 60_000, // 5 minutes
  errorThreshold: 3,
  autoRemoveAfterMs: 0, // Désactivé par défaut
}

export class StuckImportDetector {
  private stuckItems = new Map<string, StuckItem>()
  private config: StuckImportConfig
  private consecutiveErrors = 0
  private lastApiCall = 0
  private lastApiDuration = 0
  private isSlow = false

  constructor(config: Partial<StuckImportConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Met à jour la liste des items et détecte ceux qui sont bloqués
   */
  updateQueues(radarrQueue: RadarrQueueItem[], sonarrQueue: SonarrQueueItem[]): StuckItem[] {
    const now = Date.now()
    const currentKeys = new Set<string>()
    const newlyStuck: StuckItem[] = []

    // Traiter Radarr
    for (const item of radarrQueue) {
      const key = `radarr:${item.id}`
      currentKeys.add(key)

      if (this.isStuckState(item.trackedDownloadState)) {
        const existing = this.stuckItems.get(key)
        if (existing) {
          // Mettre à jour lastSeen
          existing.lastSeen = now
          existing.state = (item.trackedDownloadState?.toLowerCase() as StuckItem['state']) || existing.state
        } else {
          // Nouvel item bloqué
          const stuckItem: StuckItem = {
            id: item.id,
            type: 'radarr',
            title: item.title,
            state: (item.trackedDownloadState?.toLowerCase() as StuckItem['state']) || 'importPending',
            firstSeenStuck: now,
            lastSeen: now,
            mediaTitle: item.movie?.title,
            movieId: item.movieId ?? item.movie?.id,
            downloadId: item.downloadId,
            size: item.size,
            trackedDownloadState: item.trackedDownloadState,
            trackedDownloadStatus: item.trackedDownloadStatus,
            status: item.status,
            timeleft: item.timeleft,
            estimatedCompletionTime: item.estimatedCompletionTime,
          }
          this.stuckItems.set(key, stuckItem)
          newlyStuck.push(stuckItem)
          logger.warn(
            `[StuckImportDetector] New stuck item detected: ${item.title} (state: ${item.trackedDownloadState})`
          )
        }
      } else {
        // L'item n'est plus bloqué, le retirer
        if (this.stuckItems.has(key)) {
          this.stuckItems.delete(key)
          logger.info(`[StuckImportDetector] Item ${key} is no longer stuck`)
        }
      }
    }

    // Traiter Sonarr
    for (const item of sonarrQueue) {
      const key = `sonarr:${item.id}`
      currentKeys.add(key)

      if (this.isStuckState(item.trackedDownloadState)) {
        const existing = this.stuckItems.get(key)
        if (existing) {
          existing.lastSeen = now
          existing.state = (item.trackedDownloadState?.toLowerCase() as StuckItem['state']) || existing.state
        } else {
          const stuckItem: StuckItem = {
            id: item.id,
            type: 'sonarr',
            title: item.title,
            state: (item.trackedDownloadState?.toLowerCase() as StuckItem['state']) || 'importPending',
            firstSeenStuck: now,
            lastSeen: now,
            seriesTitle: item.series?.title,
            seasonNumber: item.episode?.seasonNumber ?? item.seasonNumber,
            seriesId: item.seriesId ?? item.series?.id,
            downloadId: item.downloadId,
            size: item.size,
            trackedDownloadState: item.trackedDownloadState,
            trackedDownloadStatus: item.trackedDownloadStatus,
            status: item.status,
            timeleft: item.timeleft,
            estimatedCompletionTime: item.estimatedCompletionTime,
          }
          this.stuckItems.set(key, stuckItem)
          newlyStuck.push(stuckItem)
          logger.warn(
            `[StuckImportDetector] New stuck item detected: ${item.title} (state: ${item.trackedDownloadState})`
          )
        }
      } else {
        if (this.stuckItems.has(key)) {
          this.stuckItems.delete(key)
          logger.info(`[StuckImportDetector] Item ${key} is no longer stuck`)
        }
      }
    }

    // Nettoyer les items disparus
    for (const [key, item] of this.stuckItems) {
      if (!currentKeys.has(key)) {
        this.stuckItems.delete(key)
        logger.info(`[StuckImportDetector] Stuck item ${key} disappeared from queue`)
      }
    }

    return newlyStuck
  }

  /**
   * Retourne tous les items actuellement bloqués
   */
  getStuckItems(): StuckItem[] {
    return Array.from(this.stuckItems.values())
  }

  /**
   * Retourne les items qui devraient être considérés comme "vraiment bloqués"
   * (dépassent le seuil de temps)
   */
  getConfirmedStuckItems(): StuckItem[] {
    const now = Date.now()
    return this.getStuckItems().filter(
      item => now - item.firstSeenStuck >= this.config.stuckThresholdMs
    )
  }

  /**
   * Retourne les items qui devraient être auto-supprimés
   */
  getAutoRemovableItems(): StuckItem[] {
    if (this.config.autoRemoveAfterMs <= 0) return []
    const now = Date.now()
    return this.getStuckItems().filter(
      item => now - item.firstSeenStuck >= this.config.autoRemoveAfterMs
    )
  }

  /**
   * Retire un item de la liste des items bloqués (après suppression manuelle)
   */
  removeItem(id: number, type: 'radarr' | 'sonarr'): void {
    const key = `${type}:${id}`
    this.stuckItems.delete(key)
  }

  /**
   * Vérifie si un état indique un item bloqué
   */
  private isStuckState(state?: string): boolean {
    if (!state) return false
    const lower = state.toLowerCase()
    return lower === 'importblocked' || lower === 'importpending'
  }

  /**
   * Enregistre le résultat d'un appel API pour le backoff
   */
  recordApiCall(durationMs: number, success: boolean): void {
    this.lastApiCall = Date.now()
    this.lastApiDuration = durationMs

    if (!success) {
      this.consecutiveErrors++
      if (this.consecutiveErrors >= this.config.errorThreshold) {
        this.isSlow = true
        logger.warn(
          `[StuckImportDetector] API marked as slow after ${this.consecutiveErrors} consecutive errors`
        )
      }
    } else {
      if (this.consecutiveErrors > 0) {
        this.consecutiveErrors = 0
        this.isSlow = false
        logger.info(`[StuckImportDetector] API recovered, resuming normal polling`)
      }
      // Si l'appel prend plus de 5s, considérer l'API comme lente
      if (durationMs > 5000) {
        this.isSlow = true
      }
    }
  }

  /**
   * Détermine l'intervalle de polling approprié selon l'état des APIs
   */
  getCurrentInterval(): number {
    if (this.consecutiveErrors >= this.config.errorThreshold) {
      return this.config.errorIntervalMs
    }
    if (this.isSlow) {
      return this.config.slowIntervalMs
    }
    return this.config.normalIntervalMs
  }

  /**
   * Vérifie si on devrait skipper ce tick pour réduire la charge
   */
  shouldSkipTick(): boolean {
    // Si beaucoup d'items bloqués, réduire la fréquence
    const stuckCount = this.stuckItems.size
    if (stuckCount > 20 && this.lastApiDuration > 2000) {
      // Skip 1 tick sur 2 quand > 20 items bloqués et API lente
      return Math.floor(Date.now() / this.getCurrentInterval()) % 2 === 0
    }
    return false
  }

  /**
   * Statistiques pour monitoring
   */
  getStats(): {
    stuckCount: number
    confirmedStuckCount: number
    consecutiveErrors: number
    isSlow: boolean
    currentInterval: number
    lastApiDuration: number
  } {
    return {
      stuckCount: this.stuckItems.size,
      confirmedStuckCount: this.getConfirmedStuckItems().length,
      consecutiveErrors: this.consecutiveErrors,
      isSlow: this.isSlow,
      currentInterval: this.getCurrentInterval(),
      lastApiDuration: this.lastApiDuration,
    }
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<StuckImportConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Singleton pour l'application
let globalDetector: StuckImportDetector | null = null

export function getStuckImportDetector(config?: Partial<StuckImportConfig>): StuckImportDetector {
  if (!globalDetector) {
    globalDetector = new StuckImportDetector(config)
  } else if (config) {
    globalDetector.updateConfig(config)
  }
  return globalDetector
}

export function resetStuckImportDetector(): void {
  globalDetector = null
}
