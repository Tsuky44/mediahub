'use server'

import { getWatchLaterList, areInWatchLater } from './watch-later-actions'
import { getCurrentUser, getLibraryPlatform, getLibraryServer, getLibraryUserId, getTmdbServiceForUser } from '@/lib/auth'
import { getOnyxDirectory, OnyxDirectoryError } from '@/lib/services/onyx-directory'
import { logger } from '@/lib/logger'
import axios from 'axios'
import { createMemoCache } from '@/lib/cache'
import { MS } from '@/lib/constants'
import type { EmbyService } from '@/lib/services/emby'
import { db } from '@/lib/db/drizzle'
import { users, mediaRequests, watchEvents } from '@/lib/db/schema'
import { eq, or, and, gte, desc, sql, count } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { EmbyItem } from '@/types/emby'
import { TmdbMovie, TmdbTvShow } from '@/types/tmdb'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };

// SeriesId (serveur média) → id TMDB : stable, inutile de redemander la série à chaque rendu
const seriesTmdbIds = createMemoCache({ max: 5000, ttl: MS.HOUR })

// Lectures du serveur média par utilisateur (historique, bibliothèque) : fraîches 20 s, puis
// servies le temps d'être relues en arrière-plan. Les pages s'affichent sans attendre Emby ;
// un changement de favori vide ce cache.
const mediaReads = createMemoCache({ max: 500, ttl: 20_000, stale: 10 * MS.MINUTE, clone: true })

async function getSeriesTmdbId(mediaService: EmbyService, seriesId: string, userId: string): Promise<string | undefined> {
    return seriesTmdbIds.get<string | undefined>(seriesId, async () => {
        const series = await mediaService.getItemDetails(seriesId, userId)
        const tmdbId = series?.ProviderIds?.Tmdb
        return tmdbId ? String(tmdbId) : undefined
    })
}


/**
 * Pourquoi la médiathèque est vide, quand ce n'est pas faute de médias : affiché sur la page à la
 * place d'une grille muette.
 */
export type LibraryProblem = 'no-server' | 'not-linked' | 'unreachable' | 'slow' | 'key-refused' | 'account-refused'

export interface LibraryPage {
    results: any[]
    total_pages: number
    problem?: LibraryProblem
    /** Cause technique (statut HTTP, code réseau), affichée avec le message */
    detail?: string
    /** Liste du serveur entier affichée faute de pouvoir lire celle du compte */
    serverWide?: boolean
    /** Plateforme lue (Emby, Jellyfin, Onyx) */
    source?: 'emby' | 'jellyfin' | 'onyx'
}

/** Échec d'une lecture de la bibliothèque : de quel genre, et sa cause en clair */
function classifyLibraryError(e: unknown): { problem: LibraryProblem; detail: string } {
    if (axios.isAxiosError(e)) {
        const status = e.response?.status
        // Réponse du serveur en clair (première ligne) : distingue Emby d'un proxy placé devant
        const body = typeof e.response?.data === 'string' ? e.response.data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) : ''
        const detail = body ? `HTTP ${status} : ${body}` : `HTTP ${status}`
        if (status === 401 || status === 403) return { problem: 'key-refused', detail }
        if (status) return { problem: 'account-refused', detail }
        if (e.code === 'ECONNABORTED' || /timeout/i.test(e.message)) return { problem: 'slow', detail: 'délai de 15 s dépassé' }
        return { problem: 'unreachable', detail: e.code || e.message }
    }
    return { problem: 'unreachable', detail: e instanceof Error ? e.message : String(e) }
}

const ONYX_PAGE_SIZE = 50

/**
 * Bibliothèque d'Onyx, lue avec la clé d'intégration : tout compte Onyx voit toute la bibliothèque,
 * donc pas besoin que le compte MediaHub soit lié. Onyx n'a pas de favoris pour MediaHub.
 */
