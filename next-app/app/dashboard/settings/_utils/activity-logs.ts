import { ACTION_LABELS } from '../_constants/activity-logs'
import type { ActivityLog, ActivityLogDetails } from '../_types/activity-logs'

/**
 * Safely parse the raw `details` JSON column into a structured object.
 * Returns an empty object on null input or parse failure.
 */
export function parseLogDetails(detailsStr: string | null | undefined): ActivityLogDetails {
    if (!detailsStr) return {}
    try {
        const parsed = JSON.parse(detailsStr) as unknown
        if (parsed && typeof parsed === 'object') {
            return parsed as ActivityLogDetails
        }
        return {}
    } catch {
        return {}
    }
}

/**
 * Pick a tailwind color pair for the action badge based on substring matching.
 * Matches the precedence order used by the original component.
 */
export function getActionColor(action: string | null | undefined): string {
    if (!action) return 'text-gray-400 bg-gray-400/10'
    if (action.includes('LOGIN')) return 'text-green-400 bg-green-400/10'
    if (action.includes('LOGOUT')) return 'text-orange-400 bg-orange-400/10'
    if (action.includes('REQUEST_APPROVE')) return 'text-emerald-400 bg-emerald-400/10'
    if (action.includes('REQUEST_REJECT')) return 'text-red-400 bg-red-400/10'
    if (action.includes('REQUEST_DELETE')) return 'text-rose-400 bg-rose-400/10'
    if (action.includes('REQUEST_CREATE')) return 'text-indigo-400 bg-indigo-400/10'
    if (action.includes('REQUEST')) return 'text-purple-400 bg-purple-400/10'
    if (action.includes('SEARCH')) return 'text-blue-400 bg-blue-400/10'
    if (action.includes('DELETE')) return 'text-red-400 bg-red-400/10'
    if (action.includes('SETTINGS')) return 'text-teal-400 bg-teal-400/10'
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-yellow-400 bg-yellow-400/10'
    if (action.includes('WATCH_LATER')) return 'text-pink-400 bg-pink-400/10'
    return 'text-gray-400 bg-gray-400/10'
}

/**
 * Resolve an action code to a localized label. Falls back to the raw code
 * when no mapping exists.
 */
export function getActionLabel(action: string | null | undefined): string {
    if (!action) return 'Inconnu'
    return ACTION_LABELS[action] ?? action
}

/**
 * Build a single-line human summary from the parsed details and the log row.
 * Top-level fields (entity, entityId) win over legacy details.entity /
 * details.entityId, preserving the original merge behavior.
 *
 * When no known field is present but raw leftovers remain, the function
 * falls back to stringifying the rest as-is.
 */
export function formatLogDetails(log: ActivityLog, details: ActivityLogDetails): string {
    const entity = log.entity || details.entity
    const entityId = log.entityId || details.entityId

    const {
        ipAddress: _ipAddress,
        userAgent: _userAgent,
        entity: _dEntity,
        entityId: _dEntityId,
        ...rest
    } = details

    const parts: string[] = []
    if (typeof rest.query === 'string') parts.push(`Requête: "${rest.query}"`)
    if (typeof rest.title === 'string') parts.push(`Titre: "${rest.title}"`)
    if (typeof rest.mediaType === 'string') parts.push(`Type: ${rest.mediaType}`)
    if (rest.season !== undefined && rest.season !== null) parts.push(`Saison: ${String(rest.season)}`)
    if (typeof rest.provider === 'string') parts.push(`Fournisseur: ${rest.provider}`)

    if (entity && entity !== 'System') {
        parts.push(`Entité: ${entity}${entityId ? ` (${entityId})` : ''}`)
    }

    // Fallback: dump remaining fields verbatim when nothing specific matched.
    if (parts.length === 0 && Object.keys(rest).length > 0) {
        return JSON.stringify(rest)
    }

    return parts.join(' | ')
}
