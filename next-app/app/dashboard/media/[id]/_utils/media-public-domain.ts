/**
 * Domaine public (« libre de droits ») pour la fiche média.
 *
 * TMDB n'expose aucun champ de droits. Deux signaux exploitables :
 *  1. les mots-clés TMDB (« public domain ») quand ils sont renseignés ;
 *  2. la règle américaine : une œuvre publiée il y a plus de 95 ans tombe dans le domaine
 *     public le 1er janvier suivant (publication en N -> domaine public au 1er janvier N+96).
 *
 * La règle européenne (70 ans après la mort du dernier auteur) n'est pas calculable depuis
 * TMDB : le libellé précise donc la juridiction au lieu d'affirmer un domaine public mondial.
 */

/** Durée du droit d'auteur américain pour une œuvre publiée (années depuis la publication) */
const US_TERM_YEARS = 95

/**
 * Mots-clés TMDB (en minuscules) qui signalent explicitement une œuvre libre de droits.
 * Correspondance exacte : « public domain character » désigne un personnage libre de droits,
 * pas le film lui-même.
 */
const PD_KEYWORDS = ['public domain', 'domaine public', 'libre de droits', 'libre de droit']

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasPublicDomainKeyword(details: any): boolean {
  const keywords: { name?: string }[] =
    details.keywords?.keywords || details.keywords?.results || []
  return keywords.some((keyword) => {
    const name = keyword?.name?.trim().toLowerCase()
    return Boolean(name) && PD_KEYWORDS.includes(name!)
  })
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

  const currentYear = Number(today.slice(0, 4))
  if (!year || !Number.isInteger(currentYear)) return null
  // Publication en N : domaine public américain au 1er janvier N + 95 + 1
  if (currentYear < year + US_TERM_YEARS + 1) return null

  return {
    label: 'Libre de droits',
    detail: `Domaine public aux États-Unis : publiée en ${year}, soit plus de ${US_TERM_YEARS} ans`,
    year,
    source: 'term',
  }
}
