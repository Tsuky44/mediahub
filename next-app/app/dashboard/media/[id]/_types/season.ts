export interface Season {
    id: number
    name: string
    season_number: number
    episode_count: number
    air_date: string
    poster_path: string | null
    overview: string
}

export interface Episode {
    id: number
    name: string
    overview: string
    still_path: string | null
    episode_number: number
    air_date: string
    vote_average: number
    runtime: number
    userData?: {
        played: boolean
        playedPercentage?: number
    }
}

export type SeasonStatusValue = 'unknown' | 'available' | 'partial' | 'pending' | 'processing'

export interface SeasonStatus {
    seasonNumber: number
    status: SeasonStatusValue
}

export interface SeasonProgress {
    seasonNumber: number
    played: number
    total: number
    isWatched: boolean
}
