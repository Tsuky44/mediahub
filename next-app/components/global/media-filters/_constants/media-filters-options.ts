import type {
  LanguageOption,
  MediaFiltersValue,
  RegionOption,
  SortOption,
} from '../_types/media-filters'

export const REGIONS: RegionOption[] = [
  { value: 'FR', label: 'France' },
  { value: 'US', label: 'États-Unis' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'Royaume-Uni' },
  { value: 'DE', label: 'Allemagne' },
  { value: 'ES', label: 'Espagne' },
  { value: 'IT', label: 'Italie' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CH', label: 'Suisse' },
  { value: 'AU', label: 'Australie' },
]

export const LANGUAGES: LanguageOption[] = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'Anglais' },
  { code: 'ja', name: 'Japonais' },
  { code: 'es', name: 'Espagnol' },
  { code: 'de', name: 'Allemand' },
  { code: 'it', name: 'Italien' },
  { code: 'ko', name: 'Coréen' },
  { code: 'zh', name: 'Chinois' },
]

export const SORT_OPTIONS: SortOption[] = [
  { value: 'popularity.desc', label: 'Popularité (décr.)' },
  { value: 'popularity.asc', label: 'Popularité (crois.)' },
  { value: 'vote_average.desc', label: 'Note (décr.)' },
  { value: 'vote_average.asc', label: 'Note (crois.)' },
  { value: 'release_date.desc', label: 'Date (récent)' },
  { value: 'release_date.asc', label: 'Date (ancien)' },
]

export const PROVIDER_PREVIEW_LIMIT = 12

export const DEFAULT_MEDIA_FILTERS: MediaFiltersValue = {
  sort_by: 'popularity.desc',
  start_date: '',
  end_date: '',
  genres: [],
  language: 'all',
  min_duration: '',
  max_duration: '',
  watch_region: 'FR',
  watch_providers: [],
}
