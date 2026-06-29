export type TrackerType = 'gazelle' | 'unit3d' | 'jackett' | 'custom' | 'scraper'

export interface TrackerFormData {
    name: string
    type: TrackerType
    baseUrl: string
    apiKey: string
    username: string
    password: string
    passkey: string
    enabled: boolean
}

export interface TrackerConfig {
    id: string
    name: string
    type: TrackerType
    baseUrl: string
    enabled: boolean
    username?: string
    password?: string
    apiKey?: string
    passkey?: string
}

export interface TrackerStat {
    id: string
    name: string
    enabled: boolean
    ratio: number
    ratioColor: string
    uploaded: string
    downloaded: string
    bonusPoints?: string | number
    seedingCount?: number
    lastUpdated: string
}

export interface TrackerTypeMeta {
    id: TrackerType
    name: string
    description: string
}
