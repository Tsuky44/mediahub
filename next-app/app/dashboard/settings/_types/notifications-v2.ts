import type { NotificationEvent } from '@/lib/notifications-v2'

export interface UserOption {
  id: number
  name: string
  email: string
  hasWhatsapp: boolean
}

export const EVENT_LABELS: Record<NotificationEvent, string> = {
  MEDIA_REQUESTED: 'Nouvelle demande',
  MEDIA_APPROVED: 'Demande approuvée',
  MEDIA_GRABBED: 'Release trouvée (grab)',
  MEDIA_DOWNLOADING: 'Téléchargement en cours',
  MEDIA_DOWNLOAD_COMPLETE: 'Téléchargement terminé (100%)',
  MEDIA_IMPORTING: 'Import en cours',
  MEDIA_AVAILABLE: 'Média disponible (Emby)',
  SEASON_PARTIALLY_AVAILABLE: 'Saison partiellement disponible',
  EPISODE_AVAILABLE: 'Épisode disponible',
  SEASON_DOWNLOAD_COMPLETE: 'Batch téléchargement terminé',
  SEASON_IMPORT_COMPLETE: 'Batch import terminé',
  SEASON_AVAILABLE: 'Batch disponible',
  MEDIA_FAILED: 'Échec',
}

export const EVENT_ORDER: NotificationEvent[] = [
  'MEDIA_REQUESTED',
  'MEDIA_APPROVED',
  'MEDIA_GRABBED',
  'MEDIA_DOWNLOADING',
  'MEDIA_DOWNLOAD_COMPLETE',
  'MEDIA_IMPORTING',
  'MEDIA_AVAILABLE',
  'SEASON_PARTIALLY_AVAILABLE',
  'EPISODE_AVAILABLE',
  'SEASON_DOWNLOAD_COMPLETE',
  'SEASON_IMPORT_COMPLETE',
  'SEASON_AVAILABLE',
  'MEDIA_FAILED',
]

/**
 * Classification des événements par type de média supporté.
 * 'both' = s'applique aux films ET aux séries.
 * 'tv'   = s'applique UNIQUEMENT aux séries.
 * 'movie'= s'applique UNIQUEMENT aux films.
 */
export const EVENT_MEDIA_TYPES: Record<NotificationEvent, 'movie' | 'tv' | 'both'> = {
  MEDIA_REQUESTED: 'both',
  MEDIA_APPROVED: 'both',
  MEDIA_GRABBED: 'both',
  MEDIA_DOWNLOADING: 'both',
  MEDIA_DOWNLOAD_COMPLETE: 'both',
  MEDIA_IMPORTING: 'both',
  MEDIA_AVAILABLE: 'both',
  SEASON_PARTIALLY_AVAILABLE: 'tv',
  EPISODE_AVAILABLE: 'tv',
  SEASON_DOWNLOAD_COMPLETE: 'tv',
  SEASON_IMPORT_COMPLETE: 'tv',
  SEASON_AVAILABLE: 'tv',
  MEDIA_FAILED: 'both',
}

/**
 * Événements réellement dispatchés dans le code (templates morts exclus de l'UI).
 */
export const ACTIVE_EVENT_ORDER: NotificationEvent[] = [
  'MEDIA_REQUESTED',
  'MEDIA_GRABBED',
  'MEDIA_DOWNLOADING',
  'MEDIA_DOWNLOAD_COMPLETE',
  'MEDIA_AVAILABLE',
  'SEASON_PARTIALLY_AVAILABLE',
  'EPISODE_AVAILABLE',
  'MEDIA_FAILED',
]
