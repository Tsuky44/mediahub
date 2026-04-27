import 'server-only'
import { prisma } from '@/lib/prisma'
import { getEmbyServiceForUser } from '@/lib/auth'
import type {
  MediaEmbyProgress,
  MediaType,
  SeasonProgressEntry,
  UserProgress,
} from '../_types/media-page'

const isDev = process.env.NODE_ENV === 'development'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const log = (...args: any[]) => {
  if (isDev) console.log(...args)
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorLog = (...args: any[]) => {
  if (isDev) console.error(...args)
}

const EMPTY_PROGRESS: MediaEmbyProgress = {
  embyUserId: null,
  embyItem: null,
  embyServerId: null,
  userProgress: null,
  seasonProgress: [],
  isInCalendar: false,
}

/**
 * Recupere la progression Emby (et le statut calendrier) pour l'utilisateur courant.
 * Effectue silencieusement un fallback en cas d'echec sur Emby.
 */
export async function fetchMediaEmbyProgress(params: {
  userEmail: string | null | undefined
  tmdbId: number
  mediaType: MediaType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
}): Promise<MediaEmbyProgress> {
  const { userEmail, tmdbId, mediaType, details } = params
  if (!userEmail) return EMPTY_PROGRESS

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbUser = await (prisma as any).user.findUnique({
    where: { email: userEmail },
  })
  if (!dbUser) return EMPTY_PROGRESS

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarEvent = await (prisma as any).userCalendarEvent.findUnique({
    where: {
      userId_tmdbId_mediaType: {
        userId: dbUser.id,
        tmdbId: tmdbId.toString(),
        mediaType,
      },
    },
  })
  const isInCalendar = !!calendarEvent

  if (!dbUser.embyUserId) {
    return { ...EMPTY_PROGRESS, isInCalendar }
  }

  const embyService = await getEmbyServiceForUser()
  if (!embyService) {
    return { ...EMPTY_PROGRESS, isInCalendar, embyUserId: dbUser.embyUserId }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let embyItem: any = null
  let embyServerId: string | null = null
  let userProgress: UserProgress | null = null
  let seasonProgress: SeasonProgressEntry[] = []

  try {
    embyItem = await embyService.getItemByTmdbId(
      dbUser.embyUserId,
      tmdbId,
      mediaType === 'movie' ? 'Movie' : 'Series'
    )

    if (embyItem?.ServerId) {
      embyServerId = embyItem.ServerId
    } else {
      const sysInfo = await embyService.getSystemInfo()
      if (sysInfo) embyServerId = sysInfo.Id
    }

    if (embyItem) {
      if (embyItem.UserData) {
        userProgress = {
          played: embyItem.UserData.Played,
          playedPercentage: embyItem.UserData.PlayedPercentage,
          unplayedItemCount: embyItem.UserData.UnplayedItemCount,
          playbackPositionTicks: embyItem.UserData.PlaybackPositionTicks,
          totalEpisodes:
            mediaType === 'tv' && embyItem.RecursiveItemCount
              ? embyItem.RecursiveItemCount
              : undefined,
        }
      }

      if (mediaType === 'tv') {
        log(`[MediaDetails] Fetching episodes for series ${embyItem.Id}`)
        const allEpisodes = await embyService.getEpisodes(
          dbUser.embyUserId,
          embyItem.Id
        )
        log(`[MediaDetails] Found ${allEpisodes.length} episodes`)

        if (userProgress && allEpisodes.length > 0) {
          const playedCount = allEpisodes.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e: any) => e.UserData?.Played
          ).length
          const totalEpisodes =
            details.number_of_episodes && details.number_of_episodes > 0
              ? details.number_of_episodes
              : allEpisodes.length

          userProgress.playedPercentage = Math.min(
            100,
            (playedCount / totalEpisodes) * 100
          )
          userProgress.totalEpisodes = totalEpisodes
          userProgress.unplayedItemCount = Math.max(
            0,
            totalEpisodes - playedCount
          )
        }

        const progressMap = new Map<
          number,
          { played: number; total: number }
        >()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allEpisodes.forEach((ep: any) => {
          const seasonNum = ep.ParentIndexNumber
          if (seasonNum === undefined) return
          if (!progressMap.has(seasonNum)) {
            progressMap.set(seasonNum, { played: 0, total: 0 })
          }
          const stats = progressMap.get(seasonNum)!
          stats.total++
          if (ep.UserData?.Played) {
            stats.played++
          }
        })

        seasonProgress = Array.from(progressMap.entries()).map(
          ([seasonNumber, stats]) => ({
            seasonNumber,
            played: stats.played,
            total: stats.total,
            isWatched: stats.played >= stats.total && stats.total > 0,
          })
        )
      }

      if (userProgress) {
        log(
          '[MediaDetails] User Progress:',
          JSON.stringify(userProgress, null, 2)
        )
      }
    }
  } catch (e) {
    errorLog('Failed to fetch Emby progress', e)
  }

  return {
    embyUserId: dbUser.embyUserId,
    embyItem,
    embyServerId,
    userProgress,
    seasonProgress,
    isInCalendar,
  }
}
