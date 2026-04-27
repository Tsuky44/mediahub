export type MediaFiltersType = 'all' | 'movie' | 'tv'

export interface Genre {
  id: number
  name: string
}

export interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

export interface RegionOption {
  value: string
  label: string
}

export interface LanguageOption {
  code: string
  name: string
}

export interface SortOption {
  value: string
  label: string
}

export interface MediaFiltersValue {
  sort_by: string
  start_date: string
  end_date: string
  genres: number[]
  language: string
  min_duration: string
  max_duration: string
  watch_region: string
  watch_providers: number[]
}
