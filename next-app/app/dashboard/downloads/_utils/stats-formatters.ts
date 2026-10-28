/**
 * Formatters specifiques aux statistiques globales qBittorrent.
 * Different de torrent-formatters.ts par les fallbacks vides ('0 o' au lieu de '0 Go')
 * et la precision (2 decimales pour les tailles, 1 pour les vitesses).
 */

export function formatStatsSpeed(bytes: number): string {
    if (bytes === 0) return '0 o/s'
    const k = 1024
    const sizes = ['o/s', 'Ko/s', 'Mo/s', 'Go/s']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function formatStatsSize(bytes: number): string {
    if (bytes === 0) return '0 o'
    const k = 1024
    const sizes = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatRatio(ratio: number): string {
    return ratio.toFixed(2)
}