async function fetchOnyxMedia(page: number, type: 'movie' | 'tv' | 'all', query?: string, favoritesOnly: boolean = false, watchLaterOnly: boolean = false): Promise<LibraryPage> {
    const source = 'onyx' as const
    try {
        const user = await getCurrentUser()
        if (!user || !user.email) return { results: [], total_pages: 0 }

        const directory = await getOnyxDirectory()
        if (!directory) return { results: [], total_pages: 0, problem: 'no-server', source }
        if (favoritesOnly) return { results: [], total_pages: 0, source }

        let items = await directory.listLibrary()
        if (type !== 'all') items = items.filter((item) => (type === 'movie' ? item.type === 'movie' : item.type === 'show'))
        const needle = query?.trim().toLocaleLowerCase('fr')
        if (needle) items = items.filter((item) => item.title.toLocaleLowerCase('fr').includes(needle))

        if (watchLaterOnly) {
            const saved = await getWatchLaterList()
            const keys = new Set((Array.isArray(saved) ? saved : []).flatMap((i) => [`${i.mediaType}:${i.mediaId}`, `${i.mediaType}:${i.tmdbId ?? ''}`]))
            items = items.filter((item) => {
                const mediaType = item.type === 'movie' ? 'movie' : 'tv'
                return keys.has(`${mediaType}:${item.tmdb_id ?? ''}`) || keys.has(`${mediaType}:${item.id}`)
            })
        }

        const slice = items.slice((page - 1) * ONYX_PAGE_SIZE, page * ONYX_PAGE_SIZE)
        const tmdbService = await getTmdbServiceForUser()
        const watchLaterKeys = new Set(await areInWatchLater(
            slice.map((item) => ({ id: String(item.tmdb_id || item.id), mediaType: item.type === 'movie' ? 'movie' : 'tv' }))
        ))

        const results = await Promise.all(slice.map(async (item) => {
            const mediaType = item.type === 'movie' ? 'movie' : 'tv'
            const images = item.tmdb_id && tmdbService ? await tmdbService.getImagePaths(item.tmdb_id, mediaType).catch(() => null) : null
            // Affiche d'Onyx en secours, seulement si elle se lit sans session (adresse complète)
            const onyxPoster = item.poster_url && /^https?:\/\//i.test(item.poster_url) ? item.poster_url : null
            const id = String(item.tmdb_id || item.id)
            return {
                id,
                title: item.title,
                name: item.title,
                poster_path: images?.poster_path ?? onyxPoster,
                backdrop_path: images?.backdrop_path ?? null,
                media_type: mediaType,
                overview: item.overview,
                onyx_id: item.id,
                tmdbId: item.tmdb_id || undefined,
                isFavorite: false,
                isWatchLater: watchLaterKeys.has(`${mediaType}:${id}`),
            }
        }))

        return { results, total_pages: Math.ceil(items.length / ONYX_PAGE_SIZE), source }
    } catch (e) {
        const detail = e instanceof Error ? e.message : String(e)
        logger.warn(`[Médiathèque] Lecture de la bibliothèque Onyx impossible : ${detail}`)
        const status = e instanceof OnyxDirectoryError ? e.status : 0
        const problem: LibraryProblem = status === 401 || status === 403 ? 'key-refused' : status ? 'account-refused' : 'unreachable'
        return { results: [], total_pages: 0, problem, detail, source }
    }
}

