/**
 * Rendu de la carte vivante.
 *
 * Contraintes qui dictent la forme :
 *  - Le budget d'affichage garanti est de DEUX lignes : un titre et une ligne
 *    de corps. Tout le reste dépend du dépliage et du lanceur Android.
 *  - Le titre est FIGÉ pour toute la durée du cycle : c'est ce qui donne
 *    l'impression d'une carte qui vit, plutôt que de notifications qui se
 *    remplacent. Il porte donc les données statiques (média, demandeur).
 *  - Le corps porte l'état, et lui seul change.
 *  - Le poster est envoyé en `image`, ce qui bascule Android en style
 *    BigPicture : le corps multi-lignes n'y serait pas affiché. D'où une
 *    ligne d'état unique, et pas de checklist du parcours.
 *
 * Rendu volontairement fixe, non pilotable par les templates : ceux-ci sont
 * pensés pour WhatsApp (blocs multi-lignes) et casseraient ce format compact.
 */

// ─────────────────────────────────────────────────────────────
// Étapes
// ─────────────────────────────────────────────────────────────

export const LIVE_STEPS = [
  'requested',
  'approved',
  'grabbed',
  'downloading',
  'downloaded',
  'importing',
  'available',
  'failed',
  'stalled',
] as const

export type LiveStep = (typeof LIVE_STEPS)[number]

/** Ordre de progression. Une carte ne régresse jamais vers un rang inférieur. */
const STEP_RANK: Record<LiveStep, number> = {
  requested: 0,
  approved: 1,
  grabbed: 2,
  downloading: 3,
  downloaded: 4,
  importing: 5,
  available: 6,
  // États terminaux hors séquence : ils peuvent survenir à tout moment.
  failed: 99,
  stalled: 98,
}

/** Étapes qui closent le cycle : la carte est supprimée après envoi. */
const TERMINAL_STEPS = new Set<LiveStep>(['available', 'failed', 'stalled'])

export function isTerminalStep(step: LiveStep): boolean {
  return TERMINAL_STEPS.has(step)
}

/** true si `next` fait avancer la carte (ou la termine). */
export function isForwardStep(current: LiveStep, next: LiveStep): boolean {
  if (current === next) return false
  return STEP_RANK[next] > STEP_RANK[current]
}

/** Mappe un événement notifications-v2 vers une étape de carte. */
export function stepFromEvent(event: string): LiveStep | null {
  switch (event) {
    case 'MEDIA_REQUESTED': return 'requested'
    case 'MEDIA_APPROVED': return 'approved'
    case 'MEDIA_GRABBED': return 'grabbed'
    case 'MEDIA_DOWNLOADING': return 'downloading'
    case 'MEDIA_DOWNLOAD_COMPLETE':
    case 'SEASON_DOWNLOAD_COMPLETE': return 'downloaded'
    case 'MEDIA_IMPORTING':
    case 'SEASON_IMPORT_COMPLETE': return 'importing'
    case 'MEDIA_AVAILABLE':
    case 'SEASON_AVAILABLE':
    case 'SEASON_PARTIALLY_AVAILABLE': return 'available'
    case 'MEDIA_FAILED': return 'failed'
    // EPISODE_AVAILABLE volontairement absent : par épisode, il ferait
    // régresser puis clignoter la carte de saison à chaque import.
    default: return null
  }
}

// ─────────────────────────────────────────────────────────────
// Contexte accumulé
// ─────────────────────────────────────────────────────────────

export interface LiveCardSnapshot {
  title: string
  year?: string
  posterPath?: string
  seasonNumber?: number
  requesterName?: string
  requesterId?: number
  quality?: string
  size?: string
  /** 0–100. */
  progress?: number
  failureReason?: string
}

// ─────────────────────────────────────────────────────────────
// Identité
// ─────────────────────────────────────────────────────────────

/**
 * Tag de la notification, qui est aussi l'identité de la carte.
 * Deux notifications de même tag ne s'empilent pas : la seconde remplace
 * la première dans le tiroir.
 */
