'use server'

import { Torrent } from '@/lib/services/qbittorrent'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions, getQBittorrentServiceForUser, getSmbServiceForUser } from '@/lib/auth'

export async function checkAccess(permission: 'downloads.view' | 'downloads.manage') {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const permissions = user?.permissions || []
  const isAdmin = user?.role === 'admin'
  
  // Manage permission implies View permission
  const hasPermission = isAdmin || permissions.includes(permission) || (permission === 'downloads.view' && permissions.includes('downloads.manage'))
  
  if (!session || !hasPermission) {
    throw new Error('Unauthorized')
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

export async function addTorrent(formData: FormData) {
  try {
    await checkAccess('downloads.manage')
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

    await qbtService.addTorrent(urls, validFiles)
    revalidatePath('/dashboard/downloads')
    return { success: true }
  } catch (e) {
    console.error('Failed to add torrent', e)
    return { success: false, error: 'Failed to add torrent' }
  }
}

export async function deleteTorrents(hashes: string[], deleteFiles: boolean) {
  try {
    await checkAccess('downloads.manage')
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
    await checkAccess('downloads.manage')
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
    await checkAccess('downloads.manage')
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
    await checkAccess('downloads.manage')
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
