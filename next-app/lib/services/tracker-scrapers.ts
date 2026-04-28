/**
 * Tracker Scrapers for French Private Trackers
 * 
 * These trackers don't have standard APIs (not Gazelle/Unit3d)
 * We need to scrape the profile page to get stats
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const isDev = process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => { if (isDev) console.log(...args) }
const error = (...args: unknown[]) => { if (isDev) console.error(...args) }

export interface ScraperConfig {
  baseUrl: string
  username: string
  password: string
  passkey?: string
  apiKey?: string
}

export interface TrackerStats {
  uploaded: number
  downloaded: number
  ratio: number
  bonusPoints?: number
  seedingCount?: number
  leechingCount?: number
}

/**
 * C411 Scraper
 * URL: https://c411.org
 * Type: Private tracker with CSRF protection
 * 
 * IMPORTANT: Use cookies from browser instead of login
 * Copy from browser: _c411_session=xxx;__csrf=yyy
 * Paste in "Passkey" field
 */
export async function scrapeC411(config: ScraperConfig): Promise<TrackerStats | null> {
  try {
    log('[C411] Starting scrape for:', config.baseUrl)
    
    // Get cookies from passkey field (format: "_c411_session=xxx;__csrf=yyy")
    const manualCookies = config.passkey || config.apiKey
    
    if (!manualCookies) {
      error('[C411] No cookies provided. Please copy cookies from browser and paste in Passkey field.')
      error('[C411] Format: _c411_session=xxx;__csrf=yyy')
      return null
    }
    
    log('[C411] Using manual cookies from passkey field')

    const client = axios.create({
      baseURL: config.baseUrl.replace(/\/$/, ''),
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Referer': config.baseUrl,
        'Cookie': manualCookies
      },
      maxRedirects: 5,
      validateStatus: () => true
    })

    // Get profile page directly with provided cookies
    log('[C411] Fetching profile page with cookies...')
    const profileRes = await client.get('/dashboard', {
      headers: {
        'Referer': config.baseUrl
      }
    })
    
    log('[C411] Profile page status:', profileRes.status)
    log('[C411] Profile URL:', profileRes.request?.res?.responseUrl || 'N/A')
    
    // Check if we got redirected to login (meaning cookies are invalid)
    if (profileRes.request?.res?.responseUrl?.includes('login') ||
        profileRes.data?.includes('Connexion') ||
        profileRes.data?.includes('login')) {
      error('[C411] Cookies expired or invalid - redirected to login')
      return null
    }
    
    log('[C411] Profile page loaded, length:', profileRes.data?.length)
    
    const $ = cheerio.load(profileRes.data)

    // Parse stats from profile page - try multiple selectors
    let uploaded = 0
    let downloaded = 0
    let ratio = 0

    // Debug: log HTML structure around stats
    const htmlPreview = profileRes.data?.substring(0, 2000)
    log('[C411] HTML preview:', htmlPreview)

    // Try multiple patterns for XBTIT-based trackers
    // Pattern 1: Look for table rows with Upload/Download text
    $('tr, .table-row').each((i, elem) => {
      const rowText = $(elem).text().toLowerCase()
      if (rowText.includes('upload') && rowText.includes('download')) {
        log('[C411] Found potential stats row:', rowText.substring(0, 200))
      }
    })

    // Pattern 2: Look for specific stats containers
    const uploadText = 
      $('td:contains("Upload")').next().text() || 
      $('td:contains("UP")').next().text() ||
      $('.uploaded').text() ||
      $('[class*="upload"]').text() ||
      $('td').filter(function() {
        return $(this).text().toLowerCase().includes('upload')
      }).next().text()
    
    const downloadText = 
      $('td:contains("Download")').next().text() || 
      $('td:contains("DOWN")').next().text() ||
      $('.downloaded').text() ||
      $('[class*="download"]').text() ||
      $('td').filter(function() {
        return $(this).text().toLowerCase().includes('download')
      }).next().text()
    
    const ratioText = 
      $('td:contains("Ratio")').next().text() || 
      $('.ratio').text() ||
      $('[class*="ratio"]').text() ||
      $('td').filter(function() {
        return $(this).text().toLowerCase().includes('ratio')
      }).next().text()

    log('[C411] Raw extracted text:', { uploadText, downloadText, ratioText })

    if (uploadText) {
      uploaded = parseBytes(uploadText.trim())
    }
    if (downloadText) {
      downloaded = parseBytes(downloadText.trim())
    }
    if (ratioText) {
      ratio = parseFloat(ratioText.trim().replace(',', '.').replace(/[^\d.]/g, ''))
    }

    // Calculate ratio if not found
    if (ratio === 0 && downloaded > 0) {
      ratio = uploaded / downloaded
    }

    log('[C411] Parsed stats:', { uploaded, downloaded, ratio })

    if (uploaded === 0 && downloaded === 0) {
      error('[C411] No stats found - parsing failed')
      return null
    }

    return {
      uploaded,
      downloaded,
      ratio,
      lastUpdated: Date.now()
    } as TrackerStats
  } catch (e) {
    error('[C411] Scrape failed:', (e as Error).message)
    error('[C411] Full error:', e)
    return null
  }
}

/**
 * La-Cale Scraper
 */
export async function scrapeLaCale(config: ScraperConfig): Promise<TrackerStats | null> {
  // Similar implementation for La-Cale
  log('[LaCale] Scraper not fully implemented yet')
  return null
}

/**
 * The Old School Scraper
 */
export async function scrapeTheOldSchool(config: ScraperConfig): Promise<TrackerStats | null> {
  // Similar implementation for The Old School
  log('[TheOldSchool] Scraper not fully implemented yet')
  return null
}

/**
 * Tor9 Scraper (if it has user stats)
 */
export async function scrapeTor9(config: ScraperConfig): Promise<TrackerStats | null> {
  // Tor9 might not have private user stats
  log('[Tor9] Scraper not fully implemented yet')
  return null
}

/**
 * Helper to parse byte strings like "1.5 GB", "234.56 MB", etc.
 */
function parseBytes(text: string): number {
  if (!text) return 0
  
  const match = text.match(/([\d.,]+)\s*(B|KB|MB|GB|TB|PB)/i)
  if (!match) return 0
  
  const value = parseFloat(match[1].replace(',', '.'))
  const unit = match[2].toUpperCase()
  
  const multipliers: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024,
    'PB': 1024 * 1024 * 1024 * 1024 * 1024
  }
  
  return Math.floor(value * (multipliers[unit] || 1))
}

/**
 * Generic scraper dispatcher
 */
export async function scrapeTracker(
  name: string, 
  config: ScraperConfig
): Promise<TrackerStats | null> {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  switch (normalizedName) {
    case 'c411':
    case 'c411org':
      return scrapeC411(config)
    case 'lacale':
      return scrapeLaCale(config)
    case 'theoldschool':
    case 'oldschool':
      return scrapeTheOldSchool(config)
    case 'tor9':
      return scrapeTor9(config)
    default:
      error(`[Scraper] No scraper available for: ${name}`)
      return null
  }
}
