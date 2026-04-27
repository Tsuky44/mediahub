/**
 * Tracker Playwright Scraper Service
 * Uses real browser automation to bypass Cloudflare protection
 * Based on api-ratio-main project
 */

import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright'
import { promises as fs } from 'fs'
import path from 'path'

// Simple logging helpers - always log for tracker debugging
const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const enableLogging = !isTest // Enable in dev and production, disable in tests
const log = (...args: unknown[]) => { if (enableLogging) console.log(...args) }
const error = (...args: unknown[]) => { if (enableLogging) console.error(...args) }

const COOKIES_DIR = path.join(process.cwd(), '.config')

// Ensure cookies directory exists
async function ensureCookiesDir() {
  try {
    await fs.mkdir(COOKIES_DIR, { recursive: true })
  } catch {
    // Directory might already exist
  }
}

async function loadCookies(filename: string): Promise<any[] | null> {
  try {
    const filePath = path.join(COOKIES_DIR, filename)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function saveCookies(filename: string, cookies: unknown[]) {
  await ensureCookiesDir()
  const filePath = path.join(COOKIES_DIR, filename)
  await fs.writeFile(filePath, JSON.stringify(cookies), { mode: 0o600 })
}

async function loadToken(filename: string): Promise<string | null> {
  try {
    const filePath = path.join(COOKIES_DIR, filename)
    const data = await fs.readFile(filePath, 'utf-8')
    return data.trim()
  } catch {
    return null
  }
}

async function saveToken(filename: string, token: string) {
  await ensureCookiesDir()
  const filePath = path.join(COOKIES_DIR, filename)
  await fs.writeFile(filePath, token, { mode: 0o600 })
}

// Realistic user agents (rotated for anti-detection)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
]
const defaultUserAgent = USER_AGENTS[0]

// Pick random user agent for anti-fingerprinting
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// Random delay between min and max ms (simulate human behavior)
async function randomDelay(min: number = 500, max: number = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Create a browser context with anti-bot protections
 */
async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport: { width: 1920, height: 1080 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    geolocation: { latitude: 48.8566, longitude: 2.3522 }, // Paris
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Upgrade-Insecure-Requests': '1',
    },
  })

  // Override navigator properties to hide automation
  await context.addInitScript(() => {
    // Hide webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    
    // Fake plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5].map(() => ({ name: 'plugin' }))
    })
    
    // Fake languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['fr-FR', 'fr', 'en-US', 'en']
    })
    
    // Fake platform
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' })
  })

  return context
}

/**
 * Launch browser with stealth settings
 */
async function launchStealthBrowser(headless: boolean = true): Promise<Browser> {
  const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  
  if (systemChromium) {
    log('[Playwright] Using system Chromium:', systemChromium)
    return chromium.launch({
      headless,
      executablePath: systemChromium,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--window-size=1920,1080',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    })
  }
  
  return chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  })
}

export interface PlaywrightStats {
  uploaded: number
  downloaded: number
  ratio: number
  bonus?: number
}

/**
 * C411 Scraper using Playwright
 */
