import { sanitizePlaybackDuration } from '../../_utils/stats-sanitize'

export interface MeHistoryItem {
    Id?: string | number
    ItemId?: string
    NowPlayingItemId?: string
    UserId?: string
    UserName?: string
    Name?: string
    SeriesName?: string | null
    SeriesId?: string | null
    TmdbId?: string
    SeasonName?: string
    IndexNumber?: number
    ParentIndexNumber?: number
    Type?: string
    Client?: string
    DeviceName?: string
    ActivityDateInserted?: string
    DateCreated?: string
    PlaybackDuration?: number
    RunTimeTicks?: number
    Source?: string
    imageItemId?: string | null
    tmdbId?: string
    mediaType?: string
    [key: string]: any
}

export interface MeAggregatedMedia extends MeHistoryItem {
    count: number
    totalDuration: number
    lastView: string
    imageItemId: any
    mediaType: 'tv' | 'movie'
}

export interface MeTotals {
    totalDuration: number
    totalPlays: number
    moviePlays: number
    episodePlays: number
}

/** Detecte la source client (emby/plex/jellyfin) a partir du nom de client. */
function detectSource(client?: string): string {
    const c = client?.toLowerCase() || ''
    if (c.includes('plex')) return 'plex'
    if (c.includes('jellyfin')) return 'jellyfin'
    return 'emby'
}

/** Convertit les WatchEvent bruts (vue "mes stats") en MeHistoryItem. */
export function normalizeMeWatchEvents(historyRaw: any[]): MeHistoryItem[] {
    return historyRaw.map((log: any) => ({
        Id: log.id,
        ItemId: log.itemId,
        NowPlayingItemId: log.itemId,
        UserId: log.embyUserId,
        UserName: log.userName,
        Name: log.itemName,
        SeriesName: log.seriesName,
        SeriesId: null,
        TmdbId: log.tmdbId,
        SeasonName: log.seasonName,
        IndexNumber: log.episodeNumber,
        ParentIndexNumber: log.seasonNumber,
        Type: log.itemType,
        Client: log.client,
        DeviceName: log.device,
        ActivityDateInserted: log.playedAt.toISOString(),
        DateCreated: log.playedAt.toISOString(),
        PlaybackDuration: (log.durationMinutes || 0) * 60,
        RunTimeTicks: 0,
        Source: detectSource(log.client),
    }))
}

/** Agrege les 10 films et 10 series les plus vus pour l'utilisateur courant. */
export function aggregateMyMostViewed(
    historyArray: MeHistoryItem[],
    itemDurations: Record<string, number>
): { mostViewedMovies: MeAggregatedMedia[]; mostViewedSeries: MeAggregatedMedia[] } {
    const moviesMap = new Map<string, MeAggregatedMedia>()
    const seriesMap = new Map<string, MeAggregatedMedia>()

    historyArray.forEach(item => {
        const isSeries = item.Type === 'Episode' || !!item.SeriesName || !!item.SeriesId
        const targetMap = isSeries ? seriesMap : moviesMap

        const type = isSeries ? 'Episode' : (item.Type || 'Movie')
        const itemId = item.NowPlayingItemId || item.ItemId || ''
        const actualDuration = itemDurations[itemId]
        const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration)

        let seriesKey: any = item.SeriesId || item.SeriesName
        if (isSeries && !seriesKey) {
            if (item.Name?.includes(' - ')) {
                seriesKey = item.Name.split(' - ')[0]
            } else {
                seriesKey = item.NowPlayingItemId || item.ItemId
            }
        }

        const key = isSeries ? seriesKey : (item.NowPlayingItemId || item.Id)
        const imageItemId = isSeries ? (item.SeriesId || itemId) : itemId

        if (!key) return

        if (!targetMap.has(key)) {
            let displayName = item.Name
            if (isSeries) {
                if (item.SeriesName) {
                    displayName = item.SeriesName
                } else if (item.Name?.includes(' - ')) {
                    displayName = item.Name.split(' - ')[0]
                }
            }

            targetMap.set(key, {
                ...item,
                Name: displayName,
                count: 1,
                totalDuration: sanitizedDuration,
                lastView: item.ActivityDateInserted || item.DateCreated || '',
                imageItemId,
                tmdbId: item.TmdbId,
                mediaType: isSeries ? 'tv' : 'movie',
            })
        } else {
            const existing = targetMap.get(key)!
            existing.count += 1
            existing.totalDuration += sanitizedDuration
            if (!existing.tmdbId && item.TmdbId) existing.tmdbId = item.TmdbId
        }
    })

    return {
        mostViewedMovies: Array.from(moviesMap.values()).sort((a, b) => b.count - a.count).slice(0, 10),
        mostViewedSeries: Array.from(seriesMap.values()).sort((a, b) => b.totalDuration - a.totalDuration).slice(0, 10),
    }
}

/** Calcule les totaux (duree, lectures, films/episodes) pour l'utilisateur. */
export function computeMyTotals(
    historyArray: MeHistoryItem[],
    itemDurations: Record<string, number>
): MeTotals {
    let totalDuration = 0
    let totalPlays = 0
    let moviePlays = 0
    let episodePlays = 0

    historyArray.forEach(item => {
        const isSeries = item.Type === 'Episode' || !!item.SeriesName || !!item.SeriesId
        const type = isSeries ? 'Episode' : (item.Type || 'Movie')
        const itemId = item.NowPlayingItemId || item.ItemId || ''
        const actualDuration = itemDurations[itemId]
        const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration)

        totalDuration += sanitizedDuration
        totalPlays += 1
        if (isSeries) episodePlays += 1
        else moviePlays += 1
    })

    return { totalDuration, totalPlays, moviePlays, episodePlays }
}

/** Histogrammes horaire et journalier (jours complets en francais). */
export function computeMyActivityHistograms(historyArray: MeHistoryItem[]) {
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, value: 0 }))
    const dailyActivityMap = new Map<string, number>()

    historyArray.forEach(item => {
        const date = new Date(item.ActivityDateInserted || '')

        const hour = date.getHours()
        if (hour >= 0 && hour < 24) hourlyActivity[hour].value++

        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' })
        const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1)
        dailyActivityMap.set(dayNameCap, (dailyActivityMap.get(dayNameCap) || 0) + 1)
    })

    const daysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    const dailyActivity = daysOrder.map(day => ({ name: day, value: dailyActivityMap.get(day) || 0 }))

    return { hourlyActivity, dailyActivity }
}

/** Formate les elements de l'historique recent avec imageItemId derive. */
export function buildRecentHistory(historyArray: MeHistoryItem[], limit: number = 20) {
    return historyArray.slice(0, limit).map(item => ({
        ...item,
        imageItemId: (item.Type === 'Episode' || item.SeriesId) ? (item.SeriesId || item.ItemId) : item.ItemId,
    }))
}