export async function fetchEmbyMedia(page: number, type: 'movie' | 'tv' | 'all', query?: string, favoritesOnly: boolean = false, watchLaterOnly: boolean = false): Promise<LibraryPage> {
    if ((await getLibraryPlatform()) === 'onyx') return fetchOnyxMedia(page, type, query, favoritesOnly, watchLaterOnly)
    let source: 'emby' | 'jellyfin' | undefined
    try {
        const user = await getCurrentUser()
        if (!user || !user.email) return { results: [], total_pages: 0 }

        const library = await getLibraryServer()
        const tmdbService = await getTmdbServiceForUser()

        if (!library) return { results: [], total_pages: 0, problem: 'no-server' }
        const mediaService = library.service
        source = library.type

        const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user.email)
        })

        const userId = getLibraryUserId(dbUser, library.type)
        if (!userId) return { results: [], total_pages: 0, problem: 'not-linked', source }
        
        const limit = 50
        const startIndex = (page - 1) * limit

        const includeItemTypes = type === 'all' ? 'Movie,Series' : (type === 'movie' ? 'Movie' : 'Series')

        let ids: string | undefined = undefined
        if (watchLaterOnly) {
            const watchLaterItems = await getWatchLaterList()
            const embyWatchLaterIds = Array.isArray(watchLaterItems) 
                ? watchLaterItems
                    .filter(i => i.isEmbyItem && (type === 'all' || i.mediaType === type))
                    .map(i => i.mediaId)
                : []
            
            if (embyWatchLaterIds.length === 0) return { results: [], total_pages: 0 }
            ids = embyWatchLaterIds.join(',')
        }

        const itemsQuery = {
            SearchTerm: query,
            StartIndex: startIndex,
            Limit: limit,
            Recursive: true,
            IncludeItemTypes: includeItemTypes,
            Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds,UserData',
            SortBy: 'SortName',
            SortOrder: 'Ascending',
            IsFavorite: favoritesOnly ? true : undefined,
            Ids: ids
        }
        // Clé par plateforme : passer d'Emby à Jellyfin ne ressert pas l'ancienne liste. Un échec n'est
        // pas mis en cache : il ne masque pas la bibliothèque les fois suivantes.
        const isList = (d: any) => Array.isArray(d?.Items)
        let data: any
        let serverWide = false
        let accountDetail: string | undefined
        try {
            data = await mediaReads.get(
                `items:${library.type}:${userId}:${JSON.stringify(itemsQuery)}`,
                () => mediaService.listUserItems(userId, itemsQuery),
                { cacheIf: isList }
            )
        } catch (accountError) {
            const failure = classifyLibraryError(accountError)
            logger.warn(`[Médiathèque] Bibliothèque du compte ${userId} illisible sur ${library.type} : ${failure.detail}`)
            // Serveur injoignable, lent ou clé refusée : la liste du serveur entier échouerait aussi.
            // Les favoris n'existent que pour un compte.
            if (failure.problem !== 'account-refused' || favoritesOnly) {
                return { results: [], total_pages: 0, ...failure, source }
            }
            // Compte refusé par le serveur (identifiant d'un ancien serveur…) : bibliothèque du serveur
            // entier avec la clé API, sans les données du compte
            try {
                const { IsFavorite: _favorite, ...serverQuery } = itemsQuery
                data = await mediaReads.get(
                    `items:${library.type}:*:${JSON.stringify(serverQuery)}`,
                    () => mediaService.listItems(serverQuery),
                    { cacheIf: isList }
                )
                serverWide = true
                accountDetail = failure.detail
            } catch (serverError) {
                const second = classifyLibraryError(serverError)
                logger.warn(`[Médiathèque] Bibliothèque du serveur ${library.type} illisible aussi : ${second.detail}`)
                return { results: [], total_pages: 0, problem: failure.problem, detail: `${failure.detail}, serveur : ${second.detail}`, source }
            }
        }

        const items = Array.isArray(data.Items) ? data.Items : []

        // Statut "à regarder plus tard" de toute la page en UNE requête (au lieu d'une par item)
        const watchLaterKeys = new Set(await areInWatchLater(
            items
                .filter((item: EmbyItem) => item.Id != null)
                .map((item: EmbyItem) => ({ id: String(item.Id), mediaType: item.Type === 'Movie' ? 'movie' : 'tv' }))
        ))
        
        // Fetch TMDB poster paths in parallel for the current page
        const enrichedItems = await Promise.all(items.map(async (item: EmbyItem) => {
            const tmdbId = item.ProviderIds?.Tmdb
            const itemType = item.Type === 'Movie' ? 'movie' : 'tv'
            const images = tmdbId && tmdbService ? await tmdbService.getImagePaths(parseInt(String(tmdbId)), itemType) : null
            let poster_path = images?.poster_path ?? null

            // Fallback to Emby image if TMDB image is not available
            if (!poster_path && item.Id != null) {
                poster_path = mediaService.getItemImageUrl(String(item.Id))
            }

            const isWatchLaterItem = item.Id != null && watchLaterKeys.has(`${itemType}:${item.Id}`)

            return {
                id: item.Id,
                title: item.Name,
                name: item.Name,
                poster_path: poster_path,
                backdrop_path: images?.backdrop_path ?? null,
                media_type: itemType,
                overview: item.Overview,
                emby_id: item.Id,
                tmdbId: tmdbId,
                isFavorite: item.UserData?.IsFavorite || false,
                isWatchLater: isWatchLaterItem
            }
        }))

        return {
            results: enrichedItems,
            total_pages: Math.ceil((data.TotalRecordCount || 0) / limit),
            source,
            ...(serverWide && { serverWide, detail: accountDetail }),
        }
    } catch (e) {
        // Visible en production : sans ce message, une bibliothèque injoignable ressemble à une vide
        const failure = classifyLibraryError(e)
        logger.warn(`[Médiathèque] Lecture de la bibliothèque ${source ?? ''} impossible : ${failure.detail}`)
        return { results: [], total_pages: 0, ...failure, source }
    }
}

