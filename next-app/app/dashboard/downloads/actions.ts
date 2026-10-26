'use server'

import { Torrent } from '@/lib/services/qbittorrent'
import { QBittorrentCache } from '@/lib/services/qbittorrent-cache'
import { revalidatePath } from 'next/cache'
import { getSession, getStorageServiceForUser } from '@/lib/auth'
import { getQBittorrentService } from '@/lib/services/qbittorrent'
import { db } from '@/lib/db/drizzle'
import { trackerStatsLogs, dailyTrackerStats } from '@/lib/db/schema'
import { and, gte, lte, asc } from 'drizzle-orm'

import { defineAbilityFor } from '@/lib/ability'
import { logger } from '@/lib/logger'

export async function checkAccess(permission?: string) {
  const session = await getSession()
  const user = session?.user
  
  if (!user) {
    throw new Error('Unauthorized')
  }

  const ability = defineAbilityFor(user)

  if (permission === 'downloads.manage') {
    if (ability.cannot('manage', 'Downloads')) {
      throw new Error('Forbidden')
    }
  } else if (permission === 'downloads.add') {
    if (ability.cannot('add_torrent', 'Downloads') && ability.cannot('manage', 'Downloads')) {
      throw new Error('Forbidden')
    }
  } else if (permission === 'downloads.manage_torrents') {
    if (ability.cannot('manage_torrents', 'Downloads') && ability.cannot('manage', 'Downloads')) {
      throw new Error('Forbidden')
    }
  } else if (permission === 'downloads.delete_files') {
    if (ability.cannot('delete_files', 'Downloads') && ability.cannot('manage', 'Downloads')) {
      throw new Error('Forbidden')
    }
  } else if (permission === 'downloads.read_explorer') {
    if (ability.cannot('read_explorer', 'Downloads') && ability.cannot('manage', 'Downloads')) {
      throw new Error('Forbidden')
    }
  } else if (permission === 'downloads.share_files') {
    if (ability.cannot('share_files', 'Downloads') && ability.cannot('manage', 'Downloads')) {
      throw new Error('Forbidden')
    }
  } else {
    // Default to read check for 'downloads.view' or undefined
    if (ability.cannot('read', 'Downloads')) {
      throw new Error('Forbidden')
    }
  }
}

export async function getTorrents(filter: string = 'all'): Promise<Torrent[]> {
  try {
    await checkAccess('downloads.view')
    const cache = QBittorrentCache.getInstance()
    return cache.getTorrents(filter)
  } catch (e) {
    logger.error('Failed to get torrents from cache', e)
    return []
  }
}

export async function getGlobalStats() {
  try {
    await checkAccess('downloads.view')
    const cache = QBittorrentCache.getInstance()
    return cache.getGlobalStats()
  } catch (e) {
    logger.error('Failed to get global stats from cache', e)
    return null
  }
}

export async function getSessionTrackerStats() {
  try {
    await checkAccess('downloads.view')
    const cache = QBittorrentCache.getInstance()
    const torrents = cache.getTorrents('all')
    const trackerStats: Record<string, { uploaded: number, downloaded: number, count: number }> = {}

    if (Array.isArray(torrents)) {
        torrents.forEach(t => {
            let trackerDomain = 'Inconnu'
            try {
                if (t.tracker) {
                    const url = new URL(t.tracker.startsWith('udp://') ? t.tracker.replace('udp://', 'http://') : t.tracker)
                    trackerDomain = url.hostname
                }
            } catch (e) {
                trackerDomain = t.tracker || 'Inconnu'
            }

            if (!trackerStats[trackerDomain]) {
                trackerStats[trackerDomain] = { uploaded: 0, downloaded: 0, count: 0 }
            }

            // Prefer session stats if available, otherwise fallback to total (though total is wrong context for session)
            // But user asked "se que j'ai envoyer vers tel tracker" (what I sent to such tracker).
            // Usually trackers care about TOTAL uploaded. 
            // However, "dans la journée" suggests daily/session.
            // Let's use session stats as primary if > 0, but if 0 maybe total?
            // Actually, for "Session" card details, we should use session stats.
            
            // Note: qBittorrent API returns uploaded_session/downloaded_session
            trackerStats[trackerDomain].uploaded += t.uploaded_session || 0
            trackerStats[trackerDomain].downloaded += t.downloaded_session || 0
            trackerStats[trackerDomain].count += 1
        })
    }

    return Object.entries(trackerStats)
        .map(([tracker, stats]) => ({ tracker, ...stats }))
        .sort((a, b) => b.uploaded - a.uploaded)
  } catch (e) {
    logger.error('Failed to get tracker stats', e)
    return []
  }
}

