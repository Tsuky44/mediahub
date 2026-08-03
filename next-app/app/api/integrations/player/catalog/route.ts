import { NextResponse } from 'next/server'
import { defineAbilityFor } from '@/lib/ability'
import { authenticatePlayerIntegration } from '@/lib/integrations/player-integration-auth'
import { getMediaAvailability } from '@/lib/services/media-status'
import { getTmdbService } from '@/lib/services/tmdb'

type MediaType = 'all' | 'movie' | 'tv'

interface TmdbCatalogItem {
  id: number
  media_type?: string
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
}

export async function GET(request: Request) {
  const user = await authenticatePlayerIntegration(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (defineAbilityFor(user).cannot('read', 'Media')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const requestedType = params.get('type')
  const type: MediaType = requestedType === 'movie' || requestedType === 'tv' ? requestedType : 'all'
  const query = params.get('query')?.trim()
  const tmdb = await getTmdbService()

  if (!tmdb) return NextResponse.json({ error: 'TMDB service unavailable' }, { status: 503 })

  const data = query
    ? type === 'all'
      ? await tmdb.searchMulti(query, page)
      : await tmdb.search(type, query, page)
    : await tmdb.getTrending(type, page)

  const source = (data.results || []) as TmdbCatalogItem[]
  const mediaItems = source.filter((item) => {
    const mediaType = item.media_type || type
    return mediaType === 'movie' || mediaType === 'tv'
  })

  const results = await Promise.all(mediaItems.map(async (item) => {
    const mediaType = (item.media_type || type) as 'movie' | 'tv'
    const availability = await getMediaAvailability(item.id, mediaType)
    return {
      id: item.id,
      mediaType,
      title: item.title || item.name || 'Sans titre',
      overview: item.overview || '',
      posterPath: item.poster_path || null,
      backdropPath: item.backdrop_path || null,
      releaseDate: item.release_date || item.first_air_date || null,
      rating: item.vote_average || 0,
      status: availability.status,
    }
  }))

  return NextResponse.json({
    page,
    totalPages: data.total_pages || 1,
    results,
  })
}
