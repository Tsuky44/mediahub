export interface TrackerStat {
  id: string
  name: string
  baseUrl?: string
  uploaded: string
  downloaded: string
  uploadedBytes: number
  downloadedBytes: number
  ratio: number
  ratioColor: string
  bonusPoints?: number
  seedingCount?: number
  leechingCount?: number
  lastUpdated: string
  enabled: boolean
}

export interface TrackerStatsCacheInfo {
  cached: boolean
  age?: number
  expiresIn?: number
}
