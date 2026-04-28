import { sanitizePlaybackDuration } from './stats-sanitize'

export interface HistoryItem {
    Id?: string | number
    ItemId?: string | number
    NowPlayingItemId?: string | number
    UserId?: string | number
    UserName?: string
    Name?: string
    SeriesName?: string
    SeriesId?: string | number
    TmdbId?: string | number
    SeasonName?: string
    IndexNumber?: number
    ParentIndexNumber?: number
    mediaInfo?: Record<string, unknown>
    Type?: string
    Client?: string
    DeviceName?: string
    ActivityDateInserted?: string
    DateCreated?: string
    PlaybackDuration?: number
    RunTimeTicks?: number
    imageItemId?: string | number
    source?: string
    tmdbId?: string | number
    mediaType?: string
}

export interface AggregatedMedia extends HistoryItem {
    count: number
    totalDuration: number
    lastView: Date
    imageItemId?: string | number
    mediaType: 'tv' | 'movie'
}

export interface TimelineBin {
    name: string
    value: number
}

export interface UserStatsEntry {
    name: string
    duration: number
    plays: number
}

const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTH_NAMES_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

/** Convertit les WatchEvent bruts de Prisma en HistoryItem normalises. */
export function normalizeWatchEvents(historyRaw: any[]): HistoryItem[] {
    return historyRaw.map((log: any) => {
        let mediaInfo: any = {}
        try {
            mediaInfo = log.mediaInfo ? JSON.parse(log.mediaInfo) : {}
        } catch {}

        return {
            Id: log.id,
            ItemId: log.itemId,
            NowPlayingItemId: log.itemId,
            UserId: log.embyUserId,
            UserName: log.userName,
            Name: log.itemName,
            SeriesName: log.seriesName || mediaInfo.seriesName || mediaInfo.SeriesName,
            SeriesId: mediaInfo.seriesId || mediaInfo.SeriesId,
            TmdbId: log.tmdbId || mediaInfo.tmdbId,
            SeasonName: log.seasonName || mediaInfo.seasonName || mediaInfo.SeasonName,
            IndexNumber: log.episodeNumber ?? mediaInfo.episodeIndex ?? mediaInfo.IndexNumber,
            ParentIndexNumber: log.seasonNumber ?? mediaInfo.seasonIndex ?? mediaInfo.ParentIndexNumber,
            mediaInfo: log.mediaInfo,
            Type: log.itemType,
            Client: log.client,
            DeviceName: log.device,
            ActivityDateInserted: log.playedAt.toISOString(),
            DateCreated: log.playedAt.toISOString(),
            PlaybackDuration: (log.durationMinutes || 0) * 60,
            RunTimeTicks: 0,
            source: 'emby',
        }
    })
}

/** Construit la map des durees reelles par itemId a partir de RunTimeTicks. */
export function computeItemDurations(historyArray: HistoryItem[]): Record<string, number> {
    const durations: Record<string, number> = {}
    historyArray.forEach(item => {
        if (item.RunTimeTicks && item.ItemId !== undefined) {
            durations[String(item.ItemId)] = Math.round(item.RunTimeTicks / 10000000)
        }
    })
    return durations
}

/** Remplit SeriesName manquant dans les items a partir de la map deduite. */
export function backfillSeriesInfo(historyArray: HistoryItem[]): void {
    const seriesInfoMap = new Map<string, { name: string; id?: string | number }>()
    historyArray.forEach(item => {
        if (item.SeriesName && (item.SeriesId || item.imageItemId)) {
            if (item.SeriesId) seriesInfoMap.set(String(item.SeriesId), { name: item.SeriesName, id: item.SeriesId })
            if (item.imageItemId) seriesInfoMap.set(String(item.imageItemId), { name: item.SeriesName, id: item.SeriesId })
        }
    })

    historyArray.forEach(item => {
        if (!item.SeriesName && item.SeriesId) {
            const info = seriesInfoMap.get(String(item.SeriesId))
            if (info) item.SeriesName = info.name
        }
        if (!item.SeriesName && item.imageItemId) {
            const info = seriesInfoMap.get(String(item.imageItemId))
            if (info) item.SeriesName = info.name
        }
    })
}

