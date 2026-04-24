export interface PosterUrls {
    posterPath: string | null
    fallbackPosterPath: string | null
}

/**
 * Determine l'URL du poster d'une demande en tenant compte des differentes
 * sources (TMDB direct, proxy interne, chemin Radarr/Sonarr). Retourne
 * aussi un fallback vers le proxy si l'URL principale echoue.
 */
export function resolvePosterUrls(
    tmdbId: string | number | null | undefined,
    mediaType: string,
    mediaPosterPath: string | null | undefined
): PosterUrls {
    const proxyUrl = tmdbId ? `/api/media/image/${tmdbId}?tmdbId=${tmdbId}&mediaType=${mediaType}` : null

    if (!mediaPosterPath) {
        return { posterPath: proxyUrl, fallbackPosterPath: null }
    }

    if (mediaPosterPath.startsWith('http')) {
        return { posterPath: mediaPosterPath, fallbackPosterPath: proxyUrl }
    }

    if (
        mediaPosterPath.startsWith('/api/v3/mediacover') ||
        mediaPosterPath.startsWith('/api/mediacover') ||
        mediaPosterPath === 'null' ||
        mediaPosterPath === 'undefined' ||
        mediaPosterPath === ''
    ) {
        return { posterPath: proxyUrl, fallbackPosterPath: null }
    }

    const cleanPath = mediaPosterPath.startsWith('/') ? mediaPosterPath : `/${mediaPosterPath}`
    return {
        posterPath: `https://image.tmdb.org/t/p/w500${cleanPath}`,
        fallbackPosterPath: proxyUrl,
    }
}
