/**
 * Tracker Stats Service
 * 
 * Ce service permet de récupérer les statistiques de ratio/upload/download
 * depuis différents types de trackers privés.
 * 
 * Types supportés:
 * - gazelle: Trackers basés sur Gazelle (RED, OPS, etc.)
 * - unit3d: Trackers basés sur Unit3d (BLU, Aither, etc.)
 * - jackett/prowlarr: Via l'API Prowlarr/Jackett si disponible
 * - custom: API personnalisée
 */

import axios from 'axios'
import { getSetting } from '../settings'

const isDev = process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => { if (isDev) console.log(...args) }
const error = (...args: unknown[]) => { if (isDev) console.error(...args) }

export interface TrackerConfig {
  id: string
  name: string
  type: 'gazelle' | 'unit3d' | 'jackett' | 'custom' | 'scraper'
  baseUrl: string
  apiKey?: string
  username?: string
  password?: string
  passkey?: string
  enabled: boolean
  lastSync?: number
}

export interface TrackerStats {
  uploaded: number // bytes
  downloaded: number // bytes
  ratio: number
  uploadSpeed?: number // bytes/s
  downloadSpeed?: number // bytes/s
  bonusPoints?: number
  hitAndRuns?: number
  seedingCount?: number
  leechingCount?: number
  lastUpdated: number
}

// Storage key for tracker configs
const TRACKER_CONFIG_KEY = 'tracker_configs'

/**
 * Get all tracker configurations
 */
export async function getTrackerConfigs(): Promise<TrackerConfig[]> {
  try {
    const configsJson = await getSetting(TRACKER_CONFIG_KEY)
    if (!configsJson) return []
    return JSON.parse(configsJson as string) as TrackerConfig[]
  } catch (e) {
    error('[TrackerStats] Failed to get tracker configs:', e)
    return []
  }
}

/**
 * Save tracker configurations
 */
export async function saveTrackerConfigs(configs: TrackerConfig[]): Promise<void> {
  try {
    const { setSetting } = await import('../settings')
    const jsonValue = JSON.stringify(configs)
    log('[TrackerStats] Saving configs:', configs.length, 'trackers')
    await setSetting(TRACKER_CONFIG_KEY, jsonValue)
    log('[TrackerStats] Configs saved successfully')
  } catch (e) {
    error('[TrackerStats] Failed to save tracker configs:', e)
    throw e
  }
}

/**
 * Fetch stats from a Gazelle-based tracker
 */
async function fetchGazelleStats(config: TrackerConfig): Promise<TrackerStats | null> {
  try {
    // Gazelle API endpoint: /ajax.php?action=index
    const response = await axios.get(`${config.baseUrl}/ajax.php?action=index`, {
      headers: {
        'Authorization': config.apiKey,
        'Accept': 'application/json'
      },
      timeout: 30000
    })

    const data = response.data
    if (data.status !== 'success') {
      error('[TrackerStats] Gazelle API error:', data.error)
      return null
    }

    const user = data.response?.userstats || data.response
    if (!user) return null

    return {
      uploaded: parseInt(user.uploaded) || 0,
      downloaded: parseInt(user.downloaded) || 0,
      ratio: parseFloat(user.ratio) || 0,
      bonusPoints: parseInt(user.bonusPoints || user.points || 0),
      seedingCount: parseInt(user.seeding || 0),
      leechingCount: parseInt(user.leeching || 0),
      lastUpdated: Date.now()
    }
  } catch (e: any) {
    error('[TrackerStats] Failed to fetch Gazelle stats:', e.message)
    return null
  }
}

/**
 * Fetch stats from a Unit3d-based tracker
 */
