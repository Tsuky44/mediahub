import { getEmbyServiceForUser } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users, settings, mediaRequests } from '@/lib/db/schema'
import { eq, inArray, desc } from 'drizzle-orm'
import { getTmdbService } from '@/lib/services/tmdb'
import { getSetting } from '@/lib/settings'
import { fetchRecentlyWatchedItems, fetchUserRecommendations } from '../media/actions'
import { getTorrents } from '../downloads/actions'
import { AppAbility } from '@/lib/ability'
import { Session } from 'next-auth'
import type { Torrent } from '@/lib/services/qbittorrent'
import type { RecentlyWatchedItem } from '../media/RecentlyWatched'
import type { RecommendationItem } from '../media/Recommendations'
import type { MediaRequest } from '../_components/recent-requests/useRecentRequests'

export interface DashboardData {
  sessions: unknown[]
  recentRequests: MediaRequest[]
  recentlyWatched: RecentlyWatchedItem[]
  recommendations: RecommendationItem[]
  activeTorrents: Torrent[]
  embyUrl: string | null | undefined
  hasDownloads: boolean
  hasDocker: boolean
  showWelcome: boolean
  userRole: string
  isAdminOrUserPlus: boolean
}

export async function fetchDashboardData(
  user: Session['user'] | undefined,
  ability: AppAbility
): Promise<DashboardData> {
  const userRole = user?.role || 'user'
  const isAdminOrUserPlus = userRole === 'admin' || userRole === 'user_plus'
  const userId = user?.id ? parseInt(user.id) : NaN

  const embyService = await getEmbyServiceForUser()

  const dbUser =
    !isNaN(userId)
      ? await db.query.users.findFirst({
          where: eq(users.id, userId),
        })
      : null

  const settingsList = await db.query.settings.findMany({
    where: inArray(settings.key, [
      'emby_url',
      'qbittorrent_url',
      'smb_host',
      'docker_host',
      'unraid_url',
      'welcome_message_enabled',
    ]),
    columns: { key: true, value: true },
  })

  const welcomeEnabled = settingsList.find(s => s.key === 'welcome_message_enabled')
    ? settingsList.find(s => s.key === 'welcome_message_enabled')?.value === 'true'
    : true

  const showWelcome = welcomeEnabled && (dbUser ? !dbUser.hasSeenWelcome : true)

  const embyUrl = settingsList.find(s => s.key === 'emby_url')?.value
  const hasQbit = !!settingsList.find(s => s.key === 'qbittorrent_url' && s.value)
  const hasSmb = !!settingsList.find(s => s.key === 'smb_host' && s.value)
  const hasDownloads = hasQbit || hasSmb
  const hasDocker =
    !!settingsList.find(s => s.key === 'docker_host' && s.value) ||
    !!settingsList.find(s => s.key === 'unraid_url' && s.value)

  let sessions: unknown[] = []
  let recentRequests: MediaRequest[] = []
  let recentlyWatched: RecentlyWatchedItem[] = []
  let recommendations: RecommendationItem[] = []
  let activeTorrents: Torrent[] = []

  const [sessionsRes, requestsRes, watchedRes, recsRes, torrentsRes] = await Promise.allSettled([
    embyService ? embyService.getSessions() : Promise.resolve([]),
    ability.can('read', 'MediaRequest')
      ? db.query.mediaRequests.findMany({
          orderBy: [desc(mediaRequests.requestedAt)],
          limit: 20,
        })
      : Promise.resolve([]),
    fetchRecentlyWatchedItems(),
    fetchUserRecommendations(),
    ability.can('read', 'Downloads') ? getTorrents('all') : Promise.resolve([]),
  ])

  if (sessionsRes.status === 'fulfilled') {
    sessions = Array.isArray(sessionsRes.value) ? sessionsRes.value : []
  }

  if (torrentsRes.status === 'fulfilled') {
    activeTorrents = Array.isArray(torrentsRes.value) ? torrentsRes.value : []
  }

  if (requestsRes.status === 'fulfilled') {
    const tmdbService = await getTmdbService()
    recentRequests = await Promise.all(
      requestsRes.value.map(async (req) => {
        let metadata: Record<string, unknown> = {}
        try {
          metadata = req.metadata ? JSON.parse(req.metadata as string) : {}
        } catch {}

        let posterPath = (metadata as { posterPath?: string }).posterPath
        if (
          (!posterPath || posterPath.includes('MediaCover')) &&
          req.tmdbId &&
          tmdbService
        ) {
          try {
            const tmdbIdNum = parseInt(String(req.tmdbId))
            if (!isNaN(tmdbIdNum)) {
              const details = await tmdbService.getDetails(tmdbIdNum, req.mediaType as 'movie' | 'tv')
              if (details && details.poster_path) {
                posterPath = details.poster_path
              }
            }
          } catch {
            // ignore
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

  if (watchedRes.status === 'fulfilled') {
    recentlyWatched = watchedRes.value.map((item: any) => ({
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
  if (recsRes.status === 'fulfilled') {
    const recsData = Array.isArray(recsRes.value)
      ? recsRes.value
      : (recsRes.value as { results?: any[] }).results || []
    recommendations = recsData.map((item: any) => ({
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

  return {
    sessions,
    recentRequests,
    recentlyWatched,
    recommendations,
    activeTorrents,
    embyUrl,
    hasDownloads,
    hasDocker,
    showWelcome,
    userRole,
    isAdminOrUserPlus,
  }
}