export async function fetchRecentlyWatchedItems() {
    try {
        log('[fetchRecentlyWatchedItems] Getting current user...')
        const user = await getCurrentUser()
        if (!user || !user.email) return []

        const library = await getLibraryServer()
        const mediaService = library?.service
        const tmdbService = await getTmdbServiceForUser()
        
        if (!library || !mediaService) return []

        const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user.email)
        })

        const userId = getLibraryUserId(dbUser, library.type)
        if (!userId) {
            log('[fetchRecentlyWatchedItems] User not linked to a media server')
            return []
        }
        
        log('[fetchRecentlyWatchedItems] Fetching recently played items for user:', userId)
        // Réduction du nombre d'items récupérés pour plus de rapidité (20 au lieu de 50)
        const data = await mediaReads.get(`played:${userId}:20`, () => mediaService.getRecentlyPlayedItems(userId, 20))
        const allItems = Array.isArray(data.Items) ? data.Items : []
        
        // Group items by SeriesId (for episodes) or Id (for movies)
        const uniqueItems: EmbyItem[] = []
        const seenIds = new Set<string>()

        for (const item of allItems) {
            if (uniqueItems.length >= 4) break

            // Use SeriesId for episodes to group by show, otherwise use item Id
            const groupId = item.Type === 'Episode' ? item.SeriesId : item.Id
            
            if (!groupId || seenIds.has(groupId)) continue

            seenIds.add(groupId)
            uniqueItems.push(item)
        }

        log('[fetchRecentlyWatchedItems] Found unique items count:', uniqueItems.length)
        
        const enrichedItems = await Promise.all(uniqueItems.map(async (item: EmbyItem) => {
            let tmdbId = item.ProviderIds?.Tmdb
            const itemType = item.Type === 'Movie' ? 'movie' : (item.Type === 'Series' ? 'tv' : 'tv')
            
            let poster_path = null
            if (item.Type === 'Episode' && item.SeriesId) {
                const seriesTmdbId = await getSeriesTmdbId(mediaService, String(item.SeriesId), userId)
                if (seriesTmdbId && tmdbService) {
                    poster_path = await tmdbService.getPosterPath(parseInt(String(seriesTmdbId)), 'tv')
                    tmdbId = seriesTmdbId
                }
            } else if (tmdbId && tmdbService) {
                poster_path = await tmdbService.getPosterPath(parseInt(String(tmdbId)), itemType)
            }

            // Fallback to Emby image
            if (!poster_path && item.Id != null) {
                poster_path = mediaService.getItemImageUrl(item.Type === 'Episode' && item.SeriesId != null ? String(item.SeriesId) : String(item.Id))
            }

            const lastPlayedDate = item.UserData?.LastPlayedDate 
                ? new Date(item.UserData.LastPlayedDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                : null

            return {
                id: item.Id,
                title: item.Name,
                name: item.Name,
                seriesName: item.SeriesName,
                poster_path: poster_path,
                media_type: item.Type?.toLowerCase() ?? '',
                type: item.Type,
                overview: item.Overview,
                emby_id: item.Id,
                tmdbId: tmdbId,
                isFavorite: item.UserData?.IsFavorite || false,
                lastPlayedDate: lastPlayedDate,
                parentIndexNumber: item.ParentIndexNumber,
                indexNumber: item.IndexNumber
            }
        }))

        return enrichedItems
    } catch (e) {
        error('[fetchRecentlyWatchedItems] Failed to fetch items', e)
        return []
    }
}

