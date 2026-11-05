/**
 * Plateforme sur laquelle l'utilisateur lit ses médias : celle avec laquelle il s'est connecté
 * (Emby, Jellyfin, Plex, Onyx). Les boutons « Lire dans … » s'y adressent. Utilisable côté client.
 */

export type PlaybackPlatformId = 'emby' | 'jellyfin' | 'plex' | 'onyx'

export interface PlaybackPlatform {
  id: PlaybackPlatformId
  name: string
}

/** Où ouvrir un média sur Emby ou Jellyfin : adresse du serveur, son identifiant et l'élément (film, série ou épisode) */
export interface PlayTarget {
  serverUrl: string | null
  serverId: string | null
  itemId: string
}

export const PLATFORM_NAMES: Record<PlaybackPlatformId, string> = {
  emby: 'Emby',
  jellyfin: 'Jellyfin',
  plex: 'Plex',
  onyx: 'Onyx',
}

export const isPlaybackPlatform = (value: unknown): value is PlaybackPlatformId =>
  typeof value === 'string' && value in PLATFORM_NAMES

export const playbackPlatform = (id: PlaybackPlatformId): PlaybackPlatform => ({ id, name: PLATFORM_NAMES[id] })
