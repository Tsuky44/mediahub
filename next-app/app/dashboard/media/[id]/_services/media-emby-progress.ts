import 'server-only'
import { db } from '@/lib/db/drizzle'
import { users, userCalendarEvents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { findPlayTarget, getPlexServiceForUser, withLinkedAccounts } from '@/lib/auth'
import { getPlatformServer } from '@/lib/auth/service-factories'
import type { PlaybackPlatformId, PlayTarget } from '@/lib/playback-platform'
import { findOnyxLibraryItem, type OnyxLibraryItem } from '@/lib/services/onyx-directory'
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
 * avec son compte et son adresse. Plex : dans la bibliothèque du serveur Plex (élément ouvert dans
 * l'app Plex). Onyx : dans la bibliothèque Onyx (id Onyx, fiche ouverte dans l'app web d'Onyx).
 */
export async function fetchMediaEmbyProgress(
  params: ProgressParams & { platform: PlaybackPlatformId }
): Promise<MediaEmbyProgress> {
  const { platform, ...progressParams } = params

  // Chaque plateforme se suffit : progression et lecture viennent de la même, jamais d'une autre
  if (platform === 'onyx') {
    const [base, onyx] = await Promise.all([loadProgress(progressParams, null), findOnyxPlay(progressParams)])
    return {
      ...base,
      userProgress: onyx ? onyxProgress(onyx) : null,
      play: onyx ? { serverUrl: null, serverId: null, itemId: String(onyx.id) } : null,
    }
  }
  if (platform === 'plex') {
    const [base, play] = await Promise.all([loadProgress(progressParams, null), findPlexPlay(progressParams)])
    return { ...base, play }
  }
  const [progress, play] = await Promise.all([
    loadProgress(progressParams, platform),
    findServerPlay(platform, progressParams),
  ])
  return { ...progress, play }
}

async function findServerPlay(
  platform: 'emby' | 'jellyfin',
  { userEmail, tmdbId, mediaType }: ProgressParams
): Promise<PlayTarget | null> {
  if (!userEmail) return null
  try {
    const dbUser = await withLinkedAccounts(await db.query.users.findFirst({ where: eq(users.email, userEmail) }))
    return await findPlayTarget(platform, dbUser, tmdbId, mediaType)
  } catch (e) {
    errorLog('Failed to resolve play target', e)
    return null
  }
}

/** Titre de la bibliothèque Onyx (avec la progression du compte Onyx), ou null : Onyx non configuré, ou média absent */
async function findOnyxPlay({ userEmail, tmdbId, mediaType }: ProgressParams): Promise<OnyxLibraryItem | null> {
  try {
    const account = userEmail
      ? await withLinkedAccounts(await db.query.users.findFirst({ where: eq(users.email, userEmail) }))
      : null
    return await findOnyxLibraryItem({ tmdbId, mediaType }, account?.onyxUserId)
  } catch (e) {
    errorLog('Failed to find Onyx item', e)
    return null
  }
}

/** Progression du compte Onyx sur un titre, au format de la fiche */
function onyxProgress(item: OnyxLibraryItem): UserProgress | null {
  if (item.type === 'movie') {
    const pos = item.current_position_seconds ?? 0
    if (!item.is_finished && pos <= 0) return null
    return {
      played: !!item.is_finished,
      playedPercentage: item.is_finished ? 100 : item.duration ? Math.min(100, (pos / item.duration) * 100) : 0,
      unplayedItemCount: 0,
      // Ticks Emby (100 ns) : le format attendu par la fiche
      playbackPositionTicks: Math.round(pos * 10_000_000),
    }
  }
  const available = item.available_episode_count ?? 0
  const watched = item.watched_episode_count ?? 0
  if (available <= 0 || (watched === 0 && !(item.started_episode_count ?? 0))) return null
  return {
    played: watched >= available,
    playedPercentage: Math.min(100, (watched / available) * 100),
    unplayedItemCount: Math.max(0, available - watched),
    totalEpisodes: available,
  }
}

/** Élément de la bibliothèque Plex (ratingKey), ou null : pas de Plex, ou média absent */
async function findPlexPlay({ tmdbId, mediaType }: ProgressParams): Promise<PlayTarget | null> {
  try {
    const plex = await getPlexServiceForUser()
    const item = plex ? await plex.findByTmdbId(tmdbId, mediaType) : null
    return item ? { serverUrl: null, serverId: null, itemId: item.ratingKey } : null
  } catch (e) {
    errorLog('Failed to find Plex item', e)
    return null
  }
}

/**
 * Recupere la progression Emby (et le statut calendrier) pour l'utilisateur courant.
 * Effectue silencieusement un fallback en cas d'echec sur Emby.
 */
async function loadProgress(
  params: ProgressParams,
  server: 'emby' | 'jellyfin' | null
): Promise<Omit<MediaEmbyProgress, 'play'>> {
  const { userEmail, tmdbId, mediaType, details } = params
  if (!userEmail) return EMPTY_PROGRESS

  // Compte complété par son groupe « comptes liés »
  const dbUser = await withLinkedAccounts(await db.query.users.findFirst({
    where: eq(users.email, userEmail),
  }))
  if (!dbUser) return EMPTY_PROGRESS

  const calendarEvent = await db.query.userCalendarEvents.findFirst({
    where: and(
      eq(userCalendarEvents.userId, dbUser.id),
      eq(userCalendarEvents.tmdbId, tmdbId.toString()),
      eq(userCalendarEvents.mediaType, mediaType)
    ),
  })
  const isInCalendar = !!calendarEvent

  // Onyx, Plex : rien à lire sur Emby ou Jellyfin
  if (!server) return { ...EMPTY_PROGRESS, isInCalendar }

  // Serveur de la plateforme et compte propre à ce serveur (jamais celui de l'autre)
  const mediaService = (await getPlatformServer(server))?.service ?? null
  const mediaUserId = (server === 'jellyfin' ? dbUser.jellyfinUserId : dbUser.embyUserId) ?? null
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
