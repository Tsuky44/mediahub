'use server'

import { eq } from 'drizzle-orm'
import { getCurrentUser, getLibraryServer, getLibraryUserId, getPlaybackPlatform } from '@/lib/auth'
import { createMemoCache } from '@/lib/cache'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { getSetting } from '@/lib/settings'
import type { PlaybackPlatform } from '@/lib/playback-platform'

/** Où en est l'utilisateur avec ce média */
export interface PreviewStatus {
  kind: 'resume' | 'next' | 'watched' | 'new'
  /** « S4 · É3 · Ceux qui sont morts · 39 min restantes », « À suivre : S4 · É4 », « Vu »… */
  line: string
  /** Avancement de la lecture en cours (0 à 1) : barre sur la bannière */
  progress?: number
  /** Séries : épisodes pas encore vus */
  unplayed?: number
}

export interface LibraryPreviewData {
  /** « 2018 – 2025 », « 8 saisons », « Drame, Crime », « ★ 8,2 »… */
  meta: string[]
  status: PreviewStatus
  platform: PlaybackPlatform
  /** Lien de lecture Emby / Jellyfin : élément à ouvrir (film, ou épisode à reprendre) */
  play: { serverUrl: string | null; serverId: string | null; itemId: string; resume: boolean }
  originalTitle?: string
  year?: number
}

const TICKS_PER_MINUTE = 600_000_000

// Survols répétés de la même affiche : une seule série d'appels au serveur toutes les 30 s
const previews = createMemoCache({ max: 300, ttl: 30_000, stale: 0 })

const minutesLeft = (runTicks?: number, posTicks?: number) =>
  runTicks && posTicks ? Math.max(1, Math.round((runTicks - posTicks) / TICKS_PER_MINUTE)) : undefined

function duration(ticks?: number) {
  if (!ticks) return undefined
  const min = Math.round(ticks / TICKS_PER_MINUTE)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const episodeLabel = (ep: any) =>
  [ep.ParentIndexNumber != null && ep.IndexNumber != null ? `S${ep.ParentIndexNumber} · É${ep.IndexNumber}` : null, ep.Name]
    .filter(Boolean)
    .join(' · ')

/**
 * Données de l'aperçu d'un média de la médiathèque (survol d'une affiche) : où l'on en est
 * (épisode en cours et temps restant, épisode suivant, vu), infos utiles et lien de lecture
 * sur la plateforme de connexion. null si le serveur média ne répond pas.
 */
export async function getLibraryPreview(embyId: string): Promise<LibraryPreviewData | null> {
  const user = await getCurrentUser()
  if (!user?.email) return null
  const library = await getLibraryServer()
  if (!library) return null
  const dbUser = await db.query.users.findFirst({ where: eq(users.email, user.email) })
  const userId = getLibraryUserId(dbUser, library.type)
  if (!userId) return null
  const service = library.service

  try {
    return await previews.get(`${library.type}:${userId}:${embyId}`, async () => {
      const [item, serverId, url, platform] = await Promise.all([
        service.getPreviewItem(userId, embyId),
        service.getServerId(),
        getSetting(library.type === 'jellyfin' ? 'jellyfin_url' : 'emby_url'),
        getPlaybackPlatform(),
      ])
      const isSeries = item.Type === 'Series'
      const data = item.UserData ?? {}

      // Où l'on en est
      let status: PreviewStatus
      let playItemId = String(item.Id ?? embyId)
      let resume = false
      if (isSeries) {
        const unplayed = typeof data.UnplayedItemCount === 'number' ? data.UnplayedItemCount : undefined
        const current = await service.getSeriesResume(userId, embyId).catch(() => null)
        const next = current ?? (await service.getNextUp(userId, embyId).catch(() => null))
        const pos = next?.UserData?.PlaybackPositionTicks
        if (next && pos > 0) {
          const left = minutesLeft(next.RunTimeTicks, pos)
          status = {
            kind: 'resume',
            line: [episodeLabel(next), left ? `${left} min restantes` : null].filter(Boolean).join(' · '),
            progress: next.RunTimeTicks ? Math.min(1, pos / next.RunTimeTicks) : undefined,
            unplayed,
          }
          playItemId = String(next.Id)
          resume = true
        } else if (next) {
          status = { kind: 'next', line: `À suivre : ${episodeLabel(next)}`, unplayed }
          playItemId = String(next.Id)
        } else if (data.Played) {
          status = { kind: 'watched', line: 'Série vue en entier' }
        } else {
          status = { kind: 'new', line: unplayed ? `${unplayed} épisodes à découvrir` : 'Pas encore commencée', unplayed }
        }
      } else {
        const pos = data.PlaybackPositionTicks
        if (pos > 0 && !data.Played) {
          const left = minutesLeft(item.RunTimeTicks, pos)
          status = {
            kind: 'resume',
            line: left ? `${left} min restantes` : 'Lecture commencée',
            progress: item.RunTimeTicks ? Math.min(1, pos / item.RunTimeTicks) : undefined,
          }
          resume = true
        } else if (data.Played) {
          status = { kind: 'watched', line: 'Vu' }
        } else {
          status = { kind: 'new', line: 'Pas encore vu' }
        }
      }

      // Infos utiles
      const startYear = item.ProductionYear as number | undefined
      const endYear = item.EndDate ? new Date(item.EndDate).getFullYear() : undefined
      const years = isSeries && startYear
        ? item.Status === 'Ended' && endYear && endYear !== startYear ? `${startYear} – ${endYear}` : `${startYear}`
        : startYear ? `${startYear}` : undefined
      const meta = [
        years,
        isSeries ? (item.ChildCount ? `${item.ChildCount} saison${item.ChildCount > 1 ? 's' : ''}` : undefined) : duration(item.RunTimeTicks),
        Array.isArray(item.Genres) && item.Genres.length ? item.Genres.slice(0, 2).join(', ') : undefined,
        item.CommunityRating ? `★ ${Number(item.CommunityRating).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}` : undefined,
        item.OfficialRating || undefined,
      ].filter((v): v is string => Boolean(v))

      return {
        meta,
        status,
        platform,
        play: { serverUrl: url ? url.split('/web/')[0].replace(/\/$/, '') : null, serverId, itemId: playItemId, resume },
        originalTitle: item.OriginalTitle || undefined,
        year: startYear,
      }
    })
  } catch {
    return null
  }
}
