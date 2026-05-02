export interface EmbyProviderIds {
  Tmdb?: string | number
  tmdb?: string | number
  TMDB?: string | number
  Tvdb?: string | number
  tvdb?: string | number
  TVDB?: string | number
  Imdb?: string | number
  imdb?: string | number
  IMDB?: string | number
  [key: string]: string | number | undefined
}

export interface EmbyMediaSource {
  Id?: string
  Path?: string
  Size?: number
  [key: string]: unknown
}

export interface EmbyMediaStream {
  Type?: string
  Codec?: string
  Language?: string
  [key: string]: unknown
}

export interface EmbyNowPlayingItem {
  Id?: string | number
  Name?: string
  SeriesName?: string
  SeasonName?: string
  IndexNumber?: number
  ParentIndexNumber?: number
  Type?: string
  RunTimeTicks?: number
  ProviderIds?: EmbyProviderIds
  MediaSources?: EmbyMediaSource[]
  MediaStreams?: EmbyMediaStream[]
  Path?: string
  SeriesId?: string | number
  [key: string]: unknown
}

export interface EmbySession {
  Id?: string | number
  UserId?: string | number
  UserName?: string
  Client?: string
  DeviceName?: string
  DeviceId?: string
  ApplicationVersion?: string
  PlayState?: {
    IsPaused?: boolean
    PositionTicks?: number
  }
  NowPlayingItem?: EmbyNowPlayingItem
  [key: string]: unknown
}

export interface EmbyUserData {
  IsFavorite?: boolean
  Played?: boolean
  PlayedPercentage?: number
  LastPlayedDate?: string
  PlaybackPositionTicks?: number
  [key: string]: unknown
}

export interface EmbyItem {
  Id?: string | number
  Name?: string
  Type?: string
  SeriesName?: string
  SeriesId?: string | number
  IndexNumber?: number
  ParentIndexNumber?: number
  ProviderIds?: EmbyProviderIds
  UserData?: EmbyUserData
  Path?: string
  DateCreated?: string
  MediaSources?: EmbyMediaSource[]
  [key: string]: unknown
}
