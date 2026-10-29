/**
 * Classification de l'intention de téléchargement.
 *
 * Le problème résolu : à l'import, on ne voit que des fichiers qui tombent, ce
 * qui obligeait à deviner l'intention en chronométrant leur arrivée (fenêtre de
 * 10 s). Un pack importé lentement produisait alors une notification par
 * épisode, et deux épisodes sortis le même jour n'en produisaient aucune.
 *
 * Au Grab en revanche, Sonarr annonce exactement ce qu'il télécharge. On
 * classe donc à ce moment-là, et on relit le verdict à l'import.
 */

export const INTENT_CLASSIFICATIONS = [
  'weekly_episode',
  'season_pack',
  'multi_episode',
  'backfill',
  'unknown',
] as const

export type IntentClassification = (typeof INTENT_CLASSIFICATIONS)[number]

/** Au-delà, un épisode unitaire relève du rattrapage de catalogue. */
export const FRESH_AIR_WINDOW_DAYS = 7

export interface ClassifyInput {
  /** `releaseType` de Sonarr v4 : SingleEpisode | SeasonPack | MultiEpisode. */
  releaseType?: string
  /** Titre de la release, pour le repli heuristique. */
  releaseTitle?: string
  /** Épisodes annoncés par le Grab. */
  episodeNumbers: number[]
  /** Diffusion du premier épisode visé. */
  airDateUtc?: Date
  /** Statut Sonarr de la série : 'continuing' | 'ended' | … */
  seriesStatus?: string
  /** Injectable pour les tests. */
  now?: Date
}

export interface ClassifyResult {
  classification: IntentClassification
  /** Sur quoi le verdict s'appuie — indispensable pour auditer les erreurs. */
  reason: string
}

/**
 * Classe une release. Fonction pure : aucun accès réseau ni base.
 *
 * Ordre de confiance décroissant :
 *  1. `releaseType` de Sonarr — c'est sa propre décision, elle fait foi
 *  2. Nombre d'épisodes annoncés
 *  3. Heuristique sur le titre de la release
 *
 * La date de diffusion n'intervient qu'ensuite, pour départager une release
 * unitaire fraîche (sortie hebdo) d'une release unitaire ancienne (rattrapage).
 */
export function classifyDownload(input: ClassifyInput): ClassifyResult {
  const count = input.episodeNumbers.length

  // 1) Verdict de Sonarr
  const type = (input.releaseType ?? '').toLowerCase()
  if (type === 'seasonpack') {
    return { classification: 'season_pack', reason: 'sonarr:releaseType=SeasonPack' }
  }
  if (type === 'multiepisode') {
    return { classification: 'multi_episode', reason: 'sonarr:releaseType=MultiEpisode' }
  }
  if (type === 'singleepisode') {
    return refineSingle(input, 'sonarr:releaseType=SingleEpisode')
  }

  // 2) Nombre d'épisodes annoncés au Grab
  if (count > 1) {
    return {
      classification: count >= 4 ? 'season_pack' : 'multi_episode',
      reason: `count:${count} épisodes annoncés`,
    }
  }
  if (count === 1) {
    return refineSingle(input, 'count:1 épisode annoncé')
  }

  // 3) Repli sur le titre — même logique que la détection existante côté UI
  const title = input.releaseTitle ?? ''
  if (title) {
    const hasEpisodeMarker = /[sS]\d+[eE]\d+|\d+x\d+/.test(title)
    const hasSeasonMarker = /[sS]\d+(?![eE]\d)|Season\s*\d+/i.test(title)
    const hasComplete = /COMPLETE|FULL|PACK|INTEGRALE/i.test(title)

    if ((hasSeasonMarker && !hasEpisodeMarker) || hasComplete) {
      return { classification: 'season_pack', reason: 'title:marqueur de saison sans épisode' }
    }
    if (hasEpisodeMarker) {
      return refineSingle(input, 'title:marqueur d\'épisode')
    }
  }

  return { classification: 'unknown', reason: 'aucun signal exploitable' }
}

