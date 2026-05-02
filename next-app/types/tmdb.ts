export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbMovie {
  id: number
  title: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
  vote_count?: number
  genre_ids?: number[]
  genres?: TmdbGenre[]
  media_type?: string
  [key: string]: unknown
}

export interface TmdbTvShow {
  id: number
  name: string
  title?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  first_air_date?: string
  release_date?: string
  vote_average?: number
  vote_count?: number
  genre_ids?: number[]
  genres?: TmdbGenre[]
  media_type?: string
  [key: string]: unknown
}

export interface TmdbSearchResult {
  page: number
  total_pages: number
  total_results: number
  results: Array<TmdbMovie | TmdbTvShow>
}

export interface TmdbDiscoverParams {
  page?: number
  sort_by?: string
  start_date?: string
  end_date?: string
  with_genres?: string
  without_genres?: string
  [key: string]: string | number | undefined
}
