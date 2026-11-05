'use client'

import { useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import clsx from 'clsx'
import type { PlaybackPlatform } from '@/lib/playback-platform'
import { getPlexLink } from '@/app/dashboard/media/play-actions'

interface PlayInPlatformButtonProps {
  /** Plateforme de connexion de l'utilisateur (lib/auth/playback-platform) */
  platform: PlaybackPlatform
  /** Emby / Jellyfin : adresse du serveur, son identifiant et l'élément à ouvrir (film ou épisode) */
  serverUrl?: string | null
  serverId?: string | null
  itemId?: string | null
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
  originalTitle?: string
  year?: number
  /** Lecture commencée : « Reprendre » au lieu de « Lire » */
  resume?: boolean
  /** hero : bouton de la fiche (nom de la plateforme masqué sur téléphone) ; compact : aperçu */
  variant?: 'hero' | 'compact'
  className?: string
}

/**
 * « Lire dans Emby », « Reprendre dans Plex »… : ouvre le média sur la plateforme avec laquelle
 * l'utilisateur s'est connecté. Emby et Jellyfin : la page du média dans le lecteur web de leur
 * serveur, ouverte directement ; Plex : la page du média dans l'app Plex ; Onyx : l'app Onyx.
 */
export function PlayInPlatformButton({
  platform,
  serverUrl,
  serverId,
  itemId,
  tmdbId,
  mediaType,
  title,
  originalTitle,
  year,
  resume = false,
  variant = 'hero',
  className,
}: PlayInPlatformButtonProps) {
  const [opening, setOpening] = useState(false)

  const isServer = platform.id === 'emby' || platform.id === 'jellyfin'
  // Page d'un média : Jellyfin la sert sur #/details (l'ancien #!/ est déprécié et n'a pas de route
  // « item »), Emby sur #!/item
  const webUrl = isServer && serverUrl && serverId && itemId
    ? `${serverUrl.replace(/\/$/, '')}/web/index.html#${platform.id === 'jellyfin' ? '/details' : '!/item'}?id=${itemId}&serverId=${serverId}`
    : null
  // Emby / Jellyfin sans adresse du serveur ou sans élément : rien à ouvrir
  if (isServer && !webUrl) return null

  const handlePlay = async () => {
    if (platform.id === 'onyx') {
      window.location.href = `onyx://play?tmdbId=${tmdbId}&type=${mediaType}`
      return
    }
    if (platform.id === 'plex') {
      // Onglet ouvert tout de suite (sinon bloqué comme fenêtre surgissante), rempli ensuite
      const tab = window.open('', '_blank')
      setOpening(true)
      try {
        const url = await getPlexLink({ title, originalTitle, year, mediaType, ratingKey: itemId ?? undefined })
        if (tab) tab.location.href = url
        else window.location.href = url
      } finally {
        setOpening(false)
      }
      return
    }
    if (!webUrl) return
    // Nouvel onglet ; si le navigateur le bloque, on ouvre dans l'onglet courant
    if (!window.open(webUrl, '_blank')) window.location.href = webUrl
  }

  const verb = resume ? 'Reprendre' : 'Lire'
  return (
    <div className={clsx('flex flex-col gap-2', variant === 'hero' ? 'items-stretch sm:items-start' : 'items-start', className)}>
      <button
        type="button"
        onClick={handlePlay}
        disabled={opening}
        className={clsx(
          'flex items-center justify-center gap-2 rounded-full bg-indigo-600/90 font-semibold text-white shadow-[0_0_15px_rgba(232,230,228,0.16)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_25px_rgba(232,230,228,0.24)] disabled:opacity-80',
          variant === 'hero' ? 'px-5 py-2.5 text-sm hover:scale-105 sm:px-6 sm:py-3' : 'h-10 px-5 text-sm hover:scale-[1.03]',
        )}
      >
        {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
        {variant === 'hero' ? (
          <span>
            {verb}
            <span className="hidden sm:inline">{` dans ${platform.name}`}</span>
          </span>
        ) : (
          <span>{`${verb} dans ${platform.name}`}</span>
        )}
      </button>
    </div>
  )
}
