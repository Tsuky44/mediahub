/**
 * Compte à rebours de l'en-tête : prochain épisode d'une série, dernier épisode d'une série
 * terminée, ou sortie d'un film pas encore sorti. Rien à annoncer : null.
 */

export type CountdownKind = 'next' | 'last' | 'release'

export interface CountdownModel {
  kind: CountdownKind
  label: string
  /** Jour visé (AAAA-MM-JJ) : diffusion ou sortie */
  target: string
  /** Épisode précédent (AAAA-MM-JJ) : début de la barre de progression */
  from?: string
  /** « Saison 8 · Épisode 12 », ou « Film à venir » */
  caption: string
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

const episodeCaption = (e: { season_number?: number; episode_number?: number }) =>
  e.season_number != null && e.episode_number != null
    ? `Saison ${e.season_number} · Épisode ${e.episode_number}`
    : 'Nouvel épisode'

/** `today` : AAAA-MM-JJ (le navigateur recalcule ensuite avec sa date locale) */
export function getCountdown(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any,
  mediaType: 'movie' | 'tv',
  today: string
): CountdownModel | null {
  if (mediaType === 'tv') {
    const next = details.next_episode_to_air
    const last = details.last_episode_to_air
    if (next?.air_date && DAY.test(next.air_date) && next.air_date >= today) {
      return {
        kind: 'next',
        label: 'Prochain épisode',
        target: next.air_date,
        from: last?.air_date && DAY.test(last.air_date) ? last.air_date : undefined,
        caption: episodeCaption(next),
      }
    }
    if ((details.status === 'Ended' || details.status === 'Canceled') && last?.air_date && DAY.test(last.air_date)) {
      return { kind: 'last', label: 'Dernier épisode', target: last.air_date, caption: episodeCaption(last) }
    }
    return null
  }
  const release = details.release_date
  if (release && DAY.test(release) && release >= today) {
    return { kind: 'release', label: 'Sortie', target: release, caption: 'Film à venir' }
  }
  return null
}
