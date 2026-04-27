import type {
  MediaDerivedMeta,
  NormalizedCredits,
} from '../_types/media-page'

/**
 * Derive director / writers / editors / keywords / watchProviders depuis
 * les credits normalises et la payload TMDB brute.
 */
export function deriveMediaMeta(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any,
  credits: NormalizedCredits
): MediaDerivedMeta {
  const director = credits.crew?.find(
    (c) => c.job === 'Director' || c.job === 'Executive Producer'
  )?.name

  const writers = (credits.crew || [])
    .filter((c) => ['Screenplay', 'Writer', 'Story'].includes(c.job ?? ''))
    .slice(0, 3)
    .map((c) => c.name)
    .filter((n): n is string => Boolean(n))

  const editors = (credits.crew || [])
    .filter((c) => c.job === 'Editor')
    .slice(0, 2)
    .map((c) => c.name)
    .filter((n): n is string => Boolean(n))

  const watchProviders = (
    details['watch/providers']?.results?.FR?.flatrate || []
  ).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => !p.provider_name.toLowerCase().includes('ads')
  )

  const keywords = (
    details.keywords?.keywords ||
    details.keywords?.results ||
    []
  ).slice(0, 15)

  return { director, writers, editors, keywords, watchProviders }
}