export async function fetchUserRecommendations(page: number = 1) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.email) return { results: [], total_pages: 0 }

        const library = await getLibraryServer()
        const mediaService = library?.service
        const tmdbService = await getTmdbServiceForUser()
        
        if (!tmdbService) return { results: [], total_pages: 0 }

        const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user.email)
        })

        if (!dbUser) return { results: [], total_pages: 0 }

        const mediaUserId = library ? getLibraryUserId(dbUser, library.type) : null

        // 1. Historique récent (serveur média) + 2. demandes récentes (DB locale), en parallèle
        const [historyData, requests] = await Promise.all([
            mediaUserId && mediaService ? mediaReads.get(`played:${mediaUserId}:15`, () => mediaService.getRecentlyPlayedItems(mediaUserId, 15)) : null,
            db.query.mediaRequests.findMany({
                where: or(eq(mediaRequests.requesterEmail, user.email), eq(mediaRequests.userId, dbUser.id)),
                orderBy: [desc(mediaRequests.requestedAt)],
                limit: 10
            }),
        ])
        const history: EmbyItem[] = Array.isArray(historyData?.Items) ? historyData.Items : []

        // Combine history and requests to find seed TMDB IDs
        const seeds: { id: number; type: 'movie' | 'tv' }[] = []
        
        // Process history in parallel
        if (Array.isArray(history)) {
            const historySeeds = await Promise.all(history.slice(0, 5).map(async (item) => {
                let tmdbId = item.ProviderIds?.Tmdb
                const type = item.Type === 'Movie' ? 'movie' : (item.Type === 'Series' || item.Type === 'Episode' ? 'tv' : null)
                
                if (item.Type === 'Episode' && item.SeriesId && mediaUserId && mediaService) {
                    tmdbId = await getSeriesTmdbId(mediaService, String(item.SeriesId), mediaUserId)
                }

                if (tmdbId && type) {
                    return { id: parseInt(String(tmdbId)), type }
                }
                return null
            }))

            for (const seed of historySeeds) {
                if (seed && !seeds.some(s => s.id === seed.id)) {
                    seeds.push(seed as { id: number; type: 'movie' | 'tv' })
                }
            }
        }

        // Process requests if not enough seeds
        if (seeds.length < 5 && Array.isArray(requests)) {
            for (const req of requests) {
                const reqTmdbId = parseInt(req.tmdbId)
                if (req.tmdbId && !seeds.some(s => s.id === reqTmdbId)) {
                    seeds.push({ id: reqTmdbId, type: req.mediaType as 'movie' | 'tv' })
                }
                if (seeds.length >= 5) break
            }
        }

        if (seeds.length === 0) {
            // Fallback to trending if no history/requests
            const trending = await tmdbService.getTrending('movie', page)
            const trendingResults = Array.isArray(trending.results) ? trending.results : []
            return {
                results: trendingResults.map((m: TmdbMovie | TmdbTvShow) => ({
                    ...m,
                    media_type: 'movie',
                    id: m.id.toString(),
                    tmdbId: m.id
                })),
                total_pages: trending.total_pages || 1
            }
        }

        // 3. Get recommendations for each seed in parallel
        // For pagination, we'll fetch from all seeds but offset the results
        const allRecommendations = await Promise.all(
            seeds.map(seed => tmdbService.getRecommendations(seed.id, seed.type, page))
        )

        // 4. Flatten, deduplicate and shuffle
        const combinedResults = allRecommendations.flatMap((res, index) => {
            const results = Array.isArray(res.results) ? res.results : []
            return results.map((item: TmdbMovie | TmdbTvShow) => ({
                ...item,
                media_type: seeds[index].type,
                id: item.id.toString(),
                tmdbId: item.id
            }))
        })

        // Deduplicate by TMDB ID
        const uniqueResults = Array.from(new Map(combinedResults.map(item => [`${item.media_type}-${item.id}`, item])).values())
        
        // Find the max total pages among all seed recommendations
        const maxTotalPages = Math.max(...allRecommendations.map(res => res.total_pages || 0))

        return {
            results: uniqueResults.sort(() => 0.5 - Math.random()),
            total_pages: Math.min(maxTotalPages, 10) // Limit to 10 pages for sanity
        }

    } catch (e) {
        error('[fetchUserRecommendations] Failed', e)
        return { results: [], total_pages: 0 }
    }
}