export async function scrapeC411Playwright(username: string, password: string, headless: boolean = true): Promise<{ uploaded: number; downloaded: number; ratio: number; bonus?: number } | null> {
  const COOKIES_FILE = 'c411_cookies.json'
  const LOGIN_URL = 'https://c411.org/login'
  const STATS_URL = 'https://c411.org/api/auth/me'

  let browser: Browser | null = null

  try {
    log('[C411-Playwright] Starting browser...')
    
    browser = await launchStealthBrowser(headless)
    const context = await createStealthContext(browser)
    const page = await context.newPage()

    // Try to load existing cookies (optional, for non-Docker environments)
    let existingCookies: Cookie[] | null = null
    try {
      existingCookies = await loadCookies(COOKIES_FILE)
      if (existingCookies && existingCookies.length > 0) {
        log(`[C411-Playwright] Loading ${existingCookies.length} existing cookies...`)
        await context.addCookies(existingCookies)
      } else {
        log('[C411-Playwright] No existing cookies found, will need to login')
      }
    } catch (e) {
      log('[C411-Playwright] Could not load cookies (normal in Docker):', (e as Error).message)
    }

    // Try to fetch stats
    log('[C411-Playwright] Fetching stats from API...')
    let response = await context.request.get(STATS_URL, { timeout: 30000 })
    let apiData: Record<string, unknown> = {}
    let responseStatus = response.status()
    log(`[C411-Playwright] Initial API response status: ${responseStatus}`)

    if (responseStatus === 200) {
      try {
        apiData = await response.json()
        log('[C411-Playwright] API data received:', JSON.stringify(apiData).substring(0, 200))
      } catch (e) {
        log('[C411-Playwright] Failed to parse API response:', (e as Error).message)
      }
    } else {
      log(`[C411-Playwright] API returned status ${responseStatus}, need to login`)
    }

    // If not authenticated, login
    if (!apiData?.authenticated) {
      log('[C411-Playwright] Not authenticated, navigating to login page...')
      
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 })
      log('[C411-Playwright] Login page loaded')
      
      await randomDelay(2000, 4000) // Wait for page to stabilize
      
      // Check if login form exists
      const usernameInput = await page.locator('input[name="username"], input[placeholder*="Pseudo"], input[type="text"]').first()
      const passwordInput = await page.locator('input[name="password"], input[placeholder*="Mot de passe"], input[type="password"]').first()
      
      if (await usernameInput.count() === 0) {
        error('[C411-Playwright] Username input not found on login page')
        return null
      }
      
      log('[C411-Playwright] Filling login form...')
      await usernameInput.fill(username)
      await randomDelay(300, 800)
      await passwordInput.fill(password)
      await randomDelay(500, 1500)

      // Click login button - try multiple selectors
      const connexionBtn = await page.locator('button:has-text("CONNEXION"), button:has-text("Connexion")').first()
      const emeraldBtn = await page.locator('button.bg-emerald-500, button.bg-emerald-600').first()
      const submitBtn = await page.locator('button[type="submit"]').first()
      
      if (await connexionBtn.count() > 0) {
        log('[C411-Playwright] Clicking CONNEXION button...')
        await connexionBtn.click()
      } else if (await emeraldBtn.count() > 0) {
        log('[C411-Playwright] Clicking emerald button...')
        await emeraldBtn.click()
      } else if (await submitBtn.count() > 0) {
        log('[C411-Playwright] Clicking submit button...')
        await submitBtn.click()
      } else {
        log('[C411-Playwright] No login button found, pressing Enter')
        await page.keyboard.press('Enter')
      }

      log('[C411-Playwright] Waiting for login to complete...')
      try {
        await Promise.race([
          page.waitForURL(/dashboard|home|^https:\/\/c411\.org\/$/, { timeout: 30000 }),
          page.waitForTimeout(10000)
        ])
      } catch {
        await page.waitForTimeout(5000)
      }

      // Check if login succeeded by fetching stats again
      log('[C411-Playwright] Checking authentication after login...')
      response = await context.request.get(STATS_URL, { timeout: 30000 })
      responseStatus = response.status()
      log(`[C411-Playwright] Post-login API response status: ${responseStatus}`)
      
      if (responseStatus === 200) {
        try {
          apiData = await response.json()
          log('[C411-Playwright] Post-login API data:', JSON.stringify(apiData).substring(0, 200))
        } catch (e) {
          log('[C411-Playwright] Failed to parse post-login API response:', (e as Error).message)
        }
      }

      if (!apiData?.authenticated) {
        error('[C411-Playwright] Login failed - not authenticated after login attempt')
        // Try to get page content for debugging
        try {
          const currentUrl = page.url()
          log('[C411-Playwright] Current URL after login attempt:', currentUrl)
          const pageContent = await page.content()
          if (pageContent.includes('incorrect') || pageContent.includes('invalid')) {
            error('[C411-Playwright] Page indicates invalid credentials')
          }
        } catch {}
        return null
      }

      // Save cookies for next time (optional in Docker)
      try {
        const cookies = await context.cookies()
        await saveCookies(COOKIES_FILE, cookies)
        log(`[C411-Playwright] Cookies saved (${cookies.length} cookies)`)
      } catch (e) {
        log('[C411-Playwright] Could not save cookies (normal in Docker):', (e as Error).message)
      }
    }

    // Extract stats
    const userData = apiData?.user as { uploaded?: number; downloaded?: number } | undefined
    if (!userData) {
      error('[C411-Playwright] No user data in response')
      return null
    }

    const uploaded = userData.uploaded || 0
    const downloaded = userData.downloaded || 0
    const ratio = downloaded > 0 ? uploaded / downloaded : (uploaded > 0 ? 999 : 0)

    log('[C411-Playwright] Stats fetched:', { uploaded, downloaded, ratio })

    return {
      uploaded,
      downloaded,
      ratio,
      bonus: 0 // C411 has no bonus system
    }

  } catch (e: any) {
    error('[C411-Playwright] Error:', e.message)
    return null
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Torr9 Scraper using Playwright (mirrors api-ratio-main/scrappers/torr9.py)
 * Flow: login via browser -> extract JWT from localStorage -> call API /api/v1/users/me
 */
const TORR9_TOKEN_FILE = 'torr9_token.txt'
const TORR9_LOGIN_URL = 'https://torr9.net/login'
const TORR9_API_URL = 'https://api.torr9.net/api/v1/users/me'

// Rate limiting - prevent too many login attempts
let lastTorr9Attempt = 0
const MIN_RETRY_INTERVAL = 5 * 60 * 1000 // 5 minutes minimum between attempts

async function torr9GetFreshToken(page: Page, username: string, password: string): Promise<string | null> {
  try {
    // Check rate limiting
    const now = Date.now()
    const timeSinceLastAttempt = now - lastTorr9Attempt
    if (timeSinceLastAttempt < MIN_RETRY_INTERVAL) {
      const waitSeconds = Math.ceil((MIN_RETRY_INTERVAL - timeSinceLastAttempt) / 1000)
      error(`[Torr9] Rate limited: Must wait ${waitSeconds}s before next attempt (account protection)`)
      return null
    }
    lastTorr9Attempt = now
    
    log('[Torr9] Attempting automated login...')
    log(`[Torr9] Navigating to ${TORR9_LOGIN_URL}...`)
    
    await page.goto(TORR9_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    log('[Torr9] Login page loaded, waiting for stabilization...')
    await randomDelay(3000, 6000) // Increased delay
    
    // Check if we're on the right page
    const currentUrl = page.url()
    log(`[Torr9] Current URL: ${currentUrl}`)
    
    // Check for Cloudflare/challenge
    const pageContent = await page.content()
    if (pageContent.includes('cf-browser-verification') || pageContent.includes('challenge-running')) {
      error('[Torr9] Cloudflare challenge detected - may need to wait longer')
      await page.waitForTimeout(15000)
    }
    
    // Check for blocking message (account/ IP blocked)
    if (pageContent.includes('Impossible de joindre le serveur') || 
        pageContent.includes('essayez de désactiver vos extensions') ||
        pageContent.includes('accès temporairement désactivé')) {
      error('[Torr9] ⚠️  ACCOUNT OR IP BLOCKED by Torr9!')
      error('[Torr9] Message: Impossible de joindre le serveur')
      error('[Torr9] Stop all attempts and wait several hours before retrying')
      return null
    }
    
    // Find username input
    const usernameInput = await page.locator('input[name="username"], input[placeholder*="Pseudo"], input[type="text"]').first()
    if (await usernameInput.count() === 0) {
      error('[Torr9] Username input not found')
      log('[Torr9] Page content preview:', pageContent.substring(0, 500))
      return null
    }
    
    log('[Torr9] Filling username...')
    await usernameInput.fill(username)
    await randomDelay(300, 800)
    
    // Find password input
    const passwordInput = await page.locator('input[name="password"], input[placeholder*="Mot de passe"], input[type="password"]').first()
    if (await passwordInput.count() === 0) {
      error('[Torr9] Password input not found')
      return null
    }
    
    log('[Torr9] Filling password...')
    await passwordInput.fill(password)
    await randomDelay(500, 1200)
    
    // Try multiple methods to submit the form
    log('[Torr9] Attempting form submission...')
    
    // Method 1: Try multiple button selectors (Torr9 button says "CONNEXION")
    const submitBtn = await page.locator('button[type="submit"]').first()
    const connexionBtn = await page.locator('button:has-text("CONNEXION"), button:has-text("Connexion")').first()
    const connectBtn = await page.locator('button:has-text("Se connecter"), button:has-text("connexion")').first()
    const orangeBtn = await page.locator('button.bg-orange-500, button[class*="orange"]').first()
    
    if (await connexionBtn.count() > 0) {
      log('[Torr9] Clicking CONNEXION button...')
      await connexionBtn.click()
    } else if (await submitBtn.count() > 0) {
      log('[Torr9] Clicking submit button...')
      await submitBtn.click()
    } else if (await orangeBtn.count() > 0) {
      log('[Torr9] Clicking orange button...')
      await orangeBtn.click()
    } else if (await connectBtn.count() > 0) {
      log('[Torr9] Clicking connection button...')
      await connectBtn.click()
    } else {
      // Method 2: Submit the form directly
      log('[Torr9] No button found, submitting form via JS...')
      await page.evaluate(() => {
        const form = document.querySelector('form')
        if (form) {
          // Try to trigger submit event properly
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
          form.dispatchEvent(submitEvent)
          // Fallback to direct submit
          if (!submitEvent.defaultPrevented) {
            form.submit()
          }
        }
      })
    }
    
    // Wait for navigation with longer timeout
    log('[Torr9] Waiting for navigation...')
    try {
      // Wait for URL change or network idle
      await Promise.race([
        page.waitForURL(/^(?!.*login).*$/, { timeout: 30000 }), // URL changes away from login
        page.waitForLoadState('networkidle', { timeout: 30000 })
      ])
    } catch (e) {
      log('[Torr9] Navigation timeout, checking current state...')
    }
    
    // Wait for potential redirects and JS execution (increased)
    await page.waitForTimeout(8000)
    
    // Check current URL after login attempt
    const postLoginUrl = page.url()
    log(`[Torr9] Post-login URL: ${postLoginUrl}`)
    
    // If still on login page, check for error messages
    if (postLoginUrl.includes('/login')) {
      log('[Torr9] Still on login page, checking for errors...')
      const errorSelectors = [
        '.text-red-500', '.text-red-600', '.error', '.alert', 
        '[role="alert"]', '.invalid-feedback', '.form-error'
      ]
      for (const selector of errorSelectors) {
        const errorEl = await page.locator(selector).first()
        if (await errorEl.count() > 0) {
          const errorText = await errorEl.textContent()
          error(`[Torr9] Error message found: ${errorText}`)
        }
      }
      
      // Check if form still exists (page didn't submit)
      const formStillThere = await page.locator('form').count() > 0
      log(`[Torr9] Form still present: ${formStillThere}`)
      
      // Take screenshot for debugging
      try {
        const html = await page.content()
        log('[Torr9] Page HTML (first 1000 chars):', html.substring(0, 1000))
      } catch (e) {
        log('[Torr9] Could not get page content')
      }
    }
    
    // Poll localStorage for up to 20 seconds (with longer intervals)
    log('[Torr9] Polling localStorage for token...')
    for (let i = 0; i < 20; i++) {
      const token = await page.evaluate(() => localStorage.getItem('token'))
      if (token) {
        log(`[Torr9] Token found after ${i + 1} seconds`)
        // Try to save token, but don't fail if we can't (Docker)
        try {
          await saveToken(TORR9_TOKEN_FILE, token)
          log('[Torr9] Token saved to file')
        } catch (e) {
          log('[Torr9] Could not save token to file (normal in Docker)')
        }
        return token
      }
      
      // Check for error messages
      const errorText = await page.locator('.error, .alert-error, [role="alert"]').first().textContent().catch(() => null)
      if (errorText) {
        error(`[Torr9] Login error message: ${errorText}`)
      }
      
      await new Promise(r => setTimeout(r, 1500)) // 1.5s between checks
    }
    
    error('[Torr9] Login appeared successful but no token found in localStorage after 30s')
    
    // Debug: check what's in localStorage
    const localStorageKeys = await page.evaluate(() => Object.keys(localStorage))
    log('[Torr9] localStorage keys found:', localStorageKeys.join(',') || '(none)')
    
    return null
  } catch (e: any) {
    error('[Torr9] Login failed with error:', e.message)
    return null
  }
}

export async function scrapeTorr9Playwright(username: string, password: string, headless: boolean = true): Promise<PlaywrightStats | null> {
  let browser: Browser | null = null
  
  try {
    log('[Torr9] ==========================================')
    log('[Torr9] Starting Torr9 scraper...')
    log('[Torr9] Username:', username)
    log('[Torr9] Headless:', headless)
    log('[Torr9] Chromium path:', process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '(default)')
    
    browser = await launchStealthBrowser(headless)
    const context = await createStealthContext(browser)
    const page = await context.newPage()
    
    // Try to load saved token (works in dev, may fail silently in Docker)
    let token: string | null = null
    try {
      token = await loadToken(TORR9_TOKEN_FILE)
      if (token) {
        log('[Torr9] Loaded saved token from file')
      }
    } catch (e) {
      log('[Torr9] Could not load token from file (normal in Docker)')
    }
    
    if (!token) {
      log('[Torr9] No saved token, performing fresh login...')
      token = await torr9GetFreshToken(page, username, password)
    }
    
    if (!token) {
      error('[Torr9] Could not obtain a token - login failed')
      return null
    }
    
    log('[Torr9] Token obtained, calling API...')
    
    // Call API with the token
    let response = await context.request.get(TORR9_API_URL, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 30000
    })
    
    log(`[Torr9] API response status: ${response.status()}`)
    
    // If token expired, refresh it
    if (response.status() === 401) {
      log('[Torr9] Token expired (401), refreshing...')
      token = await torr9GetFreshToken(page, username, password)
      if (!token) {
        error('[Torr9] Could not refresh token after 401')
        return null
      }
      log('[Torr9] Retrying API with new token...')
      response = await context.request.get(TORR9_API_URL, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 30000
      })
      log(`[Torr9] Retry API response status: ${response.status()}`)
    }
    
    if (!response.ok()) {
      error(`[Torr9] API error: HTTP ${response.status()}`)
      try {
        const errorBody = await response.text()
        log('[Torr9] API error body:', errorBody.substring(0, 500))
      } catch {}
      return null
    }
    
    let apiData: any
    try {
      apiData = await response.json()
      log('[Torr9] API response keys:', Object.keys(apiData).join(','))
    } catch (e) {
      error('[Torr9] Failed to parse API response:', (e as Error).message)
      return null
    }
    
    // Parse stats with fallbacks
    const bonusUp = parseFloat(apiData.bonus_uploaded || apiData.bonusUploaded || 0) || 0
    const bonusDown = parseFloat(apiData.bonus_downloaded || apiData.bonusDownloaded || 0) || 0
    const totalUp = parseFloat(apiData.total_uploaded_bytes || apiData.totalUploaded || apiData.uploaded || 0) || 0
    const totalDown = parseFloat(apiData.total_downloaded_bytes || apiData.totalDownloaded || apiData.downloaded || 0) || 0
    
    const uploaded = Math.floor(totalUp + bonusUp)
    const downloaded = Math.floor(totalDown + bonusDown)
    const ratio = downloaded > 0 ? uploaded / downloaded : (uploaded > 0 ? 999 : 0)
    const bonus = parseFloat(apiData.jeton_balance || apiData.jetons || apiData.tokens || 0) || 0
    
    log('[Torr9] Stats extracted:', { 
      uploadedBytes: uploaded, 
      downloadedBytes: downloaded, 
      ratio: ratio.toFixed(2), 
      bonusPoints: bonus 
    })
    log('[Torr9] ==========================================')
    
    return { uploaded, downloaded, ratio, bonus }
  } catch (e: any) {
    error('[Torr9] Fatal error:', e.message)
    return null
  } finally {
    if (browser) {
      try { await browser.close() } catch {}
    }
  }
}