export async function getTrackerHistory(startDate?: string, endDate?: string) {
  try {
    await checkAccess('downloads.view')
    
    // Normalize dates to UTC strings (YYYY-MM-DD) for logic comparisons
    const today = new Date()
    const todayKey = today.toISOString().split('T')[0]
    
    const endKey = endDate || todayKey
    const startKey = startDate || (() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })()
    
    // Create Date objects for Prisma (UTC)
    // new Date("YYYY-MM-DD") creates UTC midnight
    const dbStart = new Date(startKey)
    const dbEnd = new Date(endKey)
    // Set to end of day UTC to ensure we capture everything
    dbEnd.setUTCHours(23, 59, 59, 999)

    // 1. Fetch Logs (New granular history)
    const logs = await db.query.trackerStatsLogs.findMany({
        where: and(gte(trackerStatsLogs.timestamp, dbStart), lte(trackerStatsLogs.timestamp, dbEnd)),
        orderBy: [asc(trackerStatsLogs.timestamp)]
    })

    // 2. Fetch Daily Stats (Fallback for older data)
    // We need startKey - 1 day to calculate diff for startKey if using daily stats
    const dbStartFallback = new Date(startKey)
    dbStartFallback.setDate(dbStartFallback.getDate() - 1)

    const dailyStats = await db.query.dailyTrackerStats.findMany({
        where: and(gte(dailyTrackerStats.date, dbStartFallback), lte(dailyTrackerStats.date, dbEnd)),
        orderBy: [asc(dailyTrackerStats.date)]
    })

    // Helper to format date YYYY-MM-DD (UTC)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    // Process Logs: Aggregate by Date -> Tracker
    const logsByDate: Record<string, Record<string, { up: number, dl: number }>> = {}
    logs.forEach(log => {
        const d = fmt(log.timestamp)
        if (!logsByDate[d]) logsByDate[d] = {}
        if (!logsByDate[d][log.tracker]) logsByDate[d][log.tracker] = { up: 0, dl: 0 }
        logsByDate[d][log.tracker].up += Number(log.uploadedDiff)
        logsByDate[d][log.tracker].dl += Number(log.downloadedDiff)
    })

    // Process Daily Stats (for Fallback Map)
    const dailyMap: Record<string, Record<string, { up: number, dl: number }>> = {}
    dailyStats.forEach(stat => {
        const d = fmt(stat.date)
        if (!dailyMap[d]) dailyMap[d] = {}
        dailyMap[d][stat.tracker] = {
            up: Number(stat.totalUploaded),
            dl: Number(stat.totalDownloaded)
        }
    })

    // Build Result
    const result: { date: string, stats: { tracker: string, uploaded: number, downloaded: number }[] }[] = []
    
    // Generate all dates in range
    const cur = new Date(startKey)
    const last = new Date(endKey)
    
    while (cur <= last) {
        const dateStr = fmt(cur)
        const dayStats: { tracker: string, uploaded: number, downloaded: number }[] = []
        
        // Strategy: Use logs if available for this date (more accurate). 
        // If not, fall back to Daily Stats Diff logic.
        
        if (logsByDate[dateStr] && Object.keys(logsByDate[dateStr]).length > 0) {
             // Use Logs
             let globalUp = 0
             let globalDl = 0
             let sumUp = 0
             let sumDl = 0

             Object.entries(logsByDate[dateStr]).forEach(([tracker, stats]) => {
                 if (tracker === 'GLOBAL') {
                     globalUp = stats.up
                     globalDl = stats.dl
                 } else {
                     sumUp += stats.up
                     sumDl += stats.dl
                 }

                 if (stats.up > 0 || stats.dl > 0) {
                     dayStats.push({ tracker, uploaded: stats.up, downloaded: stats.dl })
                 }
             })

             // Add "Other" if there's a discrepancy (traffic from deleted torrents or untracked)
             const otherUp = globalUp - sumUp
             const otherDl = globalDl - sumDl

             if (otherUp > 1024 * 1024 || otherDl > 1024 * 1024) { // Only show if > 1MB difference
                 dayStats.push({ 
                     tracker: 'Non attribué (Supprimés)', 
                     uploaded: otherUp > 0 ? otherUp : 0, 
                     downloaded: otherDl > 0 ? otherDl : 0 
                 })
             }
        } else {
             // Use Daily Diff
             const prevDate = new Date(cur)
             prevDate.setDate(prevDate.getDate() - 1)
             const prevDateStr = fmt(prevDate)
             
             const currentDaily = dailyMap[dateStr] || {}
             const prevDaily = dailyMap[prevDateStr] || {}
             
             // Get all trackers involved
             const trackers = new Set([...Object.keys(currentDaily), ...Object.keys(prevDaily)])
             
             let globalDiffUp = 0
             let globalDiffDl = 0
             let sumDiffUp = 0
             let sumDiffDl = 0

             trackers.forEach(tracker => {
                 const curr = currentDaily[tracker]
                 const prev = prevDaily[tracker]
                 
                 let up = 0
                 let dl = 0

                 if (curr && prev) {
                     up = curr.up - prev.up
                     dl = curr.dl - prev.dl
                     if (up < 0) up = 0
                     if (dl < 0) dl = 0
                 } else if (curr && !prev) {
                     // New tracker or missing previous history -> treat current total as gain
                     up = curr.up
                     dl = curr.dl
                 }

                 if (tracker === 'GLOBAL') {
                     globalDiffUp = up
                     globalDiffDl = dl
                 } else {
                     sumDiffUp += up
                     sumDiffDl += dl
                 }

                 if (up > 0 || dl > 0) {
                     dayStats.push({ tracker, uploaded: up, downloaded: dl })
                 }
             })

             // Add "Other" if there's a discrepancy
             const otherUp = globalDiffUp - sumDiffUp
             const otherDl = globalDiffDl - sumDiffDl

             if (otherUp > 1024 * 1024 || otherDl > 1024 * 1024) {
                 dayStats.push({ 
                     tracker: 'Non attribué (Supprimés)', 
                     uploaded: otherUp > 0 ? otherUp : 0, 
                     downloaded: otherDl > 0 ? otherDl : 0 
                 })
             }
        }
        
        if (dayStats.length > 0) {
            result.push({
                date: dateStr,
                stats: dayStats.sort((a, b) => b.uploaded - a.uploaded)
            })
        }
        
        cur.setDate(cur.getDate() + 1)
    }

    return result.reverse() // Newest first

  } catch (e) {
    logger.error('Failed to get tracker history', e)
    return []
  }
}

