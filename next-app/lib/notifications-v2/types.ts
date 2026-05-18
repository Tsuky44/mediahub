/**
 * Notifications V2 — Type system
 * Module indépendant, aucune dépendance sur l'ancien système.
 */

// ─────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────

export const NOTIFICATION_EVENTS = {
  MEDIA_REQUESTED: 'MEDIA_REQUESTED',
  MEDIA_APPROVED: 'MEDIA_APPROVED',
  MEDIA_GRABBED: 'MEDIA_GRABBED',
  MEDIA_DOWNLOADING: 'MEDIA_DOWNLOADING',
  MEDIA_DOWNLOAD_COMPLETE: 'MEDIA_DOWNLOAD_COMPLETE',
  MEDIA_IMPORTING: 'MEDIA_IMPORTING',
  MEDIA_AVAILABLE: 'MEDIA_AVAILABLE',
  SEASON_PARTIALLY_AVAILABLE: 'SEASON_PARTIALLY_AVAILABLE',
  MEDIA_FAILED: 'MEDIA_FAILED',
  SEASON_DOWNLOAD_COMPLETE: 'SEASON_DOWNLOAD_COMPLETE',
  SEASON_IMPORT_COMPLETE: 'SEASON_IMPORT_COMPLETE',
  SEASON_AVAILABLE: 'SEASON_AVAILABLE',
} as const

export type NotificationEvent =
  (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS]

export const ALL_EVENTS: NotificationEvent[] = Object.values(NOTIFICATION_EVENTS)

// ─────────────────────────────────────────────────────────────
// Payload (data emitted with an event)
// ─────────────────────────────────────────────────────────────

export interface MediaInfo {
  tmdbId: string
  mediaType: 'movie' | 'tv'
  title: string
  year?: string | number
  overview?: string
  posterPath?: string
  genres?: string
  rating?: string | number
  seasonNumber?: number
  /** Pour les notifs groupées (ex: demande de S1+S2 ensemble). Sert à différencier
   * la dedup-key des demandes groupées portant sur des saisons différentes. */
  seasons?: number[]
}

export interface RequesterInfo {
  id: number
  name?: string
  email?: string
  whatsappNumber?: string
}

export interface DownloadContext {
  quality?: string
  size?: string
  progress?: number
  releaseName?: string
}

export interface FailureContext {
  reason: string
  stage?: 'request' | 'download' | 'import' | 'availability'
}

export interface NotificationEventPayload {
  event: NotificationEvent
  timestamp: string
  correlationId: string
  media: MediaInfo
  requester?: RequesterInfo
  download?: DownloadContext
  failure?: FailureContext
}

// ─────────────────────────────────────────────────────────────
// Configuration (stored in DB as JSON)
// ─────────────────────────────────────────────────────────────

export interface EvolutionConfig {
  apiUrl: string
  apiKey: string
  instance: string
  /** Default destination if no per-event target is set. E.g. "33612345678" (digits only). */
  defaultNumber?: string
}

export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

export interface EventRouteConfig {
  enabled: boolean
  /**
   * @deprecated Utiliser `templateMovie` et `templateTv`. Conservé pour rétrocompat.
   * Si défini, sert de fallback quand `templateMovie`/`templateTv` sont vides.
   */
  template?: string
  /** Template personnalisé pour les films. Vide = template par défaut. */
  templateMovie?: string
  /** Template personnalisé pour les séries (supporte `{season}`). Vide = template par défaut. */
  templateTv?: string
  /** User IDs to notify; their `whatsappNumber` is resolved at send time. */
  targetUserIds: number[]
  /** Raw phone numbers (digits only) — for recipients without a user account. */
  targetNumbers: string[]
  /** If true, notify the requester on their whatsappNumber (if set on their user profile). */
  notifyRequester: boolean
  /** If true, send the movie/series poster as an image with caption. */
  includePoster: boolean
}

export interface NotificationsV2Config {
  enabled: boolean
  evolution: EvolutionConfig
  retry: RetryConfig
  events: Record<NotificationEvent, EventRouteConfig>
}

// ─────────────────────────────────────────────────────────────
// Provider abstraction (SOLID — depend on abstractions)
// ─────────────────────────────────────────────────────────────

export interface SendMessageRequest {
  to: string
  text: string
  /** Optional media URL (poster) to send as image with caption. */
  mediaUrl?: string
}

export interface SendMessageResult {
  success: boolean
  attempts: number
  error?: string
}

export interface MessageProvider {
  readonly name: string
  send(req: SendMessageRequest): Promise<SendMessageResult>
}
