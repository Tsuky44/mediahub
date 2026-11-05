'use server'

import { eq } from 'drizzle-orm'
import { findPlayTarget, getCurrentUser, getLibraryServer, getLibraryUserId, getPlaybackPlatform, withLinkedAccounts } from '@/lib/auth'
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
  /** Minutes de lecture restantes (film ou épisode à lire) : « Fin à 22:45 » */
  minutes?: number
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
  /** Qualité et langues du fichier : « 4K », « HDR », « Audio FR · EN », « ST FR » */
  badges: string[]
  /** « Ajouté le 3 novembre 2026 » */
  added?: string
  tagline?: string
  studio?: string
}

/** Langue d'une piste (code ISO à 3 lettres d'Emby) en abrégé : « fre » → « FR » */
const LANG: Record<string, string> = { fre: 'FR', fra: 'FR', eng: 'EN', spa: 'ES', ger: 'DE', deu: 'DE', ita: 'IT', jpn: 'JA', kor: 'KO', por: 'PT', chi: 'ZH', zho: 'ZH', rus: 'RU', ara: 'AR', dut: 'NL', nld: 'NL' }
const lang = (code?: string) => (code ? LANG[code.toLowerCase()] ?? code.slice(0, 2).toUpperCase() : undefined)

/** Qualité (définition, HDR) et langues audio / sous-titres d'une liste de pistes Emby */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function streamBadges(streams: any[] | undefined): string[] {
  if (!Array.isArray(streams) || !streams.length) return []
  const video = streams.find((s) => s.Type === 'Video')
  const badges: string[] = []
  const h = Number(video?.Height) || 0
  const w = Number(video?.Width) || 0
  if (h >= 2000 || w >= 3800) badges.push('4K')
  else if (h >= 1000 || w >= 1900) badges.push('1080p')
  else if (h >= 700 || w >= 1260) badges.push('720p')
  else if (h > 0) badges.push('SD')
  const range = `${video?.VideoRange ?? ''} ${video?.VideoRangeType ?? ''}`
  if (/dolby|dovi/i.test(range)) badges.push('Dolby Vision')
  else if (/hdr/i.test(range)) badges.push('HDR')
  const unique = (type: string) =>
    [...new Set(streams.filter((s) => s.Type === type).map((s) => lang(s.Language)).filter((l): l is string => Boolean(l)))].slice(0, 4)
  const audio = unique('Audio')
  const subs = unique('Subtitle')
  if (audio.length) badges.push(`Audio ${audio.join(' · ')}`)
  if (subs.length) badges.push(`ST ${subs.join(' · ')}`)
  return badges
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
  const dbUser = await withLinkedAccounts(await db.query.users.findFirst({ where: eq(users.email, user.email) }))
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let episodeStreams: any[] | undefined
      if (isSeries) {
        const unplayed = typeof data.UnplayedItemCount === 'number' ? data.UnplayedItemCount : undefined
        const current = await service.getSeriesResume(userId, embyId).catch(() => null)
        const next = current ?? (await service.getNextUp(userId, embyId).catch(() => null))
        episodeStreams = next?.MediaStreams
        const pos = next?.UserData?.PlaybackPositionTicks
        if (next && pos > 0) {
          const left = minutesLeft(next.RunTimeTicks, pos)
          status = {
            kind: 'resume',
            line: [episodeLabel(next), left ? `${left} min restantes` : null].filter(Boolean).join(' · '),
            progress: next.RunTimeTicks ? Math.min(1, pos / next.RunTimeTicks) : undefined,
            unplayed,
            minutes: left,
          }
          playItemId = String(next.Id)
          resume = true
        } else if (next) {
          status = { kind: 'next', line: `À suivre : ${episodeLabel(next)}`, unplayed, minutes: minutesLeft(next.RunTimeTicks, 1) }
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
            minutes: left,
          }
          resume = true
        } else if (data.Played) {
          status = { kind: 'watched', line: 'Vu', minutes: minutesLeft(item.RunTimeTicks, 1) }
        } else {
          status = { kind: 'new', line: 'Pas encore vu', minutes: minutesLeft(item.RunTimeTicks, 1) }
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

      // Connecté sur l'autre serveur que celui de la médiathèque : l'identifiant ci-dessus n'y existe
      // pas. Le média se retrouve par son identifiant TMDB (page du film ou de la série) ; sans
      // équivalent, pas de lien plutôt qu'un lien vers un autre serveur.
      let play: LibraryPreviewData['play'] = {
        serverUrl: url ? url.split('/web/')[0].replace(/\/$/, '') : null,
        serverId,
        itemId: playItemId,
        resume,
      }
      if ((platform.id === 'emby' || platform.id === 'jellyfin') && platform.id !== library.type) {
        const tmdbId = Number(item.ProviderIds?.Tmdb)
        const target = tmdbId
          ? await findPlayTarget(platform.id, dbUser, tmdbId, isSeries ? 'tv' : 'movie').catch(() => null)
          : null
        play = target
          ? { ...target, resume: false }
          : { serverUrl: null, serverId: null, itemId: '', resume: false }
      }

      return {
        meta,
        status,
        platform,
        play,
        originalTitle: item.OriginalTitle || undefined,
        year: startYear,
        // Séries : qualité et langues de l'épisode à lire
        badges: streamBadges(isSeries ? episodeStreams : item.MediaStreams),
        added: item.DateCreated
          ? `Ajouté le ${new Date(item.DateCreated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
          : undefined,
        tagline: Array.isArray(item.Taglines) && item.Taglines[0] ? String(item.Taglines[0]) : undefined,
        studio: Array.isArray(item.Studios) && item.Studios[0]?.Name ? String(item.Studios[0].Name) : undefined,
      }
    })
  } catch {
    return null
  }
}
