/**
 * Libellés en français pour la fiche média (statut TMDB, langue, pays, classification d'âge,
 * dates). Les payloads TMDB restent en `any` (voir _types/media-page.ts).
 */

const STATUS_FR: Record<string, string> = {
  'Returning Series': 'Série en cours',
  Ended: 'Série terminée',
  Canceled: 'Série annulée',
  'In Production': 'En production',
  Planned: 'Prévue',
  Pilot: 'Pilote',
  Released: 'Sorti',
  'Post Production': 'En post-production',
  Rumored: 'Annoncé',
}

export function statusLabel(status?: string): string | undefined {
  if (!status) return undefined
  return STATUS_FR[status] ?? status
}

function displayName(type: 'language' | 'region', code?: string): string | undefined {
  if (!code) return undefined
  try {
    const name = new Intl.DisplayNames('fr', { type }).of(type === 'region' ? code.toUpperCase() : code)
    if (!name || name === code) return code.toUpperCase()
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return code.toUpperCase()
  }
}

export const languageName = (code?: string) => displayName('language', code)
export const countryName = (code?: string) => displayName('region', code)

export interface AgeRating {
  /** Court, pour la pastille de l'en-tête : « -12 », « TV-14 » */
  short: string
  /** En clair, pour le cartel : « 12 ans et plus », « TV-14 » */
  long: string
}

function formatRating(rating: string, country: string): AgeRating {
  if (country === 'FR') {
    if (/^\d+$/.test(rating)) return { short: `-${rating}`, long: `${rating} ans et plus` }
    if (rating.toUpperCase() === 'TP' || rating.toUpperCase() === 'U') return { short: 'TP', long: 'Tous publics' }
  }
  return { short: rating, long: rating }
}

/** Classification d'âge : France d'abord, sinon États-Unis (content_ratings / release_dates) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ageRating(details: any, mediaType: 'movie' | 'tv'): AgeRating | undefined {
  for (const country of ['FR', 'US']) {
    if (mediaType === 'tv') {
      const rating = details.content_ratings?.results?.find(
        (r: { iso_3166_1?: string; rating?: string }) => r.iso_3166_1 === country && r.rating
      )?.rating
      if (rating) return formatRating(rating, country)
    } else {
      const dates = details.release_dates?.results?.find((r: { iso_3166_1?: string }) => r.iso_3166_1 === country)
      const rating = dates?.release_dates?.find((d: { certification?: string }) => d.certification)?.certification
      if (rating) return formatRating(rating, country)
    }
  }
  return undefined
}

/** Date TMDB « AAAA-MM-JJ » lue en UTC : même rendu côté serveur et navigateur */
export function parseDay(day?: string | null): Date | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}/.test(day)) return null
  const [y, m, d] = day.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function longDate(day?: string | null): string | undefined {
  const date = parseDay(day)
  if (!date) return undefined
  return date.toLocaleDateString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Durée lisible : « 43 min », « 2 h 05 » */
export function runtimeLabel(minutes?: number): string | undefined {
  if (!minutes || minutes <= 0) return undefined
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/** Montant en dollars, arrondi : « 63 M$ », « 1,2 Md$ » */
export function moneyLabel(amount?: number): string | undefined {
  if (!amount || amount <= 0) return undefined
  if (amount >= 1e9) return `${(amount / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Md$`
  if (amount >= 1e6) return `${Math.round(amount / 1e6).toLocaleString('fr-FR')} M$`
  return `${amount.toLocaleString('fr-FR')} $`
}

/** Liste lisible : « A, B et C » */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}
