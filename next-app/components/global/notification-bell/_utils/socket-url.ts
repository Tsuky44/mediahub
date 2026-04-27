/**
 * Resolve the websocket URL used to connect to the realtime tracker.
 *
 * Resolution rules (preserved from the original component):
 * - If `NEXT_PUBLIC_TRACKER_WS_URL` is set, use it as-is.
 * - In development, fall back to `${http|https}://${host}:3005`, matching
 *   the local docker-compose port for the tracker service.
 * - In production, return `undefined` so the socket.io client uses the
 *   relative path and lets Next.js rewrites handle proxying.
 *
 * Must only be called from the browser (reads `window.location`).
 */
export function resolveTrackerWsUrl(): string | undefined {
    const envUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL
    if (envUrl) return envUrl

    if (process.env.NODE_ENV === 'development') {
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
        return `${protocol}://${window.location.hostname}:3005`
    }

    return undefined
}
