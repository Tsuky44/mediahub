import type { MediaAvailability } from '@/lib/services/media-status'

/** Qui telecharge : Radarr/Sonarr (`arr`) ou sorraa. Choisi par type de media. */
export type ManagerKind = 'arr' | 'sorraa'

export interface AddRequestInput {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title?: string
  /** Saisons demandees ; absent = toutes. */
  seasons?: number[]
  requester: { id: string; name: string }
}

export type AddRequestOutcome =
  | {
      ok: true
      message?: string
      data?: unknown
      /** Identifiant cote gestionnaire, stocke dans media_requests.external_id. */
      externalId?: string
      /** Toutes les saisons de la serie, pour creer une ligne locale par saison. */
      allSeasons?: number[]
    }
  | { ok: false; status: number; error: string }

export interface DownloadManager {
  readonly kind: ManagerKind
  addRequest(input: AddRequestInput): Promise<AddRequestOutcome>
  getAvailability(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<MediaAvailability>
}