/** Agrege les 10 films et 10 series les plus vus a partir de l'historique. */
export function aggregateMostViewed(
    historyArray: HistoryItem[],
    itemDurations: Record<string, number>
): { mostViewedMovies: AggregatedMedia[]; mostViewedSeries: AggregatedMedia[] } {
    const mostViewedMoviesMap = new Map<string, AggregatedMedia>()
    const mostViewedSeriesMap = new Map<string, AggregatedMedia>()
    const seriesInfoMap = new Map<string, { name: string; id?: string | number }>()
    historyArray.forEach(item => {
        if (item.SeriesName && (item.SeriesId || item.imageItemId)) {
            if (item.SeriesId) seriesInfoMap.set(String(item.SeriesId), { name: item.SeriesName, id: item.SeriesId })
            if (item.imageItemId) seriesInfoMap.set(String(item.imageItemId), { name: item.SeriesName, id: item.SeriesId })
        }
    })

    historyArray.forEach(item => {
        const isSeries = item.Type === 'Episode' || item.Type === 'Series' || !!item.SeriesName || !!item.SeriesId
        const targetMap = isSeries ? mostViewedSeriesMap : mostViewedMoviesMap
        const type = isSeries ? 'Episode' : (item.Type || 'Movie')
        const itemId = item.NowPlayingItemId || item.ItemId
        const actualDuration = itemId !== undefined ? itemDurations[String(itemId)] : undefined
        const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration)

        let seriesName = item.SeriesName
        let seriesId = item.SeriesId
        const displayName = item.Name

        // Fallback series name extraction
        if (isSeries && !seriesName) {
            if (displayName?.includes(' : ')) {
                seriesName = displayName.split(' : ')[0]
            } else if (displayName?.includes(' - s')) {
                seriesName = displayName.split(' - s')[0]
            } else if (displayName?.includes(' - ')) {
                seriesName = displayName.split(' - ')[0]
            } else if (item.imageItemId && seriesInfoMap.has(String(item.imageItemId))) {
                const info = seriesInfoMap.get(String(item.imageItemId))!
                seriesName = info.name
                seriesId = seriesId || info.id
            }
        }

        const rawKey = isSeries ? (seriesId || seriesName || itemId) : (itemId || item.Id)
        if (rawKey === undefined) return
        const key = String(rawKey)
        const imageItemId = (isSeries ? (seriesId || item.imageItemId || itemId) : itemId) ?? item.ItemId

        if (!targetMap.has(key)) {
            targetMap.set(key, {
                ...item,
                Name: isSeries ? (seriesName || displayName) : displayName,
                count: 1,
                totalDuration: sanitizedDuration,
                lastView: new Date(item.ActivityDateInserted || item.DateCreated || ''),
                imageItemId,
                tmdbId: item.TmdbId,
                mediaType: isSeries ? 'tv' : 'movie',
            })
        } else {
            const existing = targetMap.get(key)
            if (existing) {
                existing.count += 1
                existing.totalDuration += sanitizedDuration
                if (!existing.tmdbId && item.TmdbId) existing.tmdbId = item.TmdbId
                if (isSeries && existing.imageItemId === existing.ItemId && item.SeriesId) {
                    existing.imageItemId = item.SeriesId
                }
                const currentDate = new Date(item.ActivityDateInserted || item.DateCreated || '')
                if (currentDate > existing.lastView) existing.lastView = currentDate
            }
        }
    })

    return {
        mostViewedMovies: Array.from(mostViewedMoviesMap.values()).sort((a, b) => b.count - a.count).slice(0, 10),
        mostViewedSeries: Array.from(mostViewedSeriesMap.values()).sort((a, b) => b.count - a.count).slice(0, 10),
    }
}

/** Calcule les histogrammes d'activite horaire/journaliere/mensuelle. */
export function computeActivityHistograms(
    historyArray: HistoryItem[],
    period: string
): { hourlyActivity: TimelineBin[]; orderedDailyActivity: TimelineBin[]; monthlyActivity?: TimelineBin[] } {
    const hourlyActivity: TimelineBin[] = Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, value: 0 }))
    const dailyActivity: TimelineBin[] = DAY_NAMES_FR.map(day => ({ name: day, value: 0 }))

    historyArray.forEach(item => {
        const dateString = item.ActivityDateInserted || item.DateCreated
        if (!dateString) return

        const date = new Date(dateString)
        const hour = date.getHours()
        if (hourlyActivity[hour]) hourlyActivity[hour].value++

        const dayIdx = date.getDay()
        if (dailyActivity[dayIdx]) dailyActivity[dayIdx].value++
    })

    // Reorder daily activity to start from Monday for display
    const orderedDailyActivity = [
        dailyActivity[1], dailyActivity[2], dailyActivity[3],
        dailyActivity[4], dailyActivity[5], dailyActivity[6], dailyActivity[0],
    ]

    let monthlyActivity: TimelineBin[] | undefined
    if (period === 'year') {
        monthlyActivity = MONTH_NAMES_FR.map(month => ({ name: month, value: 0 }))
        historyArray.forEach(item => {
            const dateString = item.ActivityDateInserted || item.DateCreated
            if (!dateString) return
            const date = new Date(dateString)
            const monthIdx = date.getMonth()
            if (monthlyActivity![monthIdx]) monthlyActivity![monthIdx].value++
        })
    }

    return { hourlyActivity, orderedDailyActivity, monthlyActivity }
}

