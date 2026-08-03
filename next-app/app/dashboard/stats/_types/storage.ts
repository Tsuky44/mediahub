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
    lastPlayedDate?: string | null
    requestedAt?: string | null
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

export interface StorageTotals {
    all: number
    movies: number
    series: number
}

export interface StorageListResponse {
    items: StorageItem[]
    totals: StorageTotals
    pagination: StoragePagination
    cacheReady?: {
        movies: boolean
        series: boolean
        totals: boolean
    }
}

export interface StoragePagination {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
}

export type StorageSortKey = 'size' | 'lastPlayed' | 'requested'
export type StorageSortDir = 'asc' | 'desc'

export interface StorageSort {
    key: StorageSortKey
    dir: StorageSortDir
}
