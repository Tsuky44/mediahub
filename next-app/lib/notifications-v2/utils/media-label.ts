/**
 * media-label.ts
 *
 * Mise en forme des saisons et du titre affichable. Source unique pour le
 * renderer de templates, les notifications internes et les cartes push, afin
 * que « Saisons 1 à 3 » s'écrive partout pareil.
 *
 * Règle importante : `MediaInfo.title` doit rester le titre NU du média. Les
 * sources ne doivent pas y coller « - Saison 2 » : c'est le template (ou
 * `displayTitle()` pour les surfaces sans template) qui compose. Sinon
 * `{title}` devient impossible à utiliser seul et `{seasonLabel}` reste vide.
 */

import type { MediaInfo } from '../types'

type SeasonSource = Pick<MediaInfo, 'seasonNumber' | 'seasons'>

/** Saisons normalisées : triées, dédupliquées, numériques. */
function normalizeSeasons(media: SeasonSource | undefined): number[] {
  if (!media) return []
  if (media.seasonNumber != null) return [Number(media.seasonNumber)]

  const raw = media.seasons
  if (!Array.isArray(raw)) return []

  const nums = raw.map(Number).filter((n) => Number.isFinite(n))
  return [...new Set(nums)].sort((a, b) => a - b)
}

function isContiguous(sorted: number[]): boolean {
  return sorted.every((s, i) => i === 0 || s === sorted[i - 1] + 1)
}

/** « Saison 1 » · « Saisons 1 à 3 » · « Saisons 1, 4 » · '' */
export function formatSeasonLabel(media: SeasonSource | undefined): string {
  const sorted = normalizeSeasons(media)
  if (sorted.length === 0) return ''
  if (sorted.length === 1) return `Saison ${sorted[0]}`
  return isContiguous(sorted)
    ? `Saisons ${sorted[0]} à ${sorted[sorted.length - 1]}`
    : `Saisons ${sorted.join(', ')}`
}

/** « S01 » · « S01-S03 » · « S01,S04 » · '' */
export function formatSeasonCode(media: SeasonSource | undefined): string {
  const sorted = normalizeSeasons(media)
  if (sorted.length === 0) return ''

  const pad = (n: number) => `S${String(n).padStart(2, '0')}`
  if (sorted.length === 1) return pad(sorted[0])
  return isContiguous(sorted)
    ? `${pad(sorted[0])}-${pad(sorted[sorted.length - 1])}`
    : sorted.map(pad).join(',')
}

/**
 * Titre composé pour les surfaces qui n'ont pas de template : notifications
 * internes de l'application, titre des cartes push.
 * Ex : « The Last of Us - Saisons 1 à 2 ».
 */
export function displayTitle(media: Pick<MediaInfo, 'title' | 'seasonNumber' | 'seasons'>): string {
  const title = String(media?.title ?? '').trim()
  const label = formatSeasonLabel(media)
  if (!label) return title
  if (!title) return label
  return `${title} - ${label}`
}