async function fetchUnit3dStats(config: TrackerConfig): Promise<TrackerStats | null> {
  try {
    // Unit3d API endpoint: /api/user/profile
    const response = await axios.get(`${config.baseUrl}/api/user/profile`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/json'
      },
      timeout: 30000
    })

    const data = response.data
    const user = data.data || data

    return {
      uploaded: parseInt(user.uploaded) || 0,
      downloaded: parseInt(user.downloaded) || 0,
      ratio: parseFloat(user.ratio) || 0,
      bonusPoints: parseInt(user.bonus_points || user.bonusPoints || 0),
      seedingCount: parseInt(user.seeding || 0),
      leechingCount: parseInt(user.leeching || 0),
      lastUpdated: Date.now()
    }
  } catch (e: any) {
    error('[TrackerStats] Failed to fetch Unit3d stats:', e.message)
    return null
  }
}

/**
 * Fetch stats from Jackett/Prowlarr
 * Note: Most indexers don't expose user stats via these APIs
 */
async function fetchJackettStats(config: TrackerConfig): Promise<TrackerStats | null> {
  // Jackett/Prowlarr typically don't expose user ratio stats
  // This would require direct tracker API access
  log('[TrackerStats] Jackett/Prowlarr stats not directly available, requires direct tracker API')
  return null
}

/**
 * Fetch stats using Playwright browser automation (for French private trackers with Cloudflare)
 */
