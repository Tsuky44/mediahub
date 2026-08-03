import 'server-only'
import { db } from '@/lib/db/drizzle'
import { users, userCalendarEvents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getMediaServerServiceForUser, getMediaServerUserId } from '@/lib/auth'
import type {
  MediaEmbyProgress,
  MediaType,
  SeasonProgressEntry,
  UserProgress,
} from '../_types/media-page'

const isDev = process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => {
  if (isDev) console.log(...args)
}
const errorLog = (...args: unknown[]) => {
  if (isDev) console.error(...args)
}

interface EmbyApiItem {
  ServerId?: string;
  Id?: string;
  UserData?: {
    Played?: boolean;
    PlayedPercentage?: number;
    UnplayedItemCount?: number;
    PlaybackPositionTicks?: number;
  };
  RecursiveItemCount?: number;
}

interface EmbyApiEpisode {
  ParentIndexNumber?: number;
  UserData?: {
    Played?: boolean;
  };
}

interface EmbyApiSystemInfo {
  Id?: string;
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
  details: Record<string, unknown>
}): Promise<MediaEmbyProgress> {
  const { userEmail, tmdbId, mediaType, details } = params
  if (!userEmail) return EMPTY_PROGRESS

  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, userEmail),
  })
  if (!dbUser) return EMPTY_PROGRESS

  const calendarEvent = await db.query.userCalendarEvents.findFirst({
    where: and(
      eq(userCalendarEvents.userId, dbUser.id),
      eq(userCalendarEvents.tmdbId, tmdbId.toString()),
      eq(userCalendarEvents.mediaType, mediaType)
    ),
  })
  const isInCalendar = !!calendarEvent

  const mediaUserId = getMediaServerUserId(dbUser)
  if (!mediaUserId) {
    return { ...EMPTY_PROGRESS, isInCalendar }
  }

  const mediaService = await getMediaServerServiceForUser()
  if (!mediaService) {
    return { ...EMPTY_PROGRESS, isInCalendar, embyUserId: mediaUserId }
  }

  let embyItem: EmbyApiItem | null = null
  let embyServerId: string | null = null
  let userProgress: UserProgress | null = null
  let seasonProgress: SeasonProgressEntry[] = []

  try {
    embyItem = (await mediaService.getItemByTmdbId(
      mediaUserId,
      tmdbId,
      mediaType === 'movie' ? 'Movie' : 'Series'
    )) as EmbyApiItem | null

    if (embyItem?.ServerId) {
      embyServerId = embyItem.ServerId
    } else {
      const sysInfo = (await mediaService.getSystemInfo()) as EmbyApiSystemInfo | null
      if (sysInfo) embyServerId = sysInfo.Id || null
    }

    if (embyItem) {
      if (embyItem.UserData) {
        userProgress = {
          played: embyItem.UserData.Played ?? false,
          playedPercentage: embyItem.UserData.PlayedPercentage ?? 0,
          unplayedItemCount: embyItem.UserData.UnplayedItemCount ?? 0,
          playbackPositionTicks: embyItem.UserData.PlaybackPositionTicks ?? 0,
          totalEpisodes:
            mediaType === 'tv' && embyItem.RecursiveItemCount
              ? embyItem.RecursiveItemCount
              : undefined,
        }
      }

      if (mediaType === 'tv' && embyItem.Id) {
        log(`[MediaDetails] Fetching episodes for series ${embyItem.Id}`)
        const allEpisodes = (await mediaService.getEpisodes(
          mediaUserId,
          embyItem.Id
        )) as EmbyApiEpisode[]
        log(`[MediaDetails] Found ${allEpisodes.length} episodes`)

        if (userProgress && allEpisodes.length > 0) {
          const playedCount = allEpisodes.filter(
            (e: EmbyApiEpisode) => e.UserData?.Played
          ).length
          const detailsEpisodes = details.number_of_episodes as number | undefined
          const totalEpisodes =
            typeof detailsEpisodes === 'number' && detailsEpisodes > 0
              ? detailsEpisodes
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
        allEpisodes.forEach((ep: EmbyApiEpisode) => {
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
    embyUserId: mediaUserId,
    embyItem,
    embyServerId,
    userProgress,
    seasonProgress,
    isInCalendar,
  }
}
