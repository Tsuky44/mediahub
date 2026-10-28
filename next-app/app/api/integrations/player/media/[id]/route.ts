import { NextResponse } from 'next/server'
import { defineAbilityFor } from '@/lib/ability'
import { authenticatePlayerIntegration } from '@/lib/integrations/player-integration-auth'
import { getMediaAvailability, toPlayerStatus } from '@/lib/services/media-status'
import { getTmdbService } from '@/lib/services/tmdb'

interface TmdbGenre {
  id: number
  name: string
}

interface TmdbSeason {
  season_number: number
  name?: string
  episode_count?: number
  poster_path?: string | null
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticatePlayerIntegration(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (defineAbilityFor(user).cannot('read', 'Media')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const tmdbId = Number.parseInt(id, 10)
  const rawType = new URL(request.url).searchParams.get('type')
  const mediaType = rawType === 'tv' ? 'tv' : rawType === 'movie' ? 'movie' : null

  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !mediaType) {
    return NextResponse.json({ error: 'Invalid media' }, { status: 400 })
  }

  const tmdb = await getTmdbService()
  if (!tmdb) return NextResponse.json({ error: 'TMDB service unavailable' }, { status: 503 })

  const [details, availability] = await Promise.all([
    tmdb.getDetails(tmdbId, mediaType),
    getMediaAvailability(tmdbId, mediaType),
  ])

  if (!details) return NextResponse.json({ error: 'Media not found' }, { status: 404 })

  const seasons = ((details.seasons || []) as TmdbSeason[])
    .filter((season) => season.season_number > 0)
    .map((season) => {
      const seasonStatus = availability.seasons?.find((item) => item.seasonNumber === season.season_number)
      return {
        number: season.season_number,
        name: season.name || `Saison ${season.season_number}`,
        episodeCount: season.episode_count || 0,
        posterPath: season.poster_path || null,
        status: seasonStatus ? toPlayerStatus(seasonStatus.status) : 'unknown',
      }
    })

  return NextResponse.json({
    id: tmdbId,
    mediaType,
    title: details.title || details.name || 'Sans titre',
    overview: details.overview || '',
    posterPath: details.poster_path || null,
    backdropPath: details.backdrop_path || null,
    releaseDate: details.release_date || details.first_air_date || null,
    rating: details.vote_average || 0,
    runtime: details.runtime || details.episode_run_time?.[0] || null,
    genres: ((details.genres || []) as TmdbGenre[]).map((genre) => genre.name),
    status: toPlayerStatus(availability.status),
    awaitingRelease: availability.status === 'unreleased',
    expectedReleaseDate: availability.releaseDate ?? null,
    seasons,
  })
}