async function fetchScraperStats(config: TrackerConfig): Promise<TrackerStats | null> {
  try {
    const nameLower = config.name.toLowerCase()
    
    // Gemini uses API token only (no login needed)
    if (nameLower.includes('gemini')) {
      log('[TrackerStats] Using Gemini API')
      const token = config.apiKey || config.passkey
      if (!token) {
        error('[TrackerStats] Gemini requires an API token (apiKey or passkey)')
        return null
      }
      const { scrapeGemini } = await import('./tracker-playwright')
      const stats = await scrapeGemini(token)
      
      if (stats) {
        return {
          uploaded: stats.uploaded,
          downloaded: stats.downloaded,
          ratio: stats.ratio,
          bonusPoints: stats.bonus,
          lastUpdated: Date.now()
        }
      }
      return null
    }

    // TR4KER uses X-Api-Key only (no login needed)
    if (nameLower.includes('tr4ker') || nameLower.includes('traker')) {
      log('[TrackerStats] Using TR4KER API')
      const token = config.apiKey || config.passkey
      if (!token) {
        error('[TrackerStats] TR4KER requires an API key (apiKey or passkey)')
        return null
      }
      const { scrapeTr4ker } = await import('./tracker-playwright')
      const stats = await scrapeTr4ker(token, config.baseUrl || 'https://tr4ker.net')

      if (stats) {
        return {
          uploaded: stats.uploaded,
          downloaded: stats.downloaded,
          ratio: stats.ratio,
          bonusPoints: stats.bonus,
          lastUpdated: Date.now()
        }
      }
      return null
    }
    
    // Abnormal (abn.lol) - Playwright scraper with login/password
    if (nameLower.includes('abnormal') || nameLower.includes('abn')) {
      log('[TrackerStats] Using Playwright for Abnormal')
      if (!config.username || !config.password) {
        error('[TrackerStats] Abnormal requires username and password')
        return null
      }
      const { scrapeAbnormalPlaywright } = await import('./tracker-playwright')
      const stats = await scrapeAbnormalPlaywright(config.username, config.password, true)
      
      if (stats) {
        return {
          uploaded: stats.uploaded,
          downloaded: stats.downloaded,
          ratio: stats.ratio,
          bonusPoints: stats.bonus,
          lastUpdated: Date.now()
        }
      }
      return null
    }
    
    // TOS (theoldschool.cc) uses Unit3d-style API with API token
    if (nameLower.includes('tos') || nameLower.includes('theoldschool') || nameLower.includes('old school') || nameLower.includes('oldschool')) {
      log('[TrackerStats] Using TOS API')
      const token = config.apiKey || config.passkey
      if (!token) {
        error('[TrackerStats] TOS requires an API token')
        return null
      }
      const { scrapeTOS } = await import('./tracker-playwright')
      const stats = await scrapeTOS(token, config.baseUrl || 'https://theoldschool.cc')
      
      if (stats) {
        return {
          uploaded: stats.uploaded,
          downloaded: stats.downloaded,
          ratio: stats.ratio,
          bonusPoints: stats.bonus,
          lastUpdated: Date.now()
        }
      }
      return null
    }
    
    if (!config.username || !config.password) {
      error('[TrackerStats] Playwright scraper requires username and password:', config.name)
      return null
    }

    // Use Playwright for C411 and Torr9
    if (nameLower.includes('c411')) {
      log('[TrackerStats] Using Playwright for C411')
      const { scrapeC411Playwright } = await import('./tracker-playwright')
      const stats = await scrapeC411Playwright(config.username, config.password, true)
      
      if (stats) {
        return {
          uploaded: stats.uploaded,
          downloaded: stats.downloaded,
          ratio: stats.ratio,
          lastUpdated: Date.now()
        }
      }
      return null
    }
    
    if (nameLower.includes('torr9') || nameLower.includes('tor9')) {
      log('[TrackerStats] Using Playwright for Torr9')
      const { scrapeTorr9Playwright } = await import('./tracker-playwright')
      const stats = await scrapeTorr9Playwright(config.username, config.password, true)
      
      if (stats) {
        return {
          uploaded: stats.uploaded,
          downloaded: stats.downloaded,
          ratio: stats.ratio,
          bonusPoints: stats.bonus,
          lastUpdated: Date.now()
        }
      }
      return null
    }
    
    if (nameLower.includes('la cale') || nameLower.includes('lacale') || nameLower.includes('la-cale') || nameLower.includes('la calle') || nameLower.includes('lacalle')) {
      log('[TrackerStats] Using Playwright for La Cale')
      const { scrapeLaCalePlaywright } = await import('./tracker-playwright')
      const stats = await scrapeLaCalePlaywright(config.username, config.password, true)
      
      if (stats) {
        return {
          uploaded: stats.uploaded,
          downloaded: stats.downloaded,
          ratio: stats.ratio,
          bonusPoints: stats.bonus,
          lastUpdated: Date.now()
        }
      }
      return null
    }
    
    // Fallback to axios-based scraper for other trackers
    log('[TrackerStats] Using axios scraper for:', config.name)
    const { scrapeTracker } = await import('./tracker-scrapers')
    
    const stats = await scrapeTracker(config.name, {
      baseUrl: config.baseUrl,
      username: config.username,
      password: config.password,
      passkey: config.passkey || config.apiKey
    })
    
    if (stats) {
      return {
        ...stats,
        lastUpdated: Date.now()
      }
    }
    
    return null
  } catch (e: any) {
    error('[TrackerStats] Playwright scraper failed for', config.name, ':', e.message)
    return null
  }
}

/**
 * Fetch stats from custom API
 */
async function fetchCustomStats(config: TrackerConfig): Promise<TrackerStats | null> {
  // Custom implementation - would need specific logic per tracker
  log('[TrackerStats] Custom API stats fetch not implemented for', config.name)
  return null
}

/**
 * Fetch stats from a single tracker
 */
export async function fetchTrackerStats(config: TrackerConfig): Promise<TrackerStats | null> {
  if (!config.enabled) {
    log('[TrackerStats] Tracker disabled:', config.name)
    return null
  }

  log('[TrackerStats] Fetching stats for:', config.name, `(${config.type})`)

  switch (config.type) {
    case 'gazelle':
      return fetchGazelleStats(config)
    case 'unit3d':
      return fetchUnit3dStats(config)
    case 'jackett':
      return fetchJackettStats(config)
    case 'scraper':
      return fetchScraperStats(config)
    case 'custom':
      return fetchCustomStats(config)
    default:
      error('[TrackerStats] Unknown tracker type:', config.type)
      return null
  }
}

