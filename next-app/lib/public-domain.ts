/**
 * Domaine public (« libre de droits ») : règle partagée par la fiche média (pastille) et les
 * filtres de recherche (borne de date envoyée à TMDB).
 *
 * TMDB n'expose aucun champ de droits. Deux signaux exploitables :
 *  1. les mots-clés TMDB (« public domain ») quand ils sont renseignés ;
 *  2. la règle américaine : une œuvre publiée il y a plus de 95 ans tombe dans le domaine
 *     public le 1er janvier suivant (publication en N -> domaine public au 1er janvier N+96).
 *
 * La règle européenne (70 ans après la mort du dernier auteur) n'est pas calculable depuis
 * TMDB : les libellés précisent donc la juridiction au lieu d'affirmer un domaine public mondial.
 */

/** Durée du droit d'auteur américain pour une œuvre publiée (années depuis la publication) */
export const US_COPYRIGHT_TERM_YEARS = 95

/**
 * Mots-clés TMDB (en minuscules) qui signalent explicitement une œuvre libre de droits.
 * Correspondance exacte : « public domain character » désigne un personnage libre de droits,
 * pas le film lui-même.
 */
export const PUBLIC_DOMAIN_KEYWORDS = [
  'public domain',
  'domaine public',
  'libre de droits',
  'libre de droit',
]

/** `today` : AAAA-MM-JJ. Dernière année de publication déjà dans le domaine public. */
export function publicDomainYearLimit(today: string): number | null {
  const currentYear = Number(String(today).slice(0, 4))
  if (!Number.isInteger(currentYear)) return null
  return currentYear - US_COPYRIGHT_TERM_YEARS - 1
}

/** Borne haute de publication, au format TMDB « AAAA-MM-JJ », pour ne garder que le domaine public */
export function publicDomainDateLimit(today: string): string | null {
  const year = publicDomainYearLimit(today)
  return year === null ? null : `${year}-12-31`
}

/** Une œuvre publiée cette année-là est-elle dans le domaine public (règle américaine) ? */
export function isPublicDomainYear(year: number, today: string): boolean {
  const limit = publicDomainYearLimit(today)
  return limit !== null && Number.isInteger(year) && year <= limit
}

/** Mot-clé TMDB signalant explicitement le domaine public */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasPublicDomainKeyword(details: any): boolean {
  const keywords: { name?: string }[] =
    details?.keywords?.keywords || details?.keywords?.results || []
  return keywords.some((keyword) => {
    const name = keyword?.name?.trim().toLowerCase()
    return Boolean(name) && PUBLIC_DOMAIN_KEYWORDS.includes(name!)
  })
}
