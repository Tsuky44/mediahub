export interface ProwlarrIndexer {
    id: number
    name: string
    enable: boolean
}

export interface ProwlarrCategory {
    id: number
    name: string
    icon: React.ComponentType<{ size?: number; className?: string }>
}

export interface ProwlarrRelease {
    guid: string
    title: string
    size: number
    seeders: number
    leechers: number
    publishDate: string
    indexer: string
    indexerId?: number
    indexerFlags?: string[]
    downloadUrl?: string
    magnetUrl?: string
    protocol?: string
}

export type ProwlarrSortBy = 'seeders' | 'publishDate' | 'size'
export type ProwlarrSortOrder = 'asc' | 'desc'
export type ProwlarrSearchSource = 'smart' | 'raw'

export interface ProwlarrEpisode {
    id: number | string
    episode_number: number
    name?: string
    overview?: string
    hasFile?: boolean
}

export interface ProwlarrSeason {
    season_number: number
    name: string
    episode_count: number
}
