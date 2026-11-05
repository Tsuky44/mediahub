/**
 * Pastille « Libre de droits » de la fiche média : habillage en français de la règle partagée
 * de `lib/public-domain.ts` (mot-clé TMDB, sinon durée du droit d'auteur américain).
 */

import {
  US_COPYRIGHT_TERM_YEARS,
  hasPublicDomainKeyword,
  isPublicDomainYear,
} from '@/lib/public-domain'

export interface PublicDomainInfo {
  /** Pastille de l'en-tête */
  label: string
  /** En clair : infobulle de l'en-tête et ligne du cartel */
  detail: string
  /** Année de publication retenue */
  year: number | null
  /** Origine de la déduction : mot-clé TMDB ou calcul sur l'année de publication */
  source: 'keyword' | 'term'
}

/** Année de publication la plus ancienne connue (sorties pays comprises) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function earliestYear(details: any, mediaType: 'movie' | 'tv'): number | null {
  const days: string[] = []
  if (mediaType === 'movie') {
    for (const entry of details.release_dates?.results ?? []) {
      for (const release of entry.release_dates ?? []) {
        if (release?.release_date) days.push(String(release.release_date))
      }
    }
    if (details.release_date) days.push(String(details.release_date))
  } else if (details.first_air_date) {
    days.push(String(details.first_air_date))
  }

  const years = days
    .map((day) => Number(day.slice(0, 4)))
    .filter((year) => Number.isInteger(year) && year > 1800)
  return years.length > 0 ? Math.min(...years) : null
}

/**
 * `today` : AAAA-MM-JJ (même valeur que le compte à rebours, pour un rendu serveur stable).
 * Renvoie null quand rien ne permet d'affirmer que l'œuvre est libre de droits.
 */
export function getPublicDomain(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any,
  mediaType: 'movie' | 'tv',
  today: string
): PublicDomainInfo | null {
  const year = earliestYear(details, mediaType)

  if (hasPublicDomainKeyword(details)) {
    return {
      label: 'Libre de droits',
      detail: year
        ? `Œuvre signalée dans le domaine public (publiée en ${year})`
        : 'Œuvre signalée dans le domaine public',
      year,
      source: 'keyword',
    }
  }

  if (year === null || !isPublicDomainYear(year, today)) return null

  return {
    label: 'Libre de droits',
    detail: `Domaine public aux États-Unis : publiée en ${year}, soit plus de ${US_COPYRIGHT_TERM_YEARS} ans`,
    year,
    source: 'term',
  }
}