export async function fetchServerTrends(page: number = 1) {
    try {
        const user = await getCurrentUser()
        if (!user) return { results: [], total_pages: 0 }

        const mediaService = (await getLibraryServer())?.service
        const tmdbService = await getTmdbServiceForUser()
        
        if (!tmdbService) return { results: [], total_pages: 0 }

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // 1. Get most watched items from WatchEvent
        const topWatched = await db.select({
            itemId: watchEvents.itemId,
            itemType: watchEvents.itemType,
            itemName: watchEvents.itemName,
            seriesName: watchEvents.seriesName,
            count: count(watchEvents.itemId).as('cnt')
        })
            .from(watchEvents)
            .where(gte(watchEvents.playedAt, thirtyDaysAgo))
            .groupBy(watchEvents.itemId, watchEvents.itemType, watchEvents.itemName, watchEvents.seriesName)
            .orderBy(sql`cnt DESC`)
            .limit(50)

        const topWatchedArray = Array.isArray(topWatched) ? topWatched : []

        // 2. Get most requested items from MediaRequest
        const topRequested = await db.select({
            tmdbId: mediaRequests.tmdbId,
            mediaType: mediaRequests.mediaType,
            title: mediaRequests.title,
            count: count(mediaRequests.tmdbId).as('cnt')
        })
            .from(mediaRequests)
            .where(gte(mediaRequests.requestedAt, thirtyDaysAgo))
            .groupBy(mediaRequests.tmdbId, mediaRequests.mediaType, mediaRequests.title)
            .orderBy(sql`cnt DESC`)
            .limit(50)

        const topRequestedArray = Array.isArray(topRequested) ? topRequested : []

        // 3. Unify and enrich (appels serveur média / TMDB en parallèle, ordre conservé)
        const trendItems: Array<Record<string, unknown>> = []
        const seenTmdbIds = new Set<string>()

        // Process watched items first
        if (mediaService && topWatchedArray.length > 0) {
            const watchedItems = await Promise.all(topWatchedArray.map(async (watch) => {
                try {
                    const itemDetails = await mediaService.getItemDetails(watch.itemId)
                    const tmdbId = itemDetails.ProviderIds?.Tmdb
                    const mediaType = watch.itemType?.toLowerCase() === 'series' || watch.itemType?.toLowerCase() === 'episode' ? 'tv' : 'movie'
                    if (!tmdbId) return null

                    const { poster_path, backdrop_path } = await tmdbService.getImagePaths(parseInt(String(tmdbId)), mediaType)
                    return {
                        tmdbKey: String(tmdbId),
                        item: {
                            id: watch.itemId,
                            title: watch.itemName || watch.seriesName,
                            name: watch.itemName || watch.seriesName,
                            poster_path,
                            backdrop_path,
                            media_type: mediaType,
                            tmdbId: parseInt(String(tmdbId)),
                            trendingReason: 'Populaire sur le serveur'
                        }
                    }
                } catch (e) {
                    return null
                }
            }))
            for (const watched of watchedItems) {
                if (!watched) continue
                seenTmdbIds.add(watched.tmdbKey)
                trendItems.push(watched.item)
            }
        }

        // Add requested items that aren't already there
        const requestedItems = await Promise.all(topRequestedArray
            .filter(req => !seenTmdbIds.has(req.tmdbId))
            .map(async (req) => {
                try {
                    const mediaType = req.mediaType as 'movie' | 'tv'
                    const { poster_path, backdrop_path } = await tmdbService.getImagePaths(parseInt(req.tmdbId), mediaType)
                    return {
                        id: req.tmdbId,
                        title: req.title,
                        name: req.title,
                        poster_path,
                        backdrop_path,
                        media_type: mediaType,
                        tmdbId: parseInt(req.tmdbId),
                        trendingReason: 'Fortement demandé'
                    }
                } catch (e) {
                    return null
                }
            }))
        for (const item of requestedItems) {
            if (item) trendItems.push(item)
        }

        return {
            results: trendItems.sort(() => 0.5 - Math.random()),
            total_pages: 1
        }
    } catch (e) {
        error('[fetchServerTrends] Failed', e)
        return { results: [], total_pages: 0 }
    }
}

export async function toggleFavorite(itemId: string, isFavorite: boolean) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.email) return false

        const library = await getLibraryServer()
        const mediaService = library?.service
        if (!library || !mediaService) return false

        const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user.email)
        })

        const userId = getLibraryUserId(dbUser, library.type)
        if (!userId) return false
        
        await mediaService.updateFavoriteStatus(userId, itemId, isFavorite)
        mediaReads.clear()
        revalidatePath('/')
        return true
    } catch (e) {
        error('Failed to toggle favorite', e)
        return false
    }
}
