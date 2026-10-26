import 'server-only'
import { db } from '@/lib/db/drizzle'
import { users, mediaRequests } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTmdbService } from '@/lib/services/tmdb'
import { fetchRecentlyWatchedItems, fetchUserRecommendations } from '../media/actions'
import type { RecentlyWatchedItem } from '../media/RecentlyWatched'
import type { RecommendationItem } from '../media/Recommendations'
import type { MediaRequest } from '../_components/recent-requests/useRecentRequests'

// Chargeurs indépendants du dashboard : chaque section est streamée séparément
// (Suspense) pour qu'un service lent (Emby, TMDB…) ne bloque pas toute la page.

export async function loadShowWelcome(userId: number, welcomeEnabled: boolean): Promise<boolean> {
  if (!welcomeEnabled) return false
  if (isNaN(userId)) return true
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { hasSeenWelcome: true },
  })
  return dbUser ? !dbUser.hasSeenWelcome : true
}

export async function loadRecentRequests(): Promise<MediaRequest[]> {
  const [requests, tmdbService] = await Promise.all([
    db.query.mediaRequests.findMany({
      orderBy: [desc(mediaRequests.requestedAt)],
      limit: 20,
    }),
    getTmdbService(),
  ])

  return Promise.all(
    requests.map(async (req) => {
      let metadata: Record<string, unknown> = {}
      try {
        metadata = req.metadata ? JSON.parse(req.metadata as string) : {}
      } catch {}

      let posterPath = (metadata as { posterPath?: string }).posterPath
      if ((!posterPath || posterPath.includes('MediaCover')) && req.tmdbId && tmdbService) {
        const tmdbIdNum = parseInt(String(req.tmdbId))
        if (!isNaN(tmdbIdNum)) {
          // getPosterPath est mis en cache (24h) : bien plus léger que getDetails
          posterPath = (await tmdbService.getPosterPath(tmdbIdNum, req.mediaType as 'movie' | 'tv')) || posterPath
        }
      }

      return {
        id: String(req.id || ''),
        type: req.mediaType,
        status: req.status,
        media: {
          title: req.title,
          posterPath: posterPath,
          tmdbId: req.tmdbId,
          seasons: (metadata as { seasons?: number[] }).seasons ?? undefined,
        },
        requestedBy: {
          displayName: req.requesterName || 'Inconnu',
          email: req.requesterEmail || '',
        },
      }
    })
  )
}

export async function loadRecentlyWatched(): Promise<RecentlyWatchedItem[]> {
  const items = await fetchRecentlyWatchedItems()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((item: any) => ({
    id: String(item.id || ''),
    tmdbId: item.tmdbId,
    title: item.title || item.name || '',
    name: item.name || item.title || '',
    seriesName: item.seriesName,
    poster_path: item.poster_path,
    media_type: item.media_type || item.type || '',
    type: item.type || item.media_type || '',
    overview: item.overview || '',
    lastPlayedDate: item.lastPlayedDate || null,
    parentIndexNumber: item.parentIndexNumber,
    indexNumber: item.indexNumber,
  }))
}

export async function loadRecommendations(): Promise<RecommendationItem[]> {
  const recs = await fetchUserRecommendations()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recsData: any[] = Array.isArray(recs) ? recs : recs.results || []
  return recsData.map((item) => ({
    id: Number(item.id || 0),
    title: item.title,
    name: item.name,
    poster_path: item.poster_path,
    media_type: item.media_type || '',
    vote_average: Number(item.vote_average || 0),
    release_date: item.release_date,
    first_air_date: item.first_air_date,
  }))
}
