/** Formate un nombre d'octets en representation lisible (`1.23 MB`). */
export function formatBytes(bytes: number, decimals = 2): string {
    if (!bytes) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Formate une date de dernière lecture en temps relatif court en français
 * (`il y a 3 jours`, `il y a 2 mois`...). Retourne `Jamais` si absente.
 */
export function formatLastPlayed(date?: string | null): string {
    if (!date) return 'Jamais'
    const then = new Date(date).getTime()
    if (isNaN(then)) return 'Jamais'

    const seconds = Math.floor((Date.now() - then) / 1000)
    if (seconds < 60) return "à l'instant"

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `il y a ${minutes} min`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `il y a ${hours} h`

    const days = Math.floor(hours / 24)
    if (days === 1) return 'hier'
    if (days < 30) return `il y a ${days} jours`

    const months = Math.floor(days / 30)
    if (months < 12) return `il y a ${months} mois`

    const years = Math.floor(days / 365)
    return `il y a ${years} an${years > 1 ? 's' : ''}`
}