/**
 * Consolide l'historique : prepend les live items, deduplique par (item, user)
 * si les dates sont dans une fenetre de 7 jours, puis trie par date desc.
 */
export function consolidateHistory(
    historyArray: HistoryItem[],
    liveItems: HistoryItem[],
    itemDurations: Record<string, number>
): HistoryItem[] {
    const aggregatedHistory: HistoryItem[] = [...liveItems]
    const historyMap = new Map<string, HistoryItem>()

    historyArray.forEach(item => {
        const itemId = item.NowPlayingItemId || item.ItemId
        const userId = item.UserId || item.UserName
        const date = new Date(item.ActivityDateInserted || item.DateCreated || '')
        const key = `${itemId}-${userId}`

        const type = (item.Type === 'Episode' || !!item.SeriesName) ? 'Episode' : (item.Type || 'Movie')
        const actualDuration = itemId !== undefined ? itemDurations[String(itemId)] : undefined
        const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration)

        const isSeries = item.Type === 'Episode' || !!item.SeriesName
        const imageItemId = isSeries ? (item.SeriesId || itemId) : itemId

        if (historyMap.has(key)) {
            const existing = historyMap.get(key)
            if (existing) {
                const existingDate = new Date(existing.ActivityDateInserted || existing.DateCreated || '')
                const diffDays = Math.abs(date.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24)

                if (diffDays <= 7) {
                    existing.PlaybackDuration = (existing.PlaybackDuration || 0) + sanitizedDuration
                    if (date > existingDate) {
                        existing.ActivityDateInserted = item.ActivityDateInserted
                        existing.DateCreated = item.DateCreated
                        existing.Client = item.Client
                        existing.DeviceName = item.DeviceName
                    }
                    return
                }
            }
        }

        const newItem = {
            ...item,
            PlaybackDuration: sanitizedDuration,
            imageItemId,
            tmdbId: item.TmdbId,
            mediaType: item.Type === 'Episode' ? 'tv' : 'movie',
        }
        historyMap.set(key, newItem)
        aggregatedHistory.push(newItem)
    })

    aggregatedHistory.sort((a, b) => {
        const dateA = new Date(a.ActivityDateInserted || a.DateCreated || '').getTime()
        const dateB = new Date(b.ActivityDateInserted || b.DateCreated || '').getTime()
        return dateB - dateA
    })

    return aggregatedHistory
}

/**
 * Calcule les stats par utilisateur en tenant compte des groupes (Group > LocalUser > RawID)
 * et retourne le total d'heures visionnees (en secondes).
 */
export function computeUserStats(
    historyArray: HistoryItem[],
    itemDurations: Record<string, number>,
    providerIdToLocalUserMap: Map<string, string>,
    userGroupMap: Map<string, any>
): { userStatsMap: Map<string, UserStatsEntry>; totalWatchTimeSeconds: number } {
    const userStatsMap = new Map<string, UserStatsEntry>()

    const totalWatchTimeSeconds = historyArray.reduce((acc, item) => {
        const type = (item.Type === 'Episode' || !!item.SeriesName) ? 'Episode' : (item.Type || 'Movie')
        const itemId = item.NowPlayingItemId || item.ItemId
        const actualDuration = itemId !== undefined ? itemDurations[String(itemId)] : undefined
        const duration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration)

        const rawUserKey = item.UserId || item.UserName
        if (rawUserKey === undefined) return acc + duration
        const userKeyStr = String(rawUserKey)
        const localUserName = providerIdToLocalUserMap.get(userKeyStr)
        const group = userGroupMap.get(userKeyStr)

        let userKey = userKeyStr
        let userName = item.UserName || 'Inconnu'

        if (group) {
            userKey = `group-${group.id}`
            userName = group.name
        } else if (localUserName) {
            userKey = `local-${localUserName}`
            userName = localUserName
        }

        const existing = userStatsMap.get(userKey) || { name: userName, duration: 0, plays: 0 }
        if (group) existing.name = group.name
        existing.duration += duration
        existing.plays += 1
        userStatsMap.set(userKey, existing)

        return acc + duration
    }, 0)

    return { userStatsMap, totalWatchTimeSeconds }
}