export function buildLiveTag(
  mediaType: string,
  tmdbId: string,
  seasonNumber?: number
): string {
  const season = seasonNumber != null ? `:S${seasonNumber}` : ''
  return `live:${mediaType}:${tmdbId}${season}`
}

// ─────────────────────────────────────────────────────────────
// Rendu
// ─────────────────────────────────────────────────────────────

/** Longueur maximale du titre avant que les lanceurs Android ne tronquent. */
const TITLE_BUDGET = 38

/**
 * Titre figé : `Titre (année) · Demandeur`.
 *
 * Le nom du demandeur est prioritaire sur l'intégralité du titre : si ça ne
 * tient pas, c'est le titre du média qu'on rogne, jamais le nom. Il est en
 * revanche masqué quand le destinataire EST le demandeur — se voir rappeler
 * son propre nom mange de la place pour rien.
 */
export function buildLiveTitle(
  snapshot: LiveCardSnapshot,
  recipientUserId?: number
): string {
  const season = snapshot.seasonNumber != null
    ? ` S${String(snapshot.seasonNumber).padStart(2, '0')}`
    : ''
  const year = snapshot.year ? ` (${snapshot.year})` : ''
  const base = `${snapshot.title}${year}${season}`

  const showRequester =
    !!snapshot.requesterName &&
    (recipientUserId == null || snapshot.requesterId == null || recipientUserId !== snapshot.requesterId)

  if (!showRequester) return truncate(base, TITLE_BUDGET)

  const suffix = ` · ${snapshot.requesterName}`
  const room = TITLE_BUDGET - suffix.length
  return `${truncate(base, Math.max(room, 12))}${suffix}`
}

/**
 * Ligne d'état — la seule ligne dont l'affichage est garanti.
 * Elle porte donc l'information la plus périssable : l'étape et la progression.
 */
export function buildLiveBody(step: LiveStep, snapshot: LiveCardSnapshot): string {
  const quality = snapshot.quality ? ` · ${snapshot.quality}` : ''
  const size = snapshot.size ? ` · ${snapshot.size}` : ''

  switch (step) {
    case 'requested':
      return `📋 Demande enregistrée`
    case 'approved':
      return `✅ Demande approuvée`
    case 'grabbed':
      return `🎯 Release trouvée${quality}${size}`
    case 'downloading': {
      const pct = clampPercent(snapshot.progress ?? 0)
      return `${progressBar(pct)} ${pct} % · Téléchargement`
    }
    case 'downloaded':
      return `${progressBar(100)} 100 % · Téléchargement terminé`
    case 'importing':
      return `📥 Import sur le serveur…`
    case 'available':
      return `🍿 Disponible — prêt à regarder`
    case 'failed':
      return snapshot.failureReason
        ? `⚠️ Échec · ${snapshot.failureReason}`
        : `⚠️ Échec du téléchargement`
    case 'stalled':
      return `❓ Suivi interrompu — voir le dashboard`
  }
}

/**
 * Barre sur 10 segments. `▰` plein, `▱` vide.
 *
 * Troncature plutôt qu'arrondi : à 99 % un arrondi afficherait une barre
 * pleine, ce qui laisserait croire que c'est terminé. Seul 100 % remplit
 * la barre. Inversement, dès 1 % un segment s'allume pour montrer que
 * quelque chose se passe.
 */
export function progressBar(percent: number, segments = 10): string {
  const pct = clampPercent(percent)
  let filled = Math.floor((pct / 100) * segments)
  if (pct > 0 && filled === 0) filled = 1
  if (pct >= 100) filled = segments
  return '▰'.repeat(filled) + '▱'.repeat(segments - filled)
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…'
}

/** URL absolue du poster, pour le champ `image` de la notification. */
/**
 * Re-export de l'implementation partagee (`notifications-v2/utils/poster-url`)
 * pour ne pas maintenir deux regles de resolution d'image divergentes entre le
 * canal WhatsApp et le canal Web Push.
 */
export { buildPosterUrl } from '@/lib/notifications-v2/utils/poster-url'
