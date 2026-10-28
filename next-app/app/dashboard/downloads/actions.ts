'use server'

import { Torrent } from '@/lib/services/qbittorrent'
import { QBittorrentCache } from '@/lib/services/qbittorrent-cache'
import { revalidatePath } from 'next/cache'
import { getSession, getStorageServiceForUser } from '@/lib/auth'
import { getQBittorrentService } from '@/lib/services/qbittorrent'

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
