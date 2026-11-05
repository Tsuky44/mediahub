'use client'

import { useState, useSyncExternalStore } from 'react'
import { toggleFavorite } from '@/app/dashboard/media/actions'
import { toggleWatchLater } from '@/app/dashboard/media/watch-later-actions'

export interface MediaCardItem {
  id: string | number
  title?: string
  name?: string
  poster_path: string | null
  /** Image de fond de la fiche : l'affiche s'y retourne au clic (MotionDirector) */
  backdrop_path?: string | null
  media_type?: string
  overview?: string
  media_status?: {
    available: boolean
    status: string
    message?: string
    /** Date de sortie attendue quand le statut est « unreleased » */
    releaseDate?: string
  }
  tmdbId?: string | number
  isFavorite?: boolean
  isWatchLater?: boolean
}

/*
 * État partagé par élément (favori, à regarder plus tard) : l'affiche et son aperçu au survol
 * (médiathèque) affichent toujours le même état, quel que soit celui des deux qui l'a changé.
 */
type Shared = { favorite?: boolean; watchLater?: boolean }
const shared = new Map<string, Shared>()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const share = (key: string, patch: Shared) => {
  shared.set(key, { ...shared.get(key), ...patch })
  listeners.forEach((listener) => listener())
}

export function useMediaCardActions(item: MediaCardItem) {
  const key = String(item.id)
  const entry = useSyncExternalStore(subscribe, () => shared.get(key), () => undefined)
  const isFavorite = entry?.favorite ?? !!item.isFavorite
  const isWatchLater = entry?.watchLater ?? !!item.isWatchLater
  const setIsFavorite = (favorite: boolean) => share(key, { favorite })
  const setIsWatchLater = (watchLater: boolean) => share(key, { watchLater })
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [isTogglingWatchLater, setIsTogglingWatchLater] = useState(false)

  const title = item.title || item.name || 'Untitled'

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isTogglingFavorite) return

    setIsTogglingFavorite(true)
    const newStatus = !isFavorite
    const success = await toggleFavorite(item.id.toString(), newStatus)
    if (success) {
      setIsFavorite(newStatus)
    }
    setIsTogglingFavorite(false)
  }

  const handleToggleWatchLater = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isTogglingWatchLater) return

    setIsTogglingWatchLater(true)
    try {
      const res = await toggleWatchLater({
        mediaId: item.id.toString(),
        tmdbId: item.tmdbId?.toString() || item.id.toString(),
        mediaType: (item.media_type as 'movie' | 'tv') || 'movie',
        title: title,
        posterPath: item.poster_path,
        isEmbyItem: !!item.tmdbId,
      })

      if (res.success) {
        setIsWatchLater(res.action === 'added')
      } else {
        alert(`Erreur: ${res.error || 'Une erreur est survenue'}`)
      }
    } catch (err) {
      console.error('[MediaCard] Toggle error:', err)
    } finally {
      setIsTogglingWatchLater(false)
    }
  }

  return {
    isFavorite: isFavorite as boolean,
    isWatchLater: isWatchLater as boolean,
    isTogglingFavorite,
    isTogglingWatchLater,
    handleToggleFavorite,
    handleToggleWatchLater,
  }
}