/**
 * La Cale Scraper using Playwright
 * URL: https://la-cale.space
 */
export async function scrapeLaCalePlaywright(username: string, password: string, headless: boolean = true): Promise<PlaywrightStats | null> {
  const COOKIES_FILE = 'lacale_cookies.json'
  const BASE_URL = 'https://la-cale.space'
  const LOGIN_URL = `${BASE_URL}/login`
  const DASHBOARD_URL = `${BASE_URL}/dashboard`

  let browser: Browser | null = null

  try {
    log('[LaCale-Playwright] Starting browser...')
    
    browser = await launchStealthBrowser(headless)
    const context = await createStealthContext(browser)
    const page = await context.newPage()

    // Try to load existing cookies
    const existingCookies = await loadCookies(COOKIES_FILE)
    if (existingCookies) {
      log('[LaCale-Playwright] Loading existing cookies...')
      await context.addCookies(existingCookies)
    }

    // Navigate to dashboard page (stats are shown here)
    log('[LaCale-Playwright] Navigating to dashboard...')
    await page.goto(DASHBOARD_URL)
    await page.waitForTimeout(3000)

    // Check if we're on login page (not authenticated)
    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/connexion')) {
      log('[LaCale-Playwright] Session expired, logging in...')
      
      // Already on login page or redirected there
      if (!currentUrl.includes('/login')) {
        await page.goto(LOGIN_URL)
        await page.waitForTimeout(2000)
      }
      
      // Fill login form - La Cale uses "Email" field
      log('[LaCale-Playwright] Filling login form...')
      
      const usernameInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="Email"], input[placeholder*="email"]').first()
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first()
      
      if (await usernameInput.count() > 0) {
        await usernameInput.fill(username)
        log('[LaCale-Playwright] Filled email')
      } else {
        // Fallback: try any text input as first field
        const anyTextInput = await page.locator('input[type="text"]').first()
        if (await anyTextInput.count() > 0) {
          await anyTextInput.fill(username)
          log('[LaCale-Playwright] Filled username (fallback)')
        }
      }
      
      if (await passwordInput.count() > 0) {
        await passwordInput.fill(password)
        log('[LaCale-Playwright] Filled password')
      }
      
      await page.waitForTimeout(1500)

      // Click login button
      const loginBtn = await page.locator('button:has-text("Se connecter"), button[type="submit"]').first()
      if (await loginBtn.count() > 0) {
        await loginBtn.click()
        log('[LaCale-Playwright] Clicked login button')
      } else {
        await page.keyboard.press('Enter')
        log('[LaCale-Playwright] Pressed Enter to login')
      }

      // Wait for navigation
      await page.waitForTimeout(8000)
      
      // Check if login succeeded
      const afterLoginUrl = page.url()
      log('[LaCale-Playwright] After login URL:', afterLoginUrl)
      
      if (afterLoginUrl.includes('/login')) {
        error('[LaCale-Playwright] Login failed - still on login page')
        return null
      }

      // Navigate to dashboard after login
      await page.goto(DASHBOARD_URL)
      await page.waitForTimeout(3000)

      // Save cookies
      const cookies = await context.cookies()
      await saveCookies(COOKIES_FILE, cookies)
      log('[LaCale-Playwright] Cookies saved')
    }

    // Extract stats from HTML
    log('[LaCale-Playwright] Extracting stats from page...')
    
    // Wait for page to load
    await page.waitForTimeout(3000)
    
    // Get all text content from the page
    const pageText = await page.evaluate(() => document.body.innerText)
    log('[LaCale-Playwright] Page text sample:', pageText.substring(0, 1000))
    
    // Extract Ratio Global - look for pattern like "Ratio Global 6.41"
    let ratio = 0
    const ratioMatch = pageText.match(/Ratio Global\s*[\n\r\s]*(\d+[.,]?\d*)/i)
    if (ratioMatch) {
      ratio = parseFloat(ratioMatch[1].replace(',', '.'))
      log('[LaCale-Playwright] Found ratio:', ratio)
    }
    
    // Extract Upload (UP) - look for pattern like "1.11 TiB" or "1.11 TB"
    let uploaded = 0
    const uploadMatch = pageText.match(/(?:UP|Upload|Cargaisons)[\s↑]*[\n\r\s]*([\d.,]+)\s*(TiB|GiB|MiB|KiB|TB|GB|MB|KB)/i)
    if (uploadMatch) {
      const unit = uploadMatch[2].replace('iB', 'B') // Convert TiB -> TB
      uploaded = parseBytes(`${uploadMatch[1]} ${unit}`)
      log('[LaCale-Playwright] Found upload:', uploadMatch[0], '->', uploaded)
    }
    
    // Extract Download (DL) - look for pattern like "177.34 GiB" or "177.34 GB"
    let downloaded = 0
    const downloadMatch = pageText.match(/(?:DL|Down|Download|Pillages)[\s↓]*[\n\r\s]*([\d.,]+)\s*(TiB|GiB|MiB|KiB|TB|GB|MB|KB)/i)
    if (downloadMatch) {
      const unit = downloadMatch[2].replace('iB', 'B') // Convert GiB -> GB
      downloaded = parseBytes(`${downloadMatch[1]} ${unit}`)
      log('[LaCale-Playwright] Found download:', downloadMatch[0], '->', downloaded)
    }
    
    // Extract Bonus (Doublons) - look for number like "15 168 750"
    let bonus = 0
    const bonusMatch = pageText.match(/(?:Doublons|Bonus)[^\d]*([\d\s,]+)(?:\s|$)/i)
    if (bonusMatch) {
      bonus = parseInt(bonusMatch[1].replace(/\s/g, '').replace(/,/g, ''), 10) || 0
      log('[LaCale-Playwright] Found bonus:', bonus)
    }
    
    // Calculate ratio if not found directly but we have upload/download
    if (ratio === 0 && downloaded > 0) {
      ratio = uploaded / downloaded
      log('[LaCale-Playwright] Calculated ratio:', ratio)
    }

    log('[LaCale-Playwright] Final stats:', { uploaded, downloaded, ratio, bonus })

    return {
      uploaded,
      downloaded,
      ratio,
      bonus
    }

  } catch (e: any) {
    error('[LaCale-Playwright] Error:', e.message)
    return null
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Parse bytes from human-readable format
 * Supports: TB, GB, MB, KB, B
 */
function parseBytes(text: string): number {
  const cleaned = text.trim().toUpperCase()
  
  // Match number and unit
  const match = cleaned.match(/(\d+[.,]?\d*)\s*(TB|GB|MB|KB|B)/i)
  if (!match) return 0
  
  const value = parseFloat(match[1].replace(',', '.'))
  const unit = match[2].toUpperCase()
  
  const multipliers: Record<string, number> = {
    'TB': 1024 * 1024 * 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'MB': 1024 * 1024,
    'KB': 1024,
    'B': 1
  }
  
  return Math.floor(value * (multipliers[unit] || 1))
}

/**
 * Gemini Tracker Scraper
 * URL: https://gemini-tracker.org
 * Uses API with token - no login/password needed
 * API: https://gemini-tracker.org/api/user?api_token=XXX
 */
export async function scrapeGemini(apiToken: string): Promise<PlaywrightStats | null> {
  const API_URL = `https://gemini-tracker.org/api/user?api_token=${encodeURIComponent(apiToken)}`
  
  try {
    log('[Gemini] Fetching stats from API...')
    
    // Use native fetch with realistic headers
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'User-Agent': defaultUserAgent,
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      error(`[Gemini] API error: HTTP ${response.status} ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    log('[Gemini] Raw API response:', JSON.stringify(data).substring(0, 500))
    
    // Unit3d-style trackers often wrap user in "user" or "data" field
    const user = data.user || data.data || data
    
    // Try multiple field name variants
    const uploadedRaw = user.uploaded ?? user.upload ?? user.total_upload ?? user.uploaded_bytes ?? '0'
    const downloadedRaw = user.downloaded ?? user.download ?? user.total_download ?? user.downloaded_bytes ?? '0'
    const bonusRaw = user.seedbonus ?? user.bonus ?? user.bonus_points ?? user.points ?? '0'
    
    const uploaded = parseStatsValue(uploadedRaw)
    const downloaded = parseStatsValue(downloadedRaw)
    const ratio = downloaded > 0 ? uploaded / downloaded : (uploaded > 0 ? 999 : 0)
    const bonus = parseFloat(String(bonusRaw)) || 0
    
    log('[Gemini] Parsed:', { uploadedRaw, downloadedRaw, uploaded, downloaded, ratio, bonus })
    
    return {
      uploaded,
      downloaded,
      ratio,
      bonus
    }
  } catch (e: any) {
    error('[Gemini] Error:', e.message)
    return null
  }
}

/**
 * Abnormal (abn.lol) - French tracker scraped via Playwright
 * Parses stats from home page header: UP, DOWN, RATIO, POINTS DE RÉPUTATION
 */
export async function scrapeAbnormalPlaywright(username: string, password: string, headless: boolean = true): Promise<PlaywrightStats | null> {
  const COOKIES_FILE = 'abnormal_cookies.json'
  const BASE_URL = 'https://abn.lol'
  const LOGIN_URL = `${BASE_URL}/login.php`
  const HOME_URL = `${BASE_URL}/`
  
  let browser: Browser | null = null
  
  try {
    log('[Abnormal-Playwright] Starting browser...')
    
    browser = await launchStealthBrowser(headless)
    const context = await createStealthContext(browser)
    const page = await context.newPage()
    
    // Try to load existing cookies
    const existingCookies = await loadCookies(COOKIES_FILE)
    if (existingCookies) {
      log('[Abnormal-Playwright] Loading existing cookies...')
      await context.addCookies(existingCookies)
    }
    
    // Navigate to home page
    log('[Abnormal-Playwright] Navigating to home...')
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await randomDelay(2000, 4000)
    
    // Check if we're on login (URL-based OR content-based since abn.lol shows login inline)
    const currentUrl = page.url()
    let initialText = ''
    try {
      initialText = await page.evaluate(() => document.body.innerText)
    } catch {}
    
    // Detect login state: URL contains login OR page shows "Nom d'utilisateur" / "Connexion" button without user stats
    const hasLoginForm = /Nom\s+d'utilisateur/i.test(initialText) && /Mot\s+de\s+passe/i.test(initialText)
    const hasNoStats = !/UP\s*:?\s*[\d.,]/i.test(initialText)
    const needsLogin = currentUrl.includes('login') || currentUrl.includes('connect') || (hasLoginForm && hasNoStats)
    
    if (needsLogin) {
      log('[Abnormal-Playwright] Not authenticated, logging in...')
      
      // Fill login form - try common field name variants
      // abn.lol likely uses 'username' or 'pseudo'
      const usernameInput = await page.locator('input[name="username"], input[name="pseudo"], input[name="login"], input[name="user"], input[type="text"]:visible').first()
      const passwordInput = await page.locator('input[name="password"], input[name="pass"], input[type="password"]:visible').first()
      
      if (await usernameInput.count() > 0) {
        await usernameInput.fill(username)
        log('[Abnormal-Playwright] Filled username')
        await randomDelay(300, 800)
      } else {
        error('[Abnormal-Playwright] Could not find username input')
      }
      if (await passwordInput.count() > 0) {
        await passwordInput.fill(password)
        log('[Abnormal-Playwright] Filled password')
        await randomDelay(500, 1200)
      } else {
        error('[Abnormal-Playwright] Could not find password input')
      }
      
      // Click login button
      const loginBtn = await page.locator('input[type="submit"][value*="Connexion" i], input[type="submit"], button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")').first()
      if (await loginBtn.count() > 0) {
        await loginBtn.click()
        log('[Abnormal-Playwright] Clicked login button')
      } else {
        await page.keyboard.press('Enter')
        log('[Abnormal-Playwright] Pressed Enter')
      }
      
      // Wait for navigation
      await page.waitForTimeout(8000)
      
      const afterLoginUrl = page.url()
      log('[Abnormal-Playwright] After login URL:', afterLoginUrl)
      
      // Re-check if still on login (by content)
      const afterText = await page.evaluate(() => document.body.innerText)
      const stillOnLogin = /Nom\s+d'utilisateur/i.test(afterText) && /Mot\s+de\s+passe/i.test(afterText) && !/UP\s*:?\s*[\d.,]/i.test(afterText)
      
      if (stillOnLogin) {
        error('[Abnormal-Playwright] Login failed - still showing login form')
        return null
      }
      
      // Navigate to home to ensure stats are visible
      await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' })
      await randomDelay(2000, 3000)
      
      // Save cookies
      const cookies = await context.cookies()
      await saveCookies(COOKIES_FILE, cookies)
      log('[Abnormal-Playwright] Cookies saved')
    }
    
    // Extract stats from header
    log('[Abnormal-Playwright] Extracting stats from header...')
    
    const pageText = await page.evaluate(() => document.body.innerText)
    log('[Abnormal-Playwright] Page text sample:', pageText.substring(0, 800))
    
    // Parse "UP : 16.72 GO" - FR uses "GO" for GB, "TO" for TB, "MO" for MB, "O" for bytes
    let uploaded = 0
    const upMatch = pageText.match(/UP\s*:?\s*([\d.,]+)\s*(TO|GO|MO|KO|O)/i)
    if (upMatch) {
      uploaded = parseFrenchSize(upMatch[1], upMatch[2])
      log('[Abnormal-Playwright] Upload:', upMatch[0], '->', uploaded)
    }
    
    let downloaded = 0
    const dlMatch = pageText.match(/DOWN\s*:?\s*([\d.,]+)\s*(TO|GO|MO|KO|O)/i)
    if (dlMatch) {
      downloaded = parseFrenchSize(dlMatch[1], dlMatch[2])
      log('[Abnormal-Playwright] Download:', dlMatch[0], '->', downloaded)
    }
    
    // Parse RATIO - can be "-.-" when no download or a number
    let ratio = 0
    const ratioMatch = pageText.match(/RATIO\s*:?\s*([\d.,]+|-+\.?-*)/i)
    if (ratioMatch && !ratioMatch[1].includes('-')) {
      ratio = parseFloat(ratioMatch[1].replace(',', '.')) || 0
      log('[Abnormal-Playwright] Ratio:', ratio)
    } else if (downloaded > 0) {
      ratio = uploaded / downloaded
    } else if (uploaded > 0) {
      ratio = 999 // infinite ratio when no DL
    }
    
    // Parse POINTS DE RÉPUTATION (bonus)
    let bonus = 0
    const bonusMatch = pageText.match(/POINTS\s+DE\s+R[ÉE]PUTATION\s*:?\s*([\d\s,.]+)/i)
    if (bonusMatch) {
      bonus = parseInt(bonusMatch[1].replace(/[\s,]/g, ''), 10) || 0
      log('[Abnormal-Playwright] Bonus:', bonus)
    }
    
    log('[Abnormal-Playwright] Final stats:', { uploaded, downloaded, ratio, bonus })
    
    if (uploaded === 0 && downloaded === 0 && bonus === 0) {
      error('[Abnormal-Playwright] Could not parse any stats - selectors may need updating')
      return null
    }
    
    return { uploaded, downloaded, ratio, bonus }
  } catch (e: any) {
    error('[Abnormal-Playwright] Error:', e.message)
    return null
  } finally {
    if (browser) {
      try { await browser.close() } catch {}
    }
  }
}

/**
 * Parse French file size (GO = GB, TO = TB, MO = MB, KO = KB, O = bytes)
 */
function parseFrenchSize(value: string, unit: string): number {
  const num = parseFloat(value.replace(',', '.'))
  const unitUpper = unit.toUpperCase()
  const multipliers: Record<string, number> = {
    'TO': 1024 * 1024 * 1024 * 1024,
    'GO': 1024 * 1024 * 1024,
    'MO': 1024 * 1024,
    'KO': 1024,
    'O': 1
  }
  return Math.floor(num * (multipliers[unitUpper] || 1))
}

/**
 * The Old School (theoldschool.cc) - Unit3d-based tracker
 * Supports both Unit3d-native API and Gemini-style API token
 */
export async function scrapeTOS(apiToken: string, baseUrl: string = 'https://theoldschool.cc'): Promise<PlaywrightStats | null> {
  const BASE = baseUrl.replace(/\/$/, '')
  
  // Try multiple endpoint patterns
  const endpoints = [
    { url: `${BASE}/api/user?api_token=${encodeURIComponent(apiToken)}`, useBearerToken: false },
    { url: `${BASE}/api/users/me`, useBearerToken: true },
    { url: `${BASE}/api/user/profile`, useBearerToken: true },
  ]
  
  const MAX_RETRIES = 3
  
  for (const endpoint of endpoints) {
    // Retry loop for transient failures
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log(`[TOS] Trying endpoint (attempt ${attempt}/${MAX_RETRIES}):`, endpoint.url)
        
        const headers: Record<string, string> = {
          'User-Agent': defaultUserAgent,
          'Accept': 'application/json',
        }
        if (endpoint.useBearerToken) {
          headers['Authorization'] = `Bearer ${apiToken}`
        }
        
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(20000)
        })
        
        if (!response.ok) {
          // 4xx = client error, no point retrying
          if (response.status >= 400 && response.status < 500) {
            log(`[TOS] Endpoint failed (client error): HTTP ${response.status}`)
            break // Try next endpoint
          }
          // 5xx = server error, retry
          log(`[TOS] Server error HTTP ${response.status}, retrying...`)
          await new Promise(r => setTimeout(r, 2000 * attempt))
          continue
        }
        
        const data = await response.json()
        log('[TOS] Raw response:', JSON.stringify(data).substring(0, 500))
        
        const user = data.user || data.data || data
        
        const uploadedRaw = user.uploaded ?? user.upload ?? user.total_upload ?? '0'
        const downloadedRaw = user.downloaded ?? user.download ?? user.total_download ?? '0'
        const bonusRaw = user.seedbonus ?? user.bonus_points ?? user.bonus ?? user.points ?? '0'
        
        const uploaded = parseStatsValue(uploadedRaw)
        const downloaded = parseStatsValue(downloadedRaw)
        const ratio = downloaded > 0 ? uploaded / downloaded : (uploaded > 0 ? 999 : 0)
        const bonus = parseFloat(String(bonusRaw)) || 0
        
        // If we got something meaningful, return it
        if (uploaded > 0 || downloaded > 0 || bonus > 0) {
          log('[TOS] Stats:', { uploaded, downloaded, ratio, bonus })
          return { uploaded, downloaded, ratio, bonus }
        }
        
        log('[TOS] All values zero, trying next endpoint...')
        break // Values are zero, don't retry this endpoint
      } catch (e: any) {
        // Transient network error - retry with exponential backoff
        const isTransient = e.message?.includes('fetch failed') || 
                            e.message?.includes('timeout') || 
                            e.message?.includes('ECONNRESET') ||
                            e.message?.includes('ETIMEDOUT')
        
        if (isTransient && attempt < MAX_RETRIES) {
          const delay = 2000 * attempt
          log(`[TOS] Transient error: ${e.message}, retrying in ${delay}ms...`)
          await new Promise(r => setTimeout(r, delay))
          continue
        }
        
        log('[TOS] Endpoint error:', e.message)
        break // Try next endpoint
      }
    }
  }
  
  error('[TOS] All endpoints failed')
  return null
}

/**
 * Parse stats value that might be number or formatted string like "1.5 TB" or "50.06 GiB"
 * Handles both decimal (KB/MB/GB/TB) and binary (KiB/MiB/GiB/TiB) units
 */
function parseStatsValue(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // Try direct number
    const num = parseFloat(value)
    if (!isNaN(num) && !/[a-zA-Z]/.test(value)) return num
    
    // Parse with unit - support both decimal (TB/GB) and binary (TiB/GiB) units
    const match = value.match(/([\d.,]+)\s*(TiB|GiB|MiB|KiB|TB|GB|MB|KB|B)/i)
    if (!match) return 0
    
    const num2 = parseFloat(match[1].replace(',', '.'))
    const unit = match[2].replace(/iB$/i, 'B') // Convert TiB -> TB, GiB -> GB, etc.
    
    return parseBytes(`${num2} ${unit}`)
  }
  return 0
}
