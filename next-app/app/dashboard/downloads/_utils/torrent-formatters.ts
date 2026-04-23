/**
 * Torrent-related pure formatting utilities (no React, no side-effects).
 * Extracted from TorrentManager.tsx during the Phase 5.1 refactor.
 */

export const formatSpeed = (bytes: number): string => {
    if (bytes === 0) return '0 Ko/s'
    const k = 1024
    const sizes = ['o/s', 'Ko/s', 'Mo/s', 'Go/s']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Go'
    const k = 1024
    const sizes = ['o', 'Ko', 'Mo', 'Go', 'To']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
    })
}

export const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export const formatEta = (seconds: number): string => {
    if (seconds === 8640000 || seconds === -1) return '∞'
    if (seconds <= 0) return 'Terminé'

    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)

    if (d > 0) return `${d}j ${h}h`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m ${seconds % 60}s`
}

export const getTrackerName = (tracker: string): string => {
    if (!tracker) return 'TORRENT'
    try {
        const url = new URL(tracker)
        const hostname = url.hostname.toLowerCase()
        if (hostname.includes('yggtorrent') || hostname.includes('ygg')) return 'YGG'
        if (hostname.includes('shareisland') || hostname.includes('share')) return 'SHARE'
        if (hostname.includes('torrent-syndikat') || hostname.includes('tos')) return 'TOS'
        if (hostname.includes('ethor')) return 'ETHOR'

        // Fallback to domain name without TLD
        const parts = hostname.split('.')
        return parts.length > 1 ? parts[parts.length - 2].toUpperCase() : hostname.toUpperCase()
    } catch (e) {
        return 'TORRENT'
    }
}
