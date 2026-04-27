'use server'

import { getQBittorrentServiceForUser } from '@/lib/auth'
import { getQBittorrentService } from '@/lib/services/qbittorrent'
import { getTmdbService } from '@/lib/services/tmdb'
import { getIGDBService } from '@/lib/services/igdb'
import { getProwlarrService } from '@/lib/services/prowlarr'
import { parseTorrentName, ParsedTorrentName, MediaType } from '@/lib/torrent-parser'
import { checkAccess } from '../actions'
import { Torrent } from '@/lib/services/qbittorrent'
import { IndexerField } from '@/lib/services/prowlarr'

// Typed shapes for external API responses to avoid `any`
interface TmdbGenre { name: string }
interface TmdbCastMember {
  name: string
  character?: string
  profile_path?: string
  roles?: Array<{ character: string }>
}
interface IgdbPlatform { name: string }
interface IgdbGameMode { name: string }

const isDev = process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => { if (isDev) console.log(...args) }
const error = (...args: unknown[]) => { if (isDev) console.error(...args) }

// Cache for Prowlarr indexers
let prowlarrIndexersCache: Map<string, string> | null = null
let prowlarrCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Cache for torrent page URLs (hash -> infoUrl)
// Long cache duration to avoid hitting API limits on private trackers
const torrentPageUrlCache = new Map<string, { url: string | null; time: number; searched: boolean }>()
const URL_CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
const URL_CACHE_NOT_FOUND_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days for "not found" results

/**
 * Get Prowlarr indexers and build a name->baseUrl mapping
 */
async function getProwlarrIndexersMap(): Promise<Map<string, string>> {
  const now = Date.now()
  if (prowlarrIndexersCache && (now - prowlarrCacheTime) < CACHE_TTL) {
    return prowlarrIndexersCache
  }

  const prowlarrService = await getProwlarrService()
  if (!prowlarrService) {
    return new Map()
  }

  try {
    const indexers = await prowlarrService.getIndexers()
    const map = new Map<string, string>()

    for (const indexer of indexers) {
      if (!indexer.enable) continue

      // Store by name (lowercase for case-insensitive matching)
      const name = indexer.name.toLowerCase()

      // Try to get base URL from fields if available
      let baseUrl = ''
      if (indexer.fields) {
        const baseUrlField = (indexer.fields as IndexerField[]).find((f) =>
          f.name === 'baseUrl' || f.name === 'baseurl' || f.name === 'apiUrl'
        )
        if (baseUrlField && baseUrlField.value) {
          baseUrl = String(baseUrlField.value)
        }
      }

      // If no base URL in fields, try to extract from infoLink
      if (!baseUrl && indexer.infoLink) {
        try {
          const url = new URL(indexer.infoLink)
          baseUrl = `${url.protocol}//${url.host}/`
        } catch (e) {
          // infoLink might not be a valid URL
          baseUrl = indexer.infoLink
        }
      }

      map.set(name, baseUrl || '')
      log('[Prowlarr] Indexed:', indexer.name, '->', baseUrl)
    }

    prowlarrIndexersCache = map
    prowlarrCacheTime = now
    return map
  } catch (e) {
    error('[Prowlarr] Failed to get indexers:', e)
    return new Map()
  }
}

// Extended torrent info with parsed data
export interface EnrichedTorrentInfo {
  torrent: Torrent
  parsed: ParsedTorrentName
  mediaInfo: MediaInfo | null
}

