'use client'

import { useState, useEffect } from 'react'
import { checkDownloadStatus, DownloadStatus } from '../download-status-actions'

// Toutes les 2 s pendant un téléchargement (progression en direct), sinon toutes
// les 10 s : un média qui attend sa sortie ou une source n'évolue pas à la seconde.
const ACTIVE_POLL_MS = 2_000
const IDLE_POLL_MS = 10_000

/**
 * État de téléchargement Radarr/Sonarr du média. `enabled` à faux : aucune requête
 * (fenêtre fermée). `loading` n'est vrai que tant que la première réponse manque :
 * une réponse vide (rien en cours) termine aussi le chargement.
 */
export function useDownloadStatus(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  tvdbId?: number,
  title?: string,
  enabled = true
) {
  const [status, setStatus] = useState<DownloadStatus | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let inFlight = false

    const fetchStatus = async () => {
      if (inFlight) return // une seule chaîne de requêtes à la fois
      inFlight = true
      clearTimeout(timer)
      let result: DownloadStatus | null = null
      try {
        result = await checkDownloadStatus(tmdbId, mediaType, tvdbId, title)
        if (!cancelled) setStatus(result)
      } catch (e) {
        console.error('Failed to fetch download status', e)
      } finally {
        inFlight = false
        if (!cancelled) {
          setLoaded(true)
          timer = setTimeout(() => {
            if (!document.hidden) fetchStatus()
          }, result?.isDownloading || result?.imports?.some((i) => !i.failed) ? ACTIVE_POLL_MS : IDLE_POLL_MS)
        }
      }
    }

    fetchStatus()

    const onVisibilityChange = () => {
      if (!document.hidden) fetchStatus()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, tmdbId, mediaType, tvdbId, title])

  return { status, loading: enabled && !loaded }
}
