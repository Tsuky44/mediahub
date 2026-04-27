import type {
  MediaType,
  NormalizedCastMember,
  NormalizedCredits,
  NormalizedCrewMember,
} from '../_types/media-page'

/**
 * TMDB renvoie `aggregate_credits` pour les series (avec roles[] / jobs[])
 * et `credits` pour les films. On normalise vers une structure unique
 * (character / job en string concatenee).
 */
export function normalizeCredits(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any,
  mediaType: MediaType
): NormalizedCredits {
  const rawCredits =
    mediaType === 'tv'
      ? details.aggregate_credits || { cast: [], crew: [] }
      : details.credits || { cast: [], crew: [] }

  const cast: NormalizedCastMember[] = (rawCredits.cast || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => ({
      ...c,
      character:
        (mediaType === 'tv'
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            c.roles?.map((r: any) => r.character).join(' / ') || c.character
          : c.character) ?? '',
    })
  )

  const crew: NormalizedCrewMember[] = (rawCredits.crew || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => ({
      ...c,
      job:
        (mediaType === 'tv'
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            c.jobs?.map((j: any) => j.job).join(' / ') || c.job
          : c.job) ?? '',
    })
  )

  return { cast, crew }
}
