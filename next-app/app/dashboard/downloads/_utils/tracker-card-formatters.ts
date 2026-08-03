/**
 * Formatters et labels specifiques aux cartes de tracker (TrackerStatsCard).
 * `formatStatsSize` est deja fourni par stats-formatters.ts.
 */

export function getBonusLabel(trackerName: string): string {
  const name = (trackerName || '').toLowerCase()
  if (
    name.includes('la cale') ||
    name.includes('lacale') ||
    name.includes('la-cale')
  )
    return 'Doublons'
  if (name.includes('torr9') || name.includes('tor9')) return 'Jetons'
  if (name.includes('abnormal') || name.includes('abn')) return 'Réputation'
  if (name.includes('gemini')) return 'Bonus'
  if (name.includes('tr4ker') || name.includes('traker')) return 'Crédits'
  return 'Points'
}

export function formatBonus(value: number): string {
  if (!value) return '0'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'k'
  return value.toLocaleString('fr-FR')
}

export function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `il y a ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm > 0 ? `il y a ${h}h ${rm}min` : `il y a ${h}h`
}