/**
 * Départage une release unitaire : nouveauté de la semaine ou rattrapage ?
 *
 * C'est le signal qui manquait le plus : sans lui, un vieux catalogue récupéré
 * épisode par épisode déclenchait des notifications « nouvel épisode » pour des
 * diffusions vieilles de plusieurs années.
 */
function refineSingle(input: ClassifyInput, base: string): ClassifyResult {
  const { airDateUtc, seriesStatus } = input

  if (!airDateUtc) {
    // Sans date, on reste sur l'hypothèse la plus utile mais on le signale :
    // un faux positif ici n'est qu'une notification en trop.
    return { classification: 'weekly_episode', reason: `${base} · date de diffusion inconnue` }
  }

  const now = input.now ?? new Date()
  const ageDays = (now.getTime() - airDateUtc.getTime()) / 86_400_000

  // Diffusion à venir ou toute récente : c'est bien une sortie.
  if (ageDays <= FRESH_AIR_WINDOW_DAYS) {
    return { classification: 'weekly_episode', reason: `${base} · diffusé il y a ${ageDays.toFixed(1)}j` }
  }

  // Série terminée : plus rien ne « sort », tout est du rattrapage.
  if (seriesStatus && seriesStatus.toLowerCase() === 'ended') {
    return { classification: 'backfill', reason: `${base} · série terminée, diffusé il y a ${Math.round(ageDays)}j` }
  }

  return { classification: 'backfill', reason: `${base} · diffusé il y a ${Math.round(ageDays)}j` }
}

/** Une notification par épisode n'a de sens que pour une vraie sortie unitaire. */
export function warrantsEpisodeNotification(c: IntentClassification): boolean {
  return c === 'weekly_episode'
}

/**
 * Au-delà, un lot d'épisodes fraîchement diffusés est traité comme un pack :
 * notifier 6 fois d'un coup est un spam, notifier 2 fois ne l'est pas.
 */
export const MULTI_EPISODE_NOTIFY_MAX = 3

export interface EpisodeNotificationDecision {
  mode: 'per-episode' | 'none' | 'fallback'
  reason: string
}

/**
 * Décide quoi faire à l'import, à partir de l'intention capturée au Grab.
 *
 * `fallback` signifie « aucune intention exploitable » : l'appelant retombe
 * alors sur l'ancienne heuristique par fenêtre temporelle. C'est le filet qui
 * couvre les imports manuels, les Grab manqués et les redémarrages entre les deux.
 */
export function decideEpisodeNotifications(
  intent: { classification: IntentClassification; airDateUtc: Date | null } | null,
  episodeCount: number,
  now: Date = new Date()
): EpisodeNotificationDecision {
  if (!intent) {
    return { mode: 'fallback', reason: 'aucune intention enregistrée pour ce téléchargement' }
  }

  switch (intent.classification) {
    case 'weekly_episode':
      return { mode: 'per-episode', reason: 'sortie hebdomadaire' }

    case 'multi_episode': {
      // Plusieurs épisodes sortis ensemble : ça reste une nouveauté, à condition
      // que ça n'en fasse pas trop d'un coup et que la diffusion soit récente.
      const fresh =
        intent.airDateUtc != null &&
        (now.getTime() - intent.airDateUtc.getTime()) / 86_400_000 <= FRESH_AIR_WINDOW_DAYS
      if (fresh && episodeCount <= MULTI_EPISODE_NOTIFY_MAX) {
        return { mode: 'per-episode', reason: `${episodeCount} épisodes fraîchement diffusés` }
      }
      return {
        mode: 'none',
        reason: fresh
          ? `${episodeCount} épisodes d'un coup (> ${MULTI_EPISODE_NOTIFY_MAX})`
          : 'lot d\'épisodes anciens',
      }
    }

    case 'season_pack':
      return { mode: 'none', reason: 'pack de saison' }

    case 'backfill':
      return { mode: 'none', reason: 'rattrapage de catalogue' }

    case 'unknown':
    default:
      return { mode: 'fallback', reason: 'classification indéterminée' }
  }
}
