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
    /** Taille cumulée de tous les résultats (tri / filtres inclus), null si inconnue */
    matchedSize?: number | null
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

/**
 * Filtre de date :
 * - `never` : aucune date (jamais regardé / jamais demandé)
 * - `olderThan` : il y a plus de N mois
 * - `olderOrNever` : il y a plus de N mois, ou jamais
 * - `within` : dans les N derniers mois
 */
export type StorageDateFilterMode = 'any' | 'never' | 'olderThan' | 'olderOrNever' | 'within'

export interface StorageDateFilter {
    mode: StorageDateFilterMode
    months: number
}

/** Filtres appliqués côté serveur sur toute la bibliothèque. */
export interface StorageFilters {
    watched: StorageDateFilter
    requested: StorageDateFilter
    added: StorageDateFilter
    /** Taille minimale en Go (0 = pas de minimum) */
    minSizeGb: number
}

export type BulkDeleteItemStatus = 'pending' | 'deleting' | 'done' | 'failed' | 'skipped'

/** Avancement d'une suppression groupée (mis à jour après chaque média). */
export interface BulkDeleteProgress {
    statuses: Record<string, BulkDeleteItemStatus>
    processed: number
    total: number
    successCount: number
    failedCount: number
    freedBytes: number
    currentName: string | null
}
