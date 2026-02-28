'use server'

import { Torrent } from '@/lib/services/qbittorrent'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions, getQBittorrentServiceForUser, getSmbServiceForUser } from '@/lib/auth'

import { defineAbilityFor } from '@/lib/ability'

export async function checkAccess(permission?: string) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  
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
    const qbtService = await getQBittorrentServiceForUser()
    if (!qbtService) return []
    const torrents = await qbtService.getTorrents(filter)
    return Array.isArray(torrents) ? torrents : []
  } catch (e) {
    console.error('Failed to get torrents', e)
    return []
  }
}

export async function getGlobalStats() {
  try {
    await checkAccess('downloads.view')
    const qbtService = await getQBittorrentServiceForUser()
    if (!qbtService) return null
    return await qbtService.getServerState()
  } catch (e) {
    console.error('Failed to get global stats', e)
    return null
  }
}

export async function addTorrent(formData: FormData) {
  try {
    await checkAccess('downloads.add')
    const qbtService = await getQBittorrentServiceForUser()
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
  } catch (e: any) {
    console.error('Failed to add torrent', e)
    return { success: false, error: e.message || 'Failed to add torrent' }
  }
}

export async function deleteTorrents(hashes: string[], deleteFiles: boolean) {
  try {
    await checkAccess('downloads.manage_torrents')
    const qbtService = await getQBittorrentServiceForUser()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }

    await qbtService.deleteTorrents(hashes, deleteFiles)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    console.error('Failed to delete torrents', e)
    return { success: false, error: 'Failed to delete torrents' }
  }
}

export async function pauseTorrents(hashes: string[]) {
  try {
    await checkAccess('downloads.manage_torrents')
    const qbtService = await getQBittorrentServiceForUser()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }

    await qbtService.pauseTorrents(hashes)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    console.error('Failed to pause torrents', e)
    return { success: false, error: 'Failed to pause torrents' }
  }
}

export async function resumeTorrents(hashes: string[]) {
  try {
    await checkAccess('downloads.manage_torrents')
    const qbtService = await getQBittorrentServiceForUser()
    if (!qbtService) return { success: false, error: 'Service QBittorrent non configuré' }

    await qbtService.resumeTorrents(hashes)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    console.error('Failed to resume torrents', e)
    return { success: false, error: 'Failed to resume torrents' }
  }
}

export async function getCategories() {
  try {
    await checkAccess('downloads.view')
    const qbtService = await getQBittorrentServiceForUser()
    if (!qbtService) return {}
    return await qbtService.getCategories()
  } catch (e) {
    console.error('Failed to get categories', e)
    return {}
  }
}

export async function getTags() {
  try {
    await checkAccess('downloads.view')
    const qbtService = await getQBittorrentServiceForUser()
    if (!qbtService) return []
    return await qbtService.getTags()
  } catch (e) {
    console.error('Failed to get tags', e)
    return []
  }
}

export async function deleteSmbPath(path: string) {
  try {
    await checkAccess('downloads.delete_files')
    const smbService = await getSmbServiceForUser()
    if (!smbService) return { success: false, error: 'Service SMB non configuré' }
    
    await smbService.delete(path)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e: any) {
    console.error('Failed to delete SMB path', e)
    return { 
      success: false, 
      error: e.message || 'Erreur lors de la suppression' 
    }
  }
}