export interface MediaInfo {
  mediaType: MediaType;
  title: string;
  year?: number;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  vote_average?: number;
  vote_count?: number;
  runtime?: number;
  genres?: string[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  platforms?: string[];
  developers?: string[];
  cast?: Array<{
    name: string;
    character?: string;
    profile_path?: string;
  }>;
  igdbId?: number
  publishers?: string[]
  gameModes?: string[]
  // Common
  externalUrl?: string
}

/**
 * Get enriched torrent information with parsed name and media metadata
 */
export async function getTorrentDetails(hash: string): Promise<EnrichedTorrentInfo | null> {
  try {
    // Check permissions
    await checkAccess('downloads.view')

    // Get qBittorrent service
    const qbtService = await getQBittorrentServiceForUser()
    if (!qbtService) {
      throw new Error('Service QBittorrent non configuré')
    }

    // Get all torrents and find the one we need
    const torrents = await qbtService.getTorrents()
    const torrent = torrents.find(t => t.hash.toLowerCase() === hash.toLowerCase())

    if (!torrent) {
      return null
    }

    // Parse the torrent name
    const parsed = parseTorrentName(torrent.name)
    log('[TorrentDetails] Parsed:', parsed)

    // Fetch media info based on type
    let mediaInfo: MediaInfo | null = null

    if (parsed.mediaType === 'movie' || parsed.mediaType === 'tv') {
      mediaInfo = await fetchTMDBInfo(parsed)
    } else if (parsed.mediaType === 'game') {
      mediaInfo = await fetchIGDBInfo(parsed)
    }

    return {
      torrent,
      parsed,
      mediaInfo
    }
  } catch (e) {
    error('[getTorrentDetails] Error:', e)
    throw e
  }
}

/**
 * Fetch TMDB info for movies and TV shows
 */
async function fetchTMDBInfo(parsed: ParsedTorrentName): Promise<MediaInfo | null> {
  const tmdbService = await getTmdbService()
  if (!tmdbService) {
    log('[TMDB] Service not available')
    return null
  }

  try {
    const searchQuery = parsed.title
    const mediaType = parsed.mediaType as 'movie' | 'tv'

    log('[TMDB] Searching for:', searchQuery, 'type:', mediaType)

    // Search for the media
    const searchResults = await tmdbService.search(mediaType, searchQuery)
    
    if (!searchResults.results || searchResults.results.length === 0) {
      log('[TMDB] No results found')
      return null
    }

    // Find the best match
    let bestMatch = searchResults.results[0]
    
    // If we have a year, try to find a matching result
    if (parsed.year) {
      const targetYear = parsed.year
      const withYear = searchResults.results.find((r: { release_date?: string; first_air_date?: string }) => {
        const releaseDate = r.release_date || r.first_air_date
        if (releaseDate) {
          const year = new Date(releaseDate).getFullYear()
          return year === targetYear || Math.abs(year - targetYear) <= 1
        }
        return false
      })
      if (withYear) {
        bestMatch = withYear
      }
    }

    // Get full details
    const details = await tmdbService.getDetails(bestMatch.id, mediaType)
    
    if (!details) {
      return null
    }

    // Build external URL
    const externalUrl = mediaType === 'movie'
      ? `https://www.themoviedb.org/movie/${bestMatch.id}`
      : `https://www.themoviedb.org/tv/${bestMatch.id}`

    // Extract cast
    const rawCredits = mediaType === 'tv' ? (details.aggregate_credits || { cast: [] }) : (details.credits || { cast: [] })
    const cast = (rawCredits.cast || []).slice(0, 10).map((c: TmdbCastMember) => ({
      name: c.name,
      character: mediaType === 'tv' ? (c.roles?.map((r) => r.character).join(' / ') || c.character) : c.character,
      profile_path: c.profile_path
    }))

    const result: MediaInfo = {
      mediaType: parsed.mediaType,
      title: details.title || details.name || parsed.title,
      overview: details.overview,
      backdropUrl: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : undefined,
      posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined,
      year: parsed.year || (details.release_date ? new Date(details.release_date).getFullYear() : undefined) || (details.first_air_date ? new Date(details.first_air_date).getFullYear() : undefined),
      vote_average: details.vote_average,
      vote_count: details.vote_count,
      genres: (details.genres || []).map((g: TmdbGenre) => g.name),
      runtime: details.runtime,
      number_of_seasons: details.number_of_seasons,
      number_of_episodes: details.number_of_episodes,
      cast,
      externalUrl
    }

    log('[TMDB] Found info:', result.title, result.year)
    return result
  } catch (e) {
    error('[TMDB] Error fetching info:', e)
    return null
  }
}

/**
 * Fetch IGDB info for games
 */
async function fetchIGDBInfo(parsed: ParsedTorrentName): Promise<MediaInfo | null> {
  const igdbService = getIGDBService()
  
  try {
    const searchQuery = parsed.title
    log('[IGDB] Searching for:', searchQuery)

    const games = await igdbService.searchGames(searchQuery, 5)
    
    if (!games || games.length === 0) {
      log('[IGDB] No results found')
      return null
    }

    // Find best match - prefer exact match, then closest
    let bestMatch = games[0]
    
    for (const game of games) {
      if (game.name.toLowerCase() === searchQuery.toLowerCase()) {
        bestMatch = game
        break
      }
    }

    // Get full details
    const gameDetails = await igdbService.getGameById(bestMatch.id)
    
    if (!gameDetails) {
      return null
    }

    // Build external URL (Steam if available, otherwise IGDB)
    let externalUrl = `https://www.igdb.com/games/${gameDetails.name.toLowerCase().replace(/\s+/g, '-')}`
    const steamWebsite = gameDetails.websites?.find(w => w.url.includes('store.steampowered.com'))
    if (steamWebsite) {
      externalUrl = steamWebsite.url
    }

    const result: MediaInfo = {
      mediaType: 'game',
      title: gameDetails.name,
      overview: gameDetails.summary || gameDetails.storyline,
      posterUrl: igdbService.getCoverUrl(gameDetails.cover) || undefined,
      backdropUrl: gameDetails.artworks?.[0] ? igdbService.getImageUrl(gameDetails.artworks[0], '1080p') || undefined : undefined,
      year: gameDetails.first_release_date ? new Date(gameDetails.first_release_date * 1000).getFullYear() : undefined,
      vote_average: gameDetails.aggregated_rating ? gameDetails.aggregated_rating / 10 : (gameDetails.rating ? gameDetails.rating / 10 : undefined),
      igdbId: gameDetails.id,
      platforms: (gameDetails.platforms || []).map((p: IgdbPlatform) => p.name),
      developers: igdbService.getDevelopers(gameDetails.involved_companies),
      publishers: igdbService.getPublishers(gameDetails.involved_companies),
      gameModes: (gameDetails.game_modes || []).map((m: IgdbGameMode) => m.name),
      externalUrl
    }

    log('[IGDB] Found info:', result.title, result.year)
    return result
  } catch (e) {
    error('[IGDB] Error fetching info:', e)
    return null
  }
}

/**
 * Identify tracker from hostname/URL and match with Prowlarr indexers
 * Returns: { id: string, name: string, baseUrl: string } | null
 */
async function identifyTracker(trackerStr: string): Promise<{ id: string; name: string; baseUrl: string } | null> {
  if (!trackerStr) return null

  const normalized = trackerStr.toLowerCase()
  const prowlarrIndexers = await getProwlarrIndexersMap()

  // First, try to match with Prowlarr indexers by checking if tracker URL contains indexer name
  for (const [indexerName, baseUrl] of prowlarrIndexers.entries()) {
    // Check if tracker string contains the indexer name (or vice versa)
    if (normalized.includes(indexerName) || indexerName.includes(normalized.replace(/[^a-z0-9]/g, ''))) {
      return {
        id: indexerName.replace(/[^a-z0-9]/g, '_'),
        name: indexerName.charAt(0).toUpperCase() + indexerName.slice(1),
        baseUrl: baseUrl
      }
    }
  }

  // Fallback to known trackers if Prowlarr match fails
  const knownTrackers: Record<string, { name: string; baseUrl: string }> = {
    ygg: { name: 'YGG', baseUrl: 'https://www.yggtorrent.top/' },
    '1337x': { name: '1337x', baseUrl: 'https://1337x.to/' },
    rarbg: { name: 'RARBG', baseUrl: 'https://rarbgtorrents.org/' },
    tpb: { name: 'TPB', baseUrl: 'https://thepiratebay.org/' },
    torrentgalaxy: { name: 'TorrentGalaxy', baseUrl: 'https://torrentgalaxy.to/' },
    fitgirl: { name: 'FitGirl', baseUrl: 'https://fitgirl-repacks.site/' }
  }

  for (const [key, info] of Object.entries(knownTrackers)) {
    if (normalized.includes(key)) {
      return { id: key, name: info.name, baseUrl: info.baseUrl }
    }
  }

  // Try to extract domain from tracker URL as last resort
  try {
    const url = new URL(trackerStr)
    const domain = url.hostname.toLowerCase()
    // Check if any Prowlarr indexer URL matches this domain
    for (const [indexerName, indexerUrl] of prowlarrIndexers.entries()) {
      if (indexerUrl && indexerUrl.includes(domain)) {
        return {
          id: indexerName.replace(/[^a-z0-9]/g, '_'),
          name: indexerName.charAt(0).toUpperCase() + indexerName.slice(1),
          baseUrl: indexerUrl
        }
      }
    }
  } catch (e) {
    // Not a valid URL, ignore
  }

  return null
}

/**
 * Get tracker info (name and base URL) for a torrent
 */
export async function getTrackerInfo(tracker: string): Promise<{ name: string; baseUrl: string } | null> {
  const info = await identifyTracker(tracker)
  if (!info) return null
  return { name: info.name, baseUrl: info.baseUrl }
}

/**
 * Find Prowlarr indexer ID for a given tracker URL
 */
async function findIndexerIdForTracker(trackerUrl: string): Promise<number | null> {
  if (!trackerUrl) return null
  
  try {
    const indexers = await getProwlarrIndexersMap()
    const trackerInfo = await identifyTracker(trackerUrl)
    
    if (!trackerInfo) return null
    
    // Look for indexer by name
    for (const [name, baseUrl] of indexers.entries()) {
      if (name.toLowerCase() === trackerInfo.name.toLowerCase()) {
        // Get full indexer details to find the ID
        const prowlarr = await getProwlarrService()
        if (!prowlarr) return null
        
        const allIndexers = await prowlarr.getIndexers()
        const indexer = allIndexers.find(i => i.name.toLowerCase() === name.toLowerCase() && i.enable)
        if (indexer) {
          log('[findIndexerIdForTracker] Found indexer ID', indexer.id, 'for', trackerInfo.name)
          return indexer.id
        }
      }
    }
    
    return null
  } catch (e) {
    error('[findIndexerIdForTracker] Error:', e)
    return null
  }
}

/**
 * Get torrent page URL with caching
 * 1. Check cache first
 * 2. Try to get from torrent comment (stored by some trackers)
 * 3. Search in Prowlarr as fallback (filtered by tracker if possible)
 * 4. Cache the result
 */
export async function getTorrentPageUrl(
  torrentHash: string,
  torrentName: string,
  torrentSize: number,
  trackerUrl?: string
): Promise<string | null> {
  const now = Date.now()

  // 1. Check cache first
  const cached = torrentPageUrlCache.get(torrentHash)
  if (cached) {
    const ttl = cached.url ? URL_CACHE_TTL : URL_CACHE_NOT_FOUND_TTL
    if ((now - cached.time) < ttl) {
      log('[getTorrentPageUrl] Using cached URL for:', torrentHash, cached.url ? '(found)' : '(not found)')
      return cached.url
    }
  }

  // 2. Try to get from torrent comment via qBittorrent
  try {
    const qbtService = await getQBittorrentService()
    if (qbtService) {
      const properties = await qbtService.getTorrentProperties(torrentHash)
      if (properties?.comment) {
        // Check if comment looks like a URL (many trackers put the torrent page URL here)
        const comment = properties.comment.trim()
        if (comment.startsWith('http://') || comment.startsWith('https://')) {
          log('[getTorrentPageUrl] Found URL in torrent comment:', comment)
          torrentPageUrlCache.set(torrentHash, { url: comment, time: now, searched: true })
          return comment
        }
      }
    }
  } catch (e) {
    log('[getTorrentPageUrl] Failed to get torrent properties:', e)
  }

  // 3. Fallback: Search in Prowlarr
  const prowlarrService = await getProwlarrService()
  if (!prowlarrService) {
    log('[getTorrentPageUrl] Prowlarr not configured')
    torrentPageUrlCache.set(torrentHash, { url: null, time: now, searched: true })
    return null
  }

  try {
    // Try to find indexer ID for this tracker to filter results
    const indexerId = trackerUrl ? await findIndexerIdForTracker(trackerUrl) : null
    
    log('[getTorrentPageUrl] Searching Prowlarr for:', torrentName, indexerId ? `(indexer: ${indexerId})` : '(all indexers)')

    const results = await prowlarrService.search(
      torrentName, 
      indexerId ? [indexerId] : undefined, 
      undefined, 
      50
    )

    if (!results || results.length === 0) {
      log('[getTorrentPageUrl] No results found')
      torrentPageUrlCache.set(torrentHash, { url: null, time: now, searched: true })
      return null
    }

    // Try to find the best match by comparing sizes (within 10% tolerance)
    const sizeTolerance = 0.10
    let bestMatch = results.find(r => {
      if (!r.size || !torrentSize) return false
      const sizeDiff = Math.abs(r.size - torrentSize) / torrentSize
      return sizeDiff <= sizeTolerance
    })

    // If no size match, take the first result with an infoUrl
    if (!bestMatch) {
      bestMatch = results.find(r => r.infoUrl)
    }

    if (bestMatch && bestMatch.infoUrl) {
      log('[getTorrentPageUrl] Found match:', bestMatch.title, '->', bestMatch.infoUrl)
      torrentPageUrlCache.set(torrentHash, { url: bestMatch.infoUrl, time: now, searched: true })
      return bestMatch.infoUrl
    }

    log('[getTorrentPageUrl] No match with infoUrl found')
    torrentPageUrlCache.set(torrentHash, { url: null, time: now, searched: true })
    return null
  } catch (e) {
    error('[getTorrentPageUrl] Error searching Prowlarr:', e)
    torrentPageUrlCache.set(torrentHash, { url: null, time: now, searched: true })
    return null
  }
}

/**
 * Format bytes to human readable string
 */
export async function formatBytes(bytes: number): Promise<string> {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format speed to human readable string
 */
export async function formatSpeed(bytesPerSecond: number): Promise<string> {
  if (bytesPerSecond === 0) return '0 B/s'
  return formatBytes(bytesPerSecond) + '/s'
}

/**
 * Format seconds to time string
 */
export async function formatDuration(seconds: number): Promise<string> {
  if (seconds <= 0) return 'Terminé'
  if (seconds >= 8640000) return '∞'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}j ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
