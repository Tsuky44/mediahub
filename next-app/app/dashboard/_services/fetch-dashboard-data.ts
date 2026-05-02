import { getEmbyServiceForUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTmdbService } from '@/lib/services/tmdb'
import { getSetting } from '@/lib/settings'
import { fetchRecentlyWatchedItems, fetchUserRecommendations } from '../media/actions'
import { getTorrents } from '../downloads/actions'

export interface DashboardData {
  sessions: any[]
  recentRequests: any[]
  recentlyWatched: any[]
  recommendations: any[]
  activeTorrents: any[]
  embyUrl: string | null | undefined
  hasDownloads: boolean
  hasDocker: boolean
  showWelcome: boolean
  userRole: string
  isAdminOrUserPlus: boolean
}

export async function fetchDashboardData(user: any, ability: any): Promise<DashboardData> {
  const userRole = user?.role || 'user'
  const isAdminOrUserPlus = userRole === 'admin' || userRole === 'user_plus'
  const userId = user?.id ? parseInt(user.id) : NaN

  const embyService = await getEmbyServiceForUser()

  const dbUser =
    !isNaN(userId)
      ? await prisma.user.findUnique({
          where: { id: userId },
        })
      : null

  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'emby_url',
          'qbittorrent_url',
          'smb_host',
          'docker_host',
          'unraid_url',
          'welcome_message_enabled',
        ],
      },
    },
    select: { key: true, value: true },
  })

  const welcomeEnabled = settings.find(s => s.key === 'welcome_message_enabled')
    ? settings.find(s => s.key === 'welcome_message_enabled')?.value === 'true'
    : true

  const showWelcome = welcomeEnabled && (dbUser ? !dbUser.hasSeenWelcome : true)

  const embyUrl = settings.find(s => s.key === 'emby_url')?.value
  const hasQbit = !!settings.find(s => s.key === 'qbittorrent_url' && s.value)
  const hasSmb = !!settings.find(s => s.key === 'smb_host' && s.value)
  const hasDownloads = hasQbit || hasSmb
  const hasDocker =
    !!settings.find(s => s.key === 'docker_host' && s.value) ||
    !!settings.find(s => s.key === 'unraid_url' && s.value)

  let sessions: any[] = []
  let recentRequests: any[] = []
  let recentlyWatched: any[] = []
  let recommendations: any[] = []
  let activeTorrents: any[] = []

  const [sessionsRes, requestsRes, watchedRes, recsRes, torrentsRes] = await Promise.allSettled([
    embyService ? embyService.getSessions() : Promise.resolve([]),
    ability.can('read', 'MediaRequest')
      ? prisma.mediaRequest.findMany({
          orderBy: { requestedAt: 'desc' },
          take: 20,
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
      requestsRes.value.map(async (req: any) => {
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
              const details = await tmdbService.getDetails(tmdbIdNum, req.mediaType)
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
    recentlyWatched = watchedRes.value
  }
  if (recsRes.status === 'fulfilled') {
    recommendations = Array.isArray(recsRes.value)
      ? recsRes.value
      : (recsRes.value as { results?: any[] }).results || []
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
