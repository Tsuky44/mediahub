import type { SorraaFoundRelease, SorraaMedia, SorraaRejection, SorraaUnit } from '@/lib/services/sorraa'

/**
 * La recherche interactive vue de sorraa : retrouver l'unite visee et dire en
 * francais ce que son moteur a juge de chaque release. Fonctions pures, le
 * reseau est dans `interactive-search.ts`.
 */

export interface ReleaseUnitTarget {
  mediaType: 'movie' | 'tv'
  seasonNumber?: number
  episodeNumber?: number
}

/** Le film, la saison ou l'episode d'un titre de sorraa ; undefined s'il n'existe pas. */
export function findUnit(media: Pick<SorraaMedia, 'units'>, target: ReleaseUnitTarget): SorraaUnit | undefined {
  if (target.mediaType === 'movie') return media.units.find((u) => u.kind === 'movie')
  if (target.seasonNumber === undefined) return undefined
  if (target.episodeNumber === undefined) {
    return media.units.find((u) => u.kind === 'season' && u.seasonNumber === target.seasonNumber)
  }
  return media.units.find(
    (u) => u.kind === 'episode' && u.seasonNumber === target.seasonNumber && u.episodeNumber === target.episodeNumber,
  )
}

const mb = (value: number | undefined) => (value === undefined ? '?' : String(Math.round(value)))

/** Une raison de refus de sorraa, en francais, prete a afficher. */
export function describeRejection(r: SorraaRejection): string {
  switch (r.reason) {
    case 'quality_not_accepted': return r.quality ? `Qualité non acceptée par le profil (${r.quality})` : 'Qualité non acceptée par le profil'
    case 'upgrades_not_allowed': return 'Le profil interdit de remplacer l’existant'
    case 'cutoff_met': return 'La qualité visée est déjà atteinte'
    case 'not_an_upgrade': return 'Pas meilleure que l’existant'
    case 'language_not_wanted': return 'Langue non souhaitée'
    case 'multilingual_lost': return 'Moins de pistes audio que l’existant'
    case 'language_required': return 'La langue requise est absente'
    case 'format_score_too_low': return `Score de formats trop bas (${r.score ?? '?'} pour ${r.minimum ?? '?'} demandé)`
    case 'wrong_title': return 'Autre titre'
    case 'wrong_year': return 'Autre année'
    case 'wrong_unit': return 'Ne contient pas la saison ou l’épisode voulu'
    case 'blocklisted': return 'Déjà échouée pour ce titre (liste noire)'
    case 'size_too_small': return `Trop petite (${mb(r.actual)} Mo/min, ${mb(r.limit)} attendus)`
    case 'size_too_large': return `Trop grosse (${mb(r.actual)} Mo/min, ${mb(r.limit)} au plus)`
    case 'undersized_for_quality': return 'Trop petite pour la qualité annoncée'
    case 'seeders_too_low': return `Pas assez de seeders (${mb(r.actual)} pour ${mb(r.limit)} demandés)`
    case 'pack_not_enough_upgrades': return 'Le pack améliore trop peu d’épisodes'
    case 'upgrade_paused': return 'Remplacement en pause après un échec'
    default: return r.reason
  }
}

/** Les jours depuis la publication, comme le champ `age` de Prowlarr ; 0 quand l'indexeur ne la donne pas. */
export function ageInDays(publishedAt: string | undefined, now = Date.now()): number {
  const published = publishedAt ? Date.parse(publishedAt) : Number.NaN
  return Number.isNaN(published) ? 0 : Math.max(0, (now - published) / 86_400_000)
}

/** Le format de la liste de l'API du lecteur : `id` est le jeton de sorraa, sans adresse de telechargement. */
export function releaseFromSorraa(found: SorraaFoundRelease, now = Date.now()) {
  return {
    id: found.id,
    guid: found.id,
    title: found.name,
    size: found.size,
    indexer: found.indexer,
    indexerId: found.indexerId,
    publishDate: found.publishedAt ?? '',
    seeders: found.seeders,
    leechers: found.leechers,
    age: ageInDays(found.publishedAt, now),
    protocol: found.protocol,
    customFormatScore: found.decision.formatScore,
    accepted: found.decision.accepted,
    rejections: found.decision.rejections.map(describeRejection),
  }
}
