import { getSetting } from '@/lib/settings'
import { ArrDownloadManager } from './arr'
import { SorraaDownloadManager } from './sorraa'
import type { DownloadManager, ManagerKind } from './types'

export type { AddRequestInput, AddRequestOutcome, DownloadManager, ManagerKind } from './types'

const SETTING_KEYS = { movie: 'download_manager_movie', tv: 'download_manager_tv' } as const

/** Gestionnaire choisi par l'admin pour ce type de media ; `arr` tant que rien n'est choisi. */
export async function getManagerKind(mediaType: 'movie' | 'tv'): Promise<ManagerKind> {
  return (await getSetting(SETTING_KEYS[mediaType])) === 'sorraa' ? 'sorraa' : 'arr'
}

export async function getDownloadManager(mediaType: 'movie' | 'tv'): Promise<DownloadManager> {
  return (await getManagerKind(mediaType)) === 'sorraa' ? new SorraaDownloadManager() : new ArrDownloadManager()
}
