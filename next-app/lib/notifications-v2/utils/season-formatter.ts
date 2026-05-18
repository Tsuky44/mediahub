/**
 * Formate une liste de numéros de saison en chaîne lisible.
 *
 * Regroupe les plages consécutives :
 *   [1]         → "S1"
 *   [1, 2]      → "S1-2"
 *   [1, 2, 3]   → "S1-3"
 *   [1, 3]      → "S1, 3"
 *   [1, 2, 4, 5] → "S1-2, 4-5"
 */
export function formatSeasonList(seasons: number[]): string {
  if (seasons.length === 0) return ''

  const sorted = [...seasons].sort((a, b) => a - b)
  if (sorted.length === 1) return `S${sorted[0]}`

  const ranges: Array<{ start: number; end: number }> = []
  let currentStart = sorted[0]
  let currentEnd = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === currentEnd + 1) {
      currentEnd = sorted[i]
    } else {
      ranges.push({ start: currentStart, end: currentEnd })
      currentStart = sorted[i]
      currentEnd = sorted[i]
    }
  }
  ranges.push({ start: currentStart, end: currentEnd })

  return ranges.map((r) => (r.start === r.end ? `S${r.start}` : `S${r.start}-${r.end}`)).join(', ')
}
