/**
 * groupRequests — fusionne les demandes de saisons créées dans le même batch.
 *
 * Règle : deux demandes TV sont regroupées sur une seule ligne si :
 *   - même tmdbId
 *   - même requester (email ou displayName)
 *   - créées dans un intervalle de 60 secondes (même appel requestAllSeasons)
 *
 * Les films ne sont jamais regroupés.
 * Les demandes faites à des moments différents restent sur des lignes séparées.
 */

const BATCH_WINDOW_MS = 60_000

export interface GroupableRequest {
  id: number | string
  type: string
  status: number
  createdAt?: string | number | Date | null
  media: {
    tmdbId?: string
    title: string
    posterPath?: string
    seasons?: number[]
    [key: string]: unknown
  }
  requestedBy: {
    displayName?: string
    email?: string
  }
  [key: string]: unknown
}

export interface GroupedRequest extends GroupableRequest {
  /** IDs de toutes les rows fusionnées (pour la suppression bulk) */
  groupedIds: (number | string)[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function groupRequests(items: any[]): GroupedRequest[] {
  return groupRequestsTyped(items as GroupableRequest[])
}

function groupRequestsTyped(items: GroupableRequest[]): GroupedRequest[] {
  const result: GroupedRequest[] = []
  const used = new Set<number | string>()

  for (let i = 0; i < items.length; i++) {
    const a = items[i]
    if (used.has(a.id)) continue

    // Films ou médias sans tmdbId → pas de grouping
    if (a.type !== 'tv' || !a.media?.tmdbId) {
      result.push({ ...a, groupedIds: [a.id] })
      used.add(a.id)
      continue
    }

    const group: GroupableRequest[] = [a]
    const aTime = toMs(a.createdAt)
    const aEmail = a.requestedBy?.email || a.requestedBy?.displayName || ''

    for (let j = i + 1; j < items.length; j++) {
      const b = items[j]
      if (used.has(b.id)) continue
      if (b.type !== 'tv') continue
      if (b.media?.tmdbId !== a.media?.tmdbId) continue

      const bEmail = b.requestedBy?.email || b.requestedBy?.displayName || ''
      if (aEmail && bEmail && aEmail !== bEmail) continue

      const bTime = toMs(b.createdAt)
      if (aTime !== null && bTime !== null && Math.abs(aTime - bTime) > BATCH_WINDOW_MS) continue

      group.push(b)
      used.add(b.id)
    }

    used.add(a.id)

    if (group.length === 1) {
      result.push({ ...a, groupedIds: [a.id] })
      continue
    }

    // Fusionner les saisons de toutes les rows du groupe
    const allSeasons = group
      .flatMap(r => r.media?.seasons ?? [])
      .filter((s): s is number => typeof s === 'number')

    const mergedSeasons = [...new Set(allSeasons)].sort((x, y) => x - y)

    // Utiliser le statut le plus avancé du groupe
    const mergedStatus = Math.max(...group.map(r => r.status ?? 0))

    result.push({
      ...a,
      status: mergedStatus,
      media: {
        ...a.media,
        seasons: mergedSeasons,
      },
      groupedIds: group.map(r => r.id),
    })
  }

  return result
}

function toMs(val: string | number | Date | null | undefined): number | null {
  if (val == null) return null
  if (val instanceof Date) return val.getTime()
  if (typeof val === 'number') return val
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.getTime()
}
