'use server'

import { Torrent } from '@/lib/services/qbittorrent'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions, getQBittorrentServiceForUser, getSmbServiceForUser } from '@/lib/auth'

async function checkAccess() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!session || !session.user || (role !== 'admin' && role !== 'user_plus')) {
    throw new Error('Unauthorized')
  }
}

export async function getTorrents(filter: string = 'all'): Promise<Torrent[]> {
  try {
    await checkAccess()
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
    await checkAccess()
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
    await checkAccess()
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
    await checkAccess()
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
    await checkAccess()
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

export async function deleteSmbPath(path: string) {
  try {
    await checkAccess()
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
