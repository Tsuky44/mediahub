/**
 * Ce que devient une demande de serie quand une saison part : la ligne garde ses autres saisons,
 * et disparait si c'etait la seule. Une demande sans saisons listees vise toute la serie : elle
 * reste, la serie n'est pas supprimee.
 */
export function pruneSeasonFromRequest(metadata: string | null, season: number): { keep: boolean; metadata: string | null } {
  if (!metadata) return { keep: true, metadata }
  let parsed: { seasons?: Array<number | { seasonNumber?: number }> } & Record<string, unknown>
  try {
    parsed = JSON.parse(metadata)
  } catch {
    return { keep: true, metadata }
  }
  if (!Array.isArray(parsed.seasons) || parsed.seasons.length === 0) return { keep: true, metadata }
  const numberOf = (s: number | { seasonNumber?: number }) => (typeof s === 'number' ? s : s.seasonNumber)
  const left = parsed.seasons.filter(s => numberOf(s) !== season)
  if (left.length === parsed.seasons.length) return { keep: true, metadata }
  if (left.length === 0) return { keep: false, metadata }
  return { keep: true, metadata: JSON.stringify({ ...parsed, seasons: left }) }
}

