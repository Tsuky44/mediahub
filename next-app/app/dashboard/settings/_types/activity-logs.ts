/**
 * Shape of a user option in the filters dropdown. Matches the
 * `select: { id, name, email }` projection from getLogUsers().
 */
export interface ActivityLogUserOption {
    id: number
    name: string | null
    email: string | null
}

/**
 * User slice embedded on each log row via the Prisma `include`.
 */
export interface ActivityLogUser {
    id: number
    name: string | null
    email: string | null
    image: string | null
}

/**
 * Single activity log entry as returned by getActivityLogs().
 * `details` is a raw JSON string that must be decoded via parseLogDetails().
 */
export interface ActivityLog {
    id: number
    userId?: number | null
    action: string
    details: string | null
    entity?: string | null
    entityId?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: string | Date
    user?: ActivityLogUser | null
}

/**
 * Decoded payload of the `details` JSON column. All fields are optional and
 * only a known subset is projected to the UI; the rest is preserved for the
 * fallback JSON.stringify branch.
 */
export interface ActivityLogDetails {
    ipAddress?: string | null
    userAgent?: string
    entity?: string
    entityId?: string
    query?: string
    title?: string
    mediaType?: string
    season?: number | string
    provider?: string
    type?: string
    tmdbId?: string | number
    name?: string
    email?: string
    firstName?: string
    inviter?: string
    description?: string
    count?: number
    targetUserId?: number
    groupId?: string
    action?: string
    [key: string]: unknown
}

export interface ActivityLogsFilters {
    action: string
    userId: string
}

export interface ActivityLogsPage {
    logs: ActivityLog[]
    total: number
}
