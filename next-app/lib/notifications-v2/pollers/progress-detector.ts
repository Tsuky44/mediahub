/**
 * ProgressDetector — pure helpers to compute the current state of a MediaRequest
 * from Radarr/Sonarr queue + qBittorrent torrents. No side effects.
 */

import type { RadarrQueueItem } from '@/lib/services/radarr'
import type { SonarrQueueItem } from '@/lib/services/sonarr'
import type { Torrent } from '@/lib/services/qbittorrent'

export type ProgressState = 'grabbed' | 'downloading' | 'completed' | 'importing'

export interface ProgressSnapshot {
  state: ProgressState
  hash?: string
  quality?: string
  size?: string
  releaseName?: string
  progress?: number
}

export interface DetectInput {
  tmdbId: string
  mediaType: 'movie' | 'tv'
  radarrQueue: RadarrQueueItem[]
  sonarrQueue: SonarrQueueItem[]
  torrents: Torrent[]
  /** Internal Radarr movieId (already resolved upstream) — needed to match the queue. */
  radarrMovieId?: number
  /** Internal Sonarr seriesId — resolved upstream. */
  sonarrSeriesId?: number
}

/**
 * Returns the current ProgressSnapshot, or null if the request is not yet
 * in any queue (release not grabbed yet).
 */
export function detectProgress(input: DetectInput): ProgressSnapshot | null {
  const queueItem = findQueueItem(input)

  if (!queueItem) {
    // Debug logging to diagnose matching failures in production
    if (input.mediaType === 'movie') {
      console.log(`[ProgressDetector] No queue item for movie TMDB=${input.tmdbId} radarrMovieId=${input.radarrMovieId}. Radarr queue has ${input.radarrQueue.length} items.`)
      if (input.radarrQueue.length > 0) {
        const first = input.radarrQueue[0]
        console.log(`[ProgressDetector] First radarr queue item: movieId=${(first as RadarrQueueItem).movieId}, movie.tmdbId=${(first as RadarrQueueItem).movie?.tmdbId}, title=${first.title}`)
      }
    } else {
      console.log(`[ProgressDetector] No queue item for TV TMDB=${input.tmdbId} sonarrSeriesId=${input.sonarrSeriesId}. Sonarr queue has ${input.sonarrQueue.length} items.`)
      if (input.sonarrQueue.length > 0) {
        const first = input.sonarrQueue[0]
        console.log(`[ProgressDetector] First sonarr queue item: seriesId=${(first as SonarrQueueItem).seriesId}, title=${first.title}`)
      }
    }
    return null
  }

  const releaseName = queueItem.title
  const quality = matchQuality(releaseName) ?? undefined

  // Radarr/Sonarr trackedDownloadState is the most reliable source of truth.
  // It reflects the internal state machine: downloading → importPending → importing → completed.
  const trackedState = (queueItem as { trackedDownloadState?: string }).trackedDownloadState?.toLowerCase() ?? ''
  const queueStatus = (queueItem.status ?? '').toLowerCase()

  console.log(`[ProgressDetector] Matched queue item: title=${queueItem.title}, trackedState=${trackedState}, status=${queueStatus}, downloadId=${queueItem.downloadId}`)

  if (trackedState === 'importing' || trackedState === 'importpending') {
    return {
      state: 'importing',
      hash: queueItem.downloadId?.toLowerCase(),
      quality,
      size: formatSize(queueItem.size),
      releaseName,
      progress: 1,
    }
  }

  if (trackedState === 'downloading') {
    return {
      state: 'downloading',
      hash: queueItem.downloadId?.toLowerCase(),
      quality,
      size: formatSize(queueItem.size),
      releaseName,
      progress: calculateProgress(queueItem.size, queueItem.sizeleft),
    }
  }

  // Fallback when trackedDownloadState is absent (older API versions):
  // use queue status + sizeleft + torrent progress.
  const torrent = findTorrent(input.torrents, queueItem.downloadId)
  const size = formatSize(torrent?.size ?? queueItem.size)

  if (!torrent) {
    console.log(`[ProgressDetector] No torrent found for downloadId=${queueItem.downloadId}, falling back to 'grabbed'`)
    return {
      state: 'grabbed',
      hash: queueItem.downloadId?.toLowerCase(),
      quality,
      size,
      releaseName,
    }
  }

  const progress = torrent.progress
  console.log(`[ProgressDetector] Torrent found: progress=${progress}, queueStatus=${queueStatus}`)

  if (torrent.progress < 1 || queueStatus === 'downloading') {
    return {
      state: 'downloading',
      hash: torrent.hash.toLowerCase(),
      quality,
      size,
      releaseName,
      progress,
    }
  }

  // torrent.progress >= 1 and queue still present → download done, waiting for import.
  return {
    state: 'completed',
    hash: torrent.hash.toLowerCase(),
    quality,
    size,
    releaseName,
    progress: 1,
  }
}

function findQueueItem(input: DetectInput): RadarrQueueItem | SonarrQueueItem | undefined {
  if (input.mediaType === 'movie') {
    return input.radarrQueue.find(q => {
      if (input.radarrMovieId && q.movieId === input.radarrMovieId) return true
      if (q.movie?.tmdbId && String(q.movie.tmdbId) === input.tmdbId) return true
      return false
    })
  }
  // TV: Sonarr queue items have seriesId; we don't have direct tmdbId on them,
  // so the caller must pass sonarrSeriesId (resolved via tvdbId lookup upstream).
  return input.sonarrQueue.find(q => {
    if (input.sonarrSeriesId && q.seriesId === input.sonarrSeriesId) return true
    return false
  })
}

function findTorrent(torrents: Torrent[], downloadId?: string): Torrent | undefined {
  if (!downloadId) return undefined
  const target = downloadId.toLowerCase()
  return torrents.find(t => t.hash.toLowerCase() === target)
}

function matchQuality(name?: string): string | null {
  if (!name) return null
  const m = name.match(/\b(2160p|1080p|720p|480p)\b/i)
  return m ? m[1] : null
}

function calculateProgress(total?: number, remaining?: number): number | undefined {
  if (!total || total <= 0) return undefined
  const done = total - (remaining ?? 0)
  return +(done / total).toFixed(2)
}

function formatSize(bytes?: number): string | undefined {
  if (!bytes || bytes <= 0) return undefined
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return gb.toFixed(2) + ' GB'
  const mb = bytes / (1024 * 1024)
  return mb.toFixed(0) + ' MB'
}

/**
 * Returns the list of state transitions to emit, given previous and new states.
 * Handles "skipped states" (e.g. grabbed → importing if a tick was missed)
 * by emitting both intermediate events.
 */
export function transitions(prev: ProgressState | null, next: ProgressState): ProgressState[] {
  const order: ProgressState[] = ['grabbed', 'downloading', 'completed', 'importing']
  const prevIdx = prev ? order.indexOf(prev) : -1
  const nextIdx = order.indexOf(next)
  if (nextIdx <= prevIdx) return []
  return order.slice(prevIdx + 1, nextIdx + 1)
}
