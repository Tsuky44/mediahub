'use client'

import { PlayInPlatformButton } from '@/components/global/PlayInPlatformButton'
import type { PlaybackPlatform } from '@/lib/playback-platform'

interface PlayButtonProps {
    embyUrl: string | null
    embyItemId: string
    serverId: string | null
    tmdbId: number
    mediaType: 'movie' | 'tv'
    /** Plateforme de connexion : « Lire dans Emby », « Lire dans Plex »… */
    platform: PlaybackPlatform
    title: string
    originalTitle?: string
    year?: number
}

/** Bouton « Lire dans … » de la fiche (le nom de la plateforme se masque sur téléphone) */
export function PlayButton({ embyUrl, embyItemId, serverId, tmdbId, mediaType, platform, title, originalTitle, year }: PlayButtonProps) {
    return (
        <PlayInPlatformButton
            platform={platform}
            serverUrl={embyUrl}
            serverId={serverId}
            itemId={embyItemId}
            tmdbId={tmdbId}
            mediaType={mediaType}
            title={title}
            originalTitle={originalTitle}
            year={year}
        />
    )
}
