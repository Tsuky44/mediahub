import { ACTION_LABELS } from '../_constants/activity-logs'
import type { ActivityLog, ActivityLogDetails } from '../_types/activity-logs'
import { formatDisplayEmail, getMediaAccountLabel } from '@/lib/auth/user-email'

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
 * Resolve the display name for the user who performed the action.
 */
export function getLogUserDisplayName(log: ActivityLog, details: ActivityLogDetails): string {
    if (log.user?.name) return log.user.name
    const displayEmail = formatDisplayEmail(log.user?.email)
    if (displayEmail) return displayEmail

    const userId = log.userId
    if (userId && userId > 0) return `Utilisateur supprimé (#${userId})`

    if (typeof details.email === 'string' && details.email && !details.email.endsWith('@local')) {
        return details.email
    }
    if (typeof details.firstName === 'string' && details.firstName) return details.firstName

    return 'Système'
}

/**
 * Sous-titre sous le nom : email réel ou type de compte (Emby/Jellyfin).
 */
export function getLogUserSubtitle(log: ActivityLog, details: ActivityLogDetails): string | null {
    const displayEmail = formatDisplayEmail(log.user?.email)
    if (displayEmail && displayEmail !== log.user?.name) return displayEmail

    const mediaLabel = getMediaAccountLabel(log.user?.email)
    if (mediaLabel) return mediaLabel

    if (!log.user && typeof details.email === 'string' && details.email) {
        return formatDisplayEmail(details.email) ?? details.email
    }

    return null
}

/**
 * Libellé pour les filtres / listes déroulantes.
 */
export function formatLogUserOptionLabel(name: string | null, email: string | null): string {
    const label = name || formatDisplayEmail(email) || 'Utilisateur'
    const subtitle = formatDisplayEmail(email) ?? getMediaAccountLabel(email)
    if (subtitle && subtitle !== label) return `${label} (${subtitle})`
    return label
}

/**
 * Normalize loopback / IPv4-mapped IPv6 addresses for display.
 */
export function formatIpAddress(ip: string | null | undefined): string {
    if (!ip || ip === 'unknown' || ip === 'historique') return ip || '-'
    if (ip === '::1') return 'localhost'
    if (ip.startsWith('::ffff:')) return ip.slice(7)
    return ip
}

/**
 * Extract a short browser / OS label from a raw user-agent string.
 */
export function formatUserAgent(userAgent: string | null | undefined): string | null {
    if (!userAgent || userAgent === 'unknown' || userAgent === 'system') return null

    const ua = userAgent.toLowerCase()

    let browser = 'Navigateur'
    if (ua.includes('edg/')) browser = 'Edge'
    else if (ua.includes('chrome/') && !ua.includes('edg/')) browser = 'Chrome'
    else if (ua.includes('firefox/')) browser = 'Firefox'
    else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Safari'
    else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera'

    let os = ''
    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
    else if (ua.includes('mac os')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'

    return os ? `${browser} · ${os}` : browser
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
    if (typeof rest.type === 'string') parts.push(`Type: ${rest.type}`)
    if (typeof rest.title === 'string') parts.push(`Titre: "${rest.title}"`)
    if (typeof rest.mediaType === 'string') parts.push(`Média: ${rest.mediaType}`)
    if (rest.tmdbId !== undefined && rest.tmdbId !== null) parts.push(`TMDB: ${String(rest.tmdbId)}`)
    if (rest.season !== undefined && rest.season !== null) parts.push(`Saison: ${String(rest.season)}`)
    if (typeof rest.provider === 'string') parts.push(`Fournisseur: ${rest.provider}`)
    if (typeof rest.name === 'string') parts.push(`Nom: ${rest.name}`)
    if (typeof rest.email === 'string') parts.push(`Email: ${rest.email}`)
    if (typeof rest.firstName === 'string') parts.push(`Prénom: ${rest.firstName}`)
    if (typeof rest.inviter === 'string') parts.push(`Invité par: ${rest.inviter}`)
    if (typeof rest.description === 'string' && rest.description) parts.push(`Description: ${rest.description}`)
    if (typeof rest.count === 'number') parts.push(`Nombre: ${rest.count}`)
    if (rest.targetUserId !== undefined && rest.targetUserId !== null) {
        parts.push(`Utilisateur cible: #${String(rest.targetUserId)}`)
    }
    if (typeof rest.groupId === 'string') parts.push(`Groupe: ${rest.groupId}`)
    if (typeof rest.action === 'string' && rest.action !== log.action) {
        parts.push(`Opération: ${rest.action}`)
    }

    const isRedundantUserEntity =
        entity === 'User' &&
        entityId &&
        log.userId &&
        String(entityId) === String(log.userId)

    if (entity && entity !== 'System' && !isRedundantUserEntity) {
        parts.push(`Entité: ${entity}${entityId ? ` (${entityId})` : ''}`)
    }

    if (parts.length === 0 && Object.keys(rest).length > 0) {
        return JSON.stringify(rest)
    }

    return parts.join(' · ')
}
