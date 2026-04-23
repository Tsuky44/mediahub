/**
 * Tracker Refresh Scheduler
 * Auto-refreshes tracker stats every 2 hours
 * Uses Playwright scrapers which require anti-bot precautions
 */

import { fetchAllTrackerStats } from './tracker-stats-service'

// 2 hours in milliseconds
const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000
// Add random jitter up to 15 minutes to avoid pattern detection
const JITTER_MS = 15 * 60 * 1000
// Wait 60 seconds after startup before first refresh
const INITIAL_DELAY_MS = 60 * 1000

const globalForScheduler = global as unknown as { trackerRefreshStarted: boolean }

export function startTrackerRefreshScheduler() {
  if (globalForScheduler.trackerRefreshStarted) return
  if (process.env.NEXT_RUNTIME === 'edge') return

  globalForScheduler.trackerRefreshStarted = true
  console.log('[TrackerRefresh] Scheduler started - will refresh every 2h')

  // Initial run after 60 seconds (let app start properly)
  setTimeout(async () => {
    await refreshTrackerStats()
    scheduleNext()
  }, INITIAL_DELAY_MS)
}

function scheduleNext() {
  // Random jitter between 0 and JITTER_MS to avoid bot pattern detection
  const jitter = Math.floor(Math.random() * JITTER_MS)
  const nextDelay = REFRESH_INTERVAL_MS + jitter
  
  const nextDate = new Date(Date.now() + nextDelay)
  console.log(`[TrackerRefresh] Next refresh scheduled at: ${nextDate.toLocaleString('fr-FR')}`)
  
  setTimeout(async () => {
    await refreshTrackerStats()
    scheduleNext()
  }, nextDelay)
}

async function refreshTrackerStats() {
  try {
    console.log('[TrackerRefresh] Starting scheduled refresh...')
    const startTime = Date.now()
    
    const stats = await fetchAllTrackerStats()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[TrackerRefresh] Refreshed ${stats.size} trackers in ${duration}s`)
  } catch (e: any) {
    console.error('[TrackerRefresh] Error during refresh:', e.message)
  }
}
