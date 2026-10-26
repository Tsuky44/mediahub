import type { StorageDateFilter, StorageDateFilterMode, StorageFilters } from '../_types/storage'

// Filtres du gestionnaire de stockage, partagés entre le client (URL, UI) et
// l'API (lecture des paramètres, application sur toute la bibliothèque).

export const DEFAULT_FILTER_MONTHS = 6
const MAX_FILTER_MONTHS = 240
const DATE_FILTER_MODES: StorageDateFilterMode[] = ['any', 'never', 'olderThan', 'olderOrNever', 'within']

const ANY: StorageDateFilter = { mode: 'any', months: DEFAULT_FILTER_MONTHS }

export const DEFAULT_STORAGE_FILTERS: StorageFilters = {
    watched: ANY,
    requested: ANY,
    added: ANY,
    minSizeGb: 0,
}

export function countActiveFilters(filters: StorageFilters): number {
    return [filters.watched, filters.requested, filters.added].filter(f => f.mode !== 'any').length
        + (filters.minSizeGb > 0 ? 1 : 0)
}

/** `never`, `olderThan.6`… ; null quand le filtre est inactif. */
export function serializeDateFilter(filter: StorageDateFilter): string | null {
    if (filter.mode === 'any') return null
    return filter.mode === 'never' ? 'never' : `${filter.mode}.${filter.months}`
}

export function parseDateFilter(raw: string | null | undefined): StorageDateFilter {
    const [mode, monthsRaw] = (raw ?? '').split('.')
    if (mode === 'any' || !DATE_FILTER_MODES.includes(mode as StorageDateFilterMode)) return ANY
    const months = Math.min(MAX_FILTER_MONTHS, Math.max(1, parseInt(monthsRaw, 10) || DEFAULT_FILTER_MONTHS))
    return { mode: mode as StorageDateFilterMode, months }
}

/** Clé stable (query key React Query) : identique pour deux jeux de filtres équivalents. */
export function filtersKey(filters: StorageFilters): string {
    return [
        serializeDateFilter(filters.watched) ?? '',
        serializeDateFilter(filters.requested) ?? '',
        serializeDateFilter(filters.added) ?? '',
        filters.minSizeGb || '',
    ].join('|')
}

export function appendFilterParams(params: URLSearchParams, filters: StorageFilters): void {
    const entries: Array<[string, string | null]> = [
        ['watched', serializeDateFilter(filters.watched)],
        ['requested', serializeDateFilter(filters.requested)],
        ['added', serializeDateFilter(filters.added)],
        ['minSizeGb', filters.minSizeGb > 0 ? String(filters.minSizeGb) : null],
    ]
    for (const [key, value] of entries) {
        if (value) params.set(key, value)
    }
}

export function parseFilterParams(params: URLSearchParams): StorageFilters {
    const minSizeGb = parseFloat(params.get('minSizeGb') ?? '')
    return {
        watched: parseDateFilter(params.get('watched')),
        requested: parseDateFilter(params.get('requested')),
        added: parseDateFilter(params.get('added')),
        minSizeGb: Number.isFinite(minSizeGb) && minSizeGb > 0 ? minSizeGb : 0,
    }
}

/** Instant situé `months` mois calendaires avant `now`. */
function monthsAgo(months: number, now: number): number {
    const d = new Date(now)
    d.setMonth(d.getMonth() - months)
    return d.getTime()
}

/** `dateMs` : timestamp de la date testée, null si absente. */
export function matchesDateFilter(dateMs: number | null, filter: StorageDateFilter, now = Date.now()): boolean {
    if (filter.mode === 'any') return true
    if (filter.mode === 'never') return dateMs == null
    const cutoff = monthsAgo(filter.months, now)
    switch (filter.mode) {
        case 'olderThan': return dateMs != null && dateMs < cutoff
        case 'olderOrNever': return dateMs == null || dateMs < cutoff
        case 'within': return dateMs != null && dateMs >= cutoff
    }
}
