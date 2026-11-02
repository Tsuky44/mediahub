'use server'

import { getProwlarrServiceForUser, getSonarrServiceForUser, getCurrentUser } from '@/lib/auth'
import { getQBittorrentService } from '@/lib/services/qbittorrent'
import { grabArrRelease, searchArrReleases } from '@/lib/services/interactive-search'
import { getTmdbServiceForUser } from '@/lib/auth'
import { defineAbilityFor, Actions, Subjects } from '@/lib/ability'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };


async function checkPermission(action: Actions, subject: Subjects) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  
  const ability = defineAbilityFor(user)
  
  // Special case for interactive search: allow if user has permission on either Media or Downloads
  if (action === 'interactive_search') {
      if (ability.can('interactive_search', 'Media') || 
          ability.can('interactive_search', 'Downloads') || 
          ability.can('manage', 'Media') || 
          ability.can('manage', 'Downloads')) {
          return
      }
  }

  // Allow if specific permission is granted OR if user has full 'manage' access on Media or Downloads
  if (!ability.can(action, subject) && !ability.can('manage', subject) && !ability.can('manage', 'Downloads')) {
    throw new Error('Forbidden: Insufficient permissions')
  }
}

export async function getSonarrEpisodes(tmdbId: number) {
    try {
        await checkPermission('interactive_search', 'Media')
        const sonarr = await getSonarrServiceForUser()
        const tmdb = await getTmdbServiceForUser()
        
        if (!sonarr || !tmdb) return { error: 'Services non configurés' }

        // Convert TMDB to TVDB if needed (though Sonarr might use TVDB mostly)
        const externalIds = await tmdb.getExternalIds('tv', tmdbId)
        if (!externalIds?.tvdb_id) return { error: 'TVDB ID introuvable' }

        const series = await sonarr.getSeriesByTvdbId(externalIds.tvdb_id)
        if (!series || !series.id) return { error: 'Série introuvable dans Sonarr' }

        const episodes = await sonarr.getEpisodes(series.id)
        return { episodes }
    } catch (err) {
        error('Get Sonarr episodes error:', err)
        return { error: (err as Error).message }
    }
}

export async function searchProwlarr(query: string, indexerIds?: number[], categories?: number[], limit: number = 200, offset: number = 0) {
    try {
        await checkPermission('interactive_search', 'Media')
        const prowlarrService = await getProwlarrServiceForUser()
        if (!prowlarrService) return { error: 'Prowlarr non configuré' }

        const results = await prowlarrService.search(query, indexerIds, categories, limit, offset)
        return { results }
    } catch (err) {
        error('Search prowlarr error:', err)
        return { error: (err as Error).message }
    }
}

export async function getProwlarrIndexers() {
    try {
        await checkPermission('interactive_search', 'Media')
        const prowlarrService = await getProwlarrServiceForUser()
        if (!prowlarrService) return { error: 'Prowlarr non configuré' }

        const indexers = await prowlarrService.getIndexers()
        return { indexers }
    } catch (err) {
        error('Get prowlarr indexers error:', err)
        return { error: (err as Error).message }
    }
}

export async function downloadTorrent(url: string) {
    try {
        await checkPermission('interactive_search', 'Media')
        const qbtService = await getQBittorrentService()
        if (!qbtService) return { error: 'QBittorrent non configuré' }

        await qbtService.addTorrent(url, [])
        return { success: true }
    } catch (err) {
        error('Download torrent error:', err)
        return { error: (err as Error).message }
    }
}

// --- New Interactive Search Functions ---

export async function searchMediaReleases(
    mediaType: 'movie' | 'tv',
    tmdbId: number,
    tvdbId?: number,
    seasonNumber?: number,
    episodeNumber?: number
) {
    try {
        await checkPermission('interactive_search', 'Media')
        // La fenêtre de recherche de la fiche envoie des adresses de téléchargement : elle reste sur
        // Radarr/Sonarr, que sorraa soit réglé ou non (docs/sorraa-integration.md).
        return await searchArrReleases({ mediaType, tmdbId, tvdbId, seasonNumber, episodeNumber })
    } catch (err) {
        error('Search media releases error:', err)
        return { error: (err as Error).message }
    }
}

export async function downloadMediaRelease(
    guid: string,
    indexerId: number,
    mediaType: 'movie' | 'tv',
    tmdbId: number,
    tvdbId?: number,
    seasonNumber?: number,
    episodeNumber?: number,
    releaseInfo?: {
        title: string
        downloadUrl: string
        protocol: string
        publishDate: string
        indexer: string
        size?: number
        guid?: string
    }
) {
    try {
        await checkPermission('interactive_search', 'Media')
        if (mediaType !== 'movie' && mediaType !== 'tv') return { error: 'Type de média non supporté' }
        return await grabArrRelease({ mediaType, tmdbId, tvdbId, seasonNumber, episodeNumber }, guid, indexerId, releaseInfo)
    } catch (err) {
        error('Download media release error:', err)
        return { error: (err as Error).message }
    }
}
