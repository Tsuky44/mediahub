export interface StorageItem {
    id: string
    name: string
    type: 'Movie' | 'Series'
    size: number
    path?: string
    isPlaying: boolean
    activeUser?: string
    episodesCount?: number
    addedAt: string
    tmdbId?: number
    tvdbId?: number
}

export interface SeasonStat {
    seasonNumber: number
    total: number
    played: number
    percentage: number
}

export interface ViewingStat {
    userId: string
    userName: string
    played: boolean
    lastPlayedDate: string | null
    playbackPositionTicks: number
    totalDurationTicks: number
    percentage: number
    episodeText?: string
    seasons?: SeasonStat[]
    playedEpisodes?: number
    totalEpisodes?: number
}

export interface SeasonDetail {
    id: string
    name: string
    index: number
    size: number
    episodesCount: number
    path: string
}

export interface ItemDetails {
    viewingStats: ViewingStat[]
    seasons: SeasonDetail[]
}

export interface DeleteTarget {
    item: StorageItem
    season?: SeasonDetail
}
