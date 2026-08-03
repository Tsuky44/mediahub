export type ServiceStatus = 'online' | 'offline' | 'loading' | 'hidden'

export interface ServicesHealth {
  emby: ServiceStatus
  serverType?: 'emby' | 'jellyfin'
}

export interface DiskUsage {
  total: string
  used: string
  free: string
  percent: number
}

export interface LibraryStats {
  movies: number
  series: number
  episodes: number
}

export interface DashboardStats {
  library: LibraryStats
  disk: DiskUsage
}

export interface LiveSearchResult {
  id: number
  title: string
  type: 'movie' | 'tv'
  year: string
  poster: string | null
}

export interface DashboardConfigStatus {
  hasDownloads: boolean
  hasDocker: boolean
}