// In-memory cache with 2h TTL, survives as long as the Node.js process is alive
const TRACKER_STATS_CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
let trackerStatsCache: { stats: Map<string, TrackerStats>; fetchedAt: number } | null = null
let trackerStatsFetchPromise: Promise<Map<string, TrackerStats>> | null = null

// Per-tracker locks to prevent duplicate concurrent requests
const trackerLocks = new Map<string, Promise<TrackerStats | null>>()

async function fetchTrackerStatsWithLock(config: TrackerConfig): Promise<TrackerStats | null> {
  const lockKey = config.id
  
  // If already fetching this tracker, wait for it
  if (trackerLocks.has(lockKey)) {
    log(`[TrackerStats] Lock active for ${config.name}, waiting...`)
    return trackerLocks.get(lockKey)!
  }
  
  // Create new fetch promise
  const fetchPromise = fetchTrackerStats(config).finally(() => {
    trackerLocks.delete(lockKey)
  })
  
  trackerLocks.set(lockKey, fetchPromise)
  return fetchPromise
}

/**
 * Fetch stats from all enabled trackers
 * @param force - If true, bypass cache and always fetch fresh
 */
export async function fetchAllTrackerStats(force: boolean = false): Promise<Map<string, TrackerStats>> {
  // Serve from cache if fresh
  if (!force && trackerStatsCache) {
    const age = Date.now() - trackerStatsCache.fetchedAt
    if (age < TRACKER_STATS_CACHE_TTL_MS) {
      log(`[TrackerStats] Using cached stats (age: ${(age / 1000).toFixed(0)}s)`)
      return new Map(trackerStatsCache.stats)
    }
    log('[TrackerStats] Cache expired, fetching fresh data')
  }
  
  // If a fetch is already in-flight, piggyback on it to avoid duplicate concurrent fetches
  if (trackerStatsFetchPromise) {
    log('[TrackerStats] Fetch already in progress, waiting for it...')
    return trackerStatsFetchPromise
  }
  
  trackerStatsFetchPromise = (async () => {
    try {
      const configs = await getTrackerConfigs()
      const results = new Map<string, TrackerStats>()

      const enabledConfigs = configs.filter(c => c.enabled)

      // Exécute le scraping de tous les trackers en parallèle pour un gain de temps massif !
      const statsResults = await Promise.all(
        enabledConfigs.map(async (config) => {
          const stats = await fetchTrackerStatsWithLock(config)
          return { id: config.id, stats, config }
        })
      )

      for (const { id, stats, config } of statsResults) {
        if (stats) {
          results.set(id, stats)
          config.lastSync = Date.now()
        }
      }

      await saveTrackerConfigs(configs)
      
      // Update cache
      trackerStatsCache = { stats: new Map(results), fetchedAt: Date.now() }
      log(`[TrackerStats] Cache updated with ${results.size} trackers`)
      
      return results
    } finally {
      trackerStatsFetchPromise = null
    }
  })()
  
  return trackerStatsFetchPromise
}

/**
 * Invalidate the tracker stats cache (called when trackers are modified)
 */
export function invalidateTrackerStatsCache(): void {
  log('[TrackerStats] Cache invalidated')
  trackerStatsCache = null
}

/**
 * Get cache info (useful for UI to show freshness)
 */
export function getTrackerStatsCacheInfo(): { cached: boolean; age?: number; expiresIn?: number } {
  if (!trackerStatsCache) return { cached: false }
  const age = Date.now() - trackerStatsCache.fetchedAt
  return {
    cached: true,
    age,
    expiresIn: Math.max(0, TRACKER_STATS_CACHE_TTL_MS - age)
  }
}

/**
 * Format bytes to human readable
 */
export function formatTrackerBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format ratio with color indicator
 */
export function getRatioColor(ratio: number): string {
  if (ratio < 1) return 'text-red-400'
  if (ratio < 2) return 'text-yellow-400'
  return 'text-emerald-400'
}