export async function addTorrent(formData: FormData) {
  try {
    await checkAccess('downloads.add')
    const qbtService = await getQBittorrentService()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }
    
    const urls = formData.get('urls') as string | null
    const files = formData.getAll('torrents') as File[]
    
    // Check if we have either urls or files
    if (!urls && (!files || files.length === 0)) {
        return { success: false, error: 'No torrents provided' }
    }
    
    // Filter out empty files if any (sometimes empty input sends empty file)
    const validFiles = files.filter(f => f.size > 0)

    await qbtService.addTorrent(urls || '', validFiles)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    logger.error('Failed to add torrent', e)
    return { success: false, error: (e as Error).message || 'Failed to add torrent' }
  }
}

export async function deleteTorrents(hashes: string[], deleteFiles: boolean) {
  try {
    await checkAccess('downloads.manage_torrents')
    const qbtService = await getQBittorrentService()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }

    await qbtService.deleteTorrents(hashes, deleteFiles)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    logger.error('Failed to delete torrents', e)
    return { success: false, error: 'Failed to delete torrents' }
  }
}

export async function pauseTorrents(hashes: string[]) {
  try {
    await checkAccess('downloads.manage_torrents')
    const qbtService = await getQBittorrentService()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }

    await qbtService.pauseTorrents(hashes)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    logger.error('Failed to pause torrents', e)
    return { success: false, error: 'Failed to pause torrents' }
  }
}

