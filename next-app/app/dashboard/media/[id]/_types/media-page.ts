/**
 * Types pour la page de details d'un media (movie/tv).
 * `any` est utilise sur les payloads TMDB/Emby/Plex/Jellyfin car les services
 * sources eux-memes n'exposent pas de types stricts. Les structures consommees
 * dans le composant restent typees via les helpers _utils.
 */

export type MediaType = 'movie' | 'tv'

export interface MediaSearchParams {
  type?: string
  source?: string
  name?: string
}

export interface UserProgress {
  played?: boolean
  playedPercentage: number
  unplayedItemCount: number
  playbackPositionTicks?: number
  totalEpisodes?: number
}

export interface SeasonProgressEntry {
  seasonNumber: number
  played: number
  total: number
  isWatched: boolean
}

export interface NormalizedCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface NormalizedCrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface NormalizedCredits {
  cast: NormalizedCastMember[]
  crew: NormalizedCrewMember[]
}

export interface MediaDerivedMeta {
  director?: string
  writers: string[]
  editors: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keywords: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watchProviders: any[]
}

export interface MediaEmbyProgress {
  embyUserId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embyItem: any | null
  embyServerId: string | null
  userProgress: UserProgress | null
  seasonProgress: SeasonProgressEntry[]
  isInCalendar: boolean
}
