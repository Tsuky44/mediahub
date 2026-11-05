import 'server-only'
import { db } from '@/lib/db/drizzle'
import { users, userCalendarEvents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { findPlayTarget, getMediaServerUserId, getUserMediaServer } from '@/lib/auth'
import type { PlaybackPlatformId, PlayTarget } from '@/lib/playback-platform'
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

const EMPTY_PROGRESS: Omit<MediaEmbyProgress, 'play'> = {
  embyUserId: null,
  embyItem: null,
  embyServerId: null,
  userProgress: null,
  seasonProgress: [],
  isInCalendar: false,
}

interface ProgressParams {
  userEmail: string | null | undefined
  tmdbId: number
  mediaType: MediaType
  details: Record<string, unknown>
}

/**
 * Progression (serveur média par défaut) et cible du bouton « Lire » (serveur de la plateforme de
 * connexion), cherchées en parallèle.
 *
 * Emby / Jellyfin : le média se retrouve sur le serveur avec lequel l'utilisateur s'est connecté,
 * avec son compte et son adresse. Plex / Onyx ouvrent leur propre app : ils n'ont besoin que de
 * savoir que le média existe dans la bibliothèque.
 */
export async function fetchMediaEmbyProgress(
  params: ProgressParams & { platform: PlaybackPlatformId }
): Promise<MediaEmbyProgress> {
  const { platform, ...progressParams } = params
  const isServerPlatform = platform === 'emby' || platform === 'jellyfin'

  const [progress, serverPlay] = await Promise.all([
    loadProgress(progressParams),
    isServerPlatform ? findServerPlay(platform, progressParams) : Promise.resolve(null),
  ])

  const play: PlayTarget | null = isServerPlatform
    ? serverPlay
    : progress.embyItem
      ? { serverUrl: null, serverId: progress.embyServerId, itemId: String(progress.embyItem.Id) }
      : null
  return { ...progress, play }
}

async function findServerPlay(
  platform: 'emby' | 'jellyfin',
  { userEmail, tmdbId, mediaType }: ProgressParams
): Promise<PlayTarget | null> {
  if (!userEmail) return null
  try {
    const dbUser = await db.query.users.findFirst({ where: eq(users.email, userEmail) })
    return await findPlayTarget(platform, dbUser, tmdbId, mediaType)
  } catch (e) {
    errorLog('Failed to resolve play target', e)
    return null
  }
}

/**
 * Recupere la progression Emby (et le statut calendrier) pour l'utilisateur courant.
 * Effectue silencieusement un fallback en cas d'echec sur Emby.
 */
async function loadProgress(params: ProgressParams): Promise<Omit<MediaEmbyProgress, 'play'>> {
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

  // Serveur de la médiathèque du compte (connexion Jellyfin -> Jellyfin) et compte sur ce serveur
  const mediaService = await getUserMediaServer()
  const mediaUserId = getMediaServerUserId(dbUser, mediaService?.flavor)
  if (!mediaUserId) {
    return { ...EMPTY_PROGRESS, isInCalendar }
  }
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
      embyServerId = await mediaService.getServerId()
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