export async function resumeTorrents(hashes: string[]) {
  try {
    await checkAccess('downloads.manage_torrents')
    const qbtService = await getQBittorrentService()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }

    await qbtService.resumeTorrents(hashes)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    logger.error('Failed to resume torrents', e)
    return { success: false, error: 'Failed to resume torrents' }
  }
}

export async function setPriority(hashes: string[], action: 'top' | 'up' | 'down' | 'bottom') {
  try {
    await checkAccess('downloads.manage_torrents')
    const qbtService = await getQBittorrentService()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }

    if (action === 'top') await qbtService.topPriority(hashes)
    else if (action === 'up') await qbtService.increasePriority(hashes)
    else if (action === 'down') await qbtService.decreasePriority(hashes)
    else if (action === 'bottom') await qbtService.bottomPriority(hashes)
    
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    logger.error('Failed to set priority', e)
    return { success: false, error: 'Failed to set priority' }
  }
}

export async function reannounceTorrents(hashes: string[]) {
  try {
    await checkAccess('downloads.manage_torrents')
    const qbtService = await getQBittorrentService()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }

    await qbtService.reannounceTorrents(hashes)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    logger.error('Failed to reannounce torrents', e)
    return { success: false, error: 'Failed to reannounce torrents' }
  }
}

export async function setShareLimits(hashes: string[], ratioLimit: number, seedingTimeLimit: number, inactiveSeedingTimeLimit: number = -1) {
  try {
    await checkAccess('downloads.manage_torrents')
    const qbtService = await getQBittorrentService()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }

    await qbtService.setShareLimits(hashes, ratioLimit, seedingTimeLimit, inactiveSeedingTimeLimit)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    logger.error('Failed to set share limits', e)
    return { success: false, error: 'Failed to set share limits' }
  }
}


export async function getCategories() {
  try {
    await checkAccess('downloads.view')
    const cache = QBittorrentCache.getInstance()
    return cache.getCategories()
  } catch (e) {
    logger.error('Failed to get categories from cache', e)
    return {}
  }
}

export async function getTags() {
  try {
    await checkAccess('downloads.view')
    const cache = QBittorrentCache.getInstance()
    return cache.getTags()
  } catch (e) {
    logger.error('Failed to get tags from cache', e)
    return []
  }
}

export async function deleteStoragePath(path: string) {
  try {
    await checkAccess('downloads.delete_files')
    const storageService = await getStorageServiceForUser()
    if (!storageService) return { success: false, error: 'Service de stockage non configuré' }
    
    await storageService.delete(path)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    logger.error('Failed to delete storage path', e)
    return { 
      success: false, 
      error: (e as Error).message || 'Erreur lors de la suppression' 
    }
  }
}

// Legacy alias for backward compatibility
export async function deleteSmbPath(path: string) {
  return deleteStoragePath(path)
}
