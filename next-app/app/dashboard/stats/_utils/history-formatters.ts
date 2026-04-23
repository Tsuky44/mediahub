/**
 * Formatters et transformations pour l'historique de visionnage.
 * Partages entre le composant RecentHistory et le hook useHistorySocket.
 */

/** Convertit une duree en secondes vers un format lisible (`45s`, `12m`, `1h30`). */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`
}

/**
 * Comparateur d'items d'historique.
 * Live items en premier, tries par startTime (oldest first).
 * Items non-live tries par ActivityDateInserted (newest first).
 */
export function compareHistoryItems(a: any, b: any): number {
    if (a.isLive && !b.isLive) return -1
    if (!a.isLive && b.isLive) return 1

    if (a.isLive && b.isLive) {
        const startA = new Date(a.startTime || a.startedAt || 0).getTime()
        const startB = new Date(b.startTime || b.startedAt || 0).getTime()
        return startA - startB // Oldest live session first
    }

    const dateA = new Date(a.ActivityDateInserted || a.DateCreated || a.endTime || a.startTime).getTime()
    const dateB = new Date(b.ActivityDateInserted || b.DateCreated || b.endTime || b.startTime).getTime()
    return dateB - dateA
}

/**
 * Variante du comparateur utilisee lors de la mise a jour initiale des sessions :
 * pour les live items, on met le plus recent en premier.
 */
export function compareHistoryItemsNewestLive(a: any, b: any): number {
    if (a.isLive && !b.isLive) return -1
    if (!a.isLive && b.isLive) return 1

    if (a.isLive && b.isLive) {
        const startA = new Date(a.startTime || a.startedAt || 0).getTime()
        const startB = new Date(b.startTime || b.startedAt || 0).getTime()
        return startB - startA // Newest first
    }

    const dateA = new Date(a.ActivityDateInserted || a.DateCreated || a.endTime || a.startTime).getTime()
    const dateB = new Date(b.ActivityDateInserted || b.DateCreated || b.endTime || b.startTime).getTime()
    return dateB - dateA
}

export interface ProcessedHistoryItem {
    displayName: string
    subName: string | null
    seasonIndex: number | undefined
    episodeIndex: number | undefined
    mediaInfo: Record<string, any>
    isSeries: boolean
    itemId: any
    date: Date
    duration: number
    isLive: boolean
    [key: string]: any
}

/**
 * Transforme un item brut d'historique en item pret a afficher :
 * - Determine le type (serie/film) et ajuste le titre ("Serie - S01E02 - Episode")
 * - Extrait imageItemId, date, duration
 */
export function processHistoryItem(item: any): ProcessedHistoryItem {
    const mediaInfo = typeof item.mediaInfo === 'string' ? JSON.parse(item.mediaInfo) : (item.mediaInfo || {})

    const itemType = item.itemType || item.ItemType || item.Type || (item.mediaType === 'tv' ? 'Episode' : 'Movie')
    const isSeries = itemType === 'Episode' || itemType === 'Series' || itemType === 'tv' || item.mediaType === 'tv' ||
        !!item.SeriesName || !!mediaInfo.seriesName

    let displayName: string = item.itemName || item.Name || item.NowPlayingItemName || 'Inconnu'
    let subName: string | null = null

    let extractedSeriesName: string | null = null
    if (isSeries) {
        if (displayName.includes(' : ')) extractedSeriesName = displayName.split(' : ')[0]
        else if (displayName.includes(' - s')) extractedSeriesName = displayName.split(' - s')[0]
        else if (displayName.includes(' - S')) extractedSeriesName = displayName.split(' - S')[0]
        else if (displayName.includes(' - ')) extractedSeriesName = displayName.split(' - ')[0]
    }

    const seriesName = item.seriesName || item.SeriesName || mediaInfo.seriesName || mediaInfo.SeriesName || extractedSeriesName
    const s = item.seasonIndex ?? item.ParentIndexNumber ?? mediaInfo.seasonIndex ?? mediaInfo.ParentIndexNumber
    const e = item.episodeIndex ?? item.IndexNumber ?? mediaInfo.episodeIndex ?? mediaInfo.IndexNumber

    if (isSeries) {
        let seString = ''
        if (s !== undefined && e !== undefined) {
            const seasonStr = s < 10 ? `0${s}` : s
            const episodeStr = e < 10 ? `0${e}` : e
            seString = `S${seasonStr}E${episodeStr}`
        }

        if (seriesName) {
            let episodeTitle = displayName

            if (episodeTitle.startsWith(seriesName + ' - ')) {
                episodeTitle = episodeTitle.substring(seriesName.length + 3)
            } else if (episodeTitle.startsWith(seriesName + ' : ')) {
                episodeTitle = episodeTitle.substring(seriesName.length + 3)
            } else if (episodeTitle === seriesName) {
                episodeTitle = ''
            }

            // Strip SxxExx prefix from episode title to avoid duplication
            const sxeRegex = /^S\d+E\d+\s*[-:•]?\s*/i
            if (sxeRegex.test(episodeTitle)) {
                episodeTitle = episodeTitle.replace(sxeRegex, '')
            }
            // Strip 1x01 prefix as well
            const numXNumRegex = /^\d+x\d+\s*[-:•]?\s*/i
            if (numXNumRegex.test(episodeTitle)) {
                episodeTitle = episodeTitle.replace(numXNumRegex, '')
            }

            displayName = seriesName
            if (seString) displayName += ` - ${seString}`
            if (episodeTitle) displayName += ` - ${episodeTitle}`
            subName = null
        } else if (displayName.includes(' : ')) {
            const parts = displayName.split(' : ')
            const inferredSeriesName = parts[0]
            const episodePart = parts.slice(1).join(' : ')

            displayName = inferredSeriesName
            if (seString) displayName += ` - ${seString}`
            displayName += ` - ${episodePart}`
            subName = null
        } else {
            if (seString) displayName = `${seString} - ${displayName}`
            subName = null
        }
    }

    const itemId = item.imageItemId || item.NowPlayingItemId || item.ItemId || item.Id || item.itemId
    const date = new Date(item.ActivityDateInserted || item.DateCreated || item.endTime || item.startTime)
    const duration = item.PlaybackDuration || item.playDuration || 0
    const isLive = item.isLive === true

    return {
        ...item,
        displayName,
        subName,
        seasonIndex: s,
        episodeIndex: e,
        mediaInfo,
        isSeries,
        itemId,
        date,
        duration,
        isLive,
    }
}
