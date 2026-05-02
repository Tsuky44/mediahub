import type { InterpolatedSession } from './useLiveSessionsInterpolation'

export interface SessionDisplay {
  displayName: string
  subName: string
  progress: number
  href: string | null
  isEpisode: boolean
  source: string | null
}

export function formatSessionDisplay(session: InterpolatedSession): SessionDisplay {
  const isEpisode = session.itemType === 'Episode'
  let displayName = session.itemName || 'Unknown'
  const subName = `${session.userName} \u2022 ${session.device}`

  const mediaInfo =
    typeof session.mediaInfo === 'string'
      ? JSON.parse(session.mediaInfo)
      : (session.mediaInfo || {})

  const seriesName =
    session.seriesName || session.SeriesName || mediaInfo.seriesName || mediaInfo.SeriesName
  const seasonIndex =
    session.seasonIndex ?? session.ParentIndexNumber ?? mediaInfo.seasonIndex ?? mediaInfo.ParentIndexNumber
  const episodeIndex =
    session.episodeIndex ?? session.IndexNumber ?? mediaInfo.episodeIndex ?? mediaInfo.IndexNumber

  if (isEpisode) {
    const s = seasonIndex
    const e = episodeIndex
    let seString = ''

    if (s !== undefined && e !== undefined) {
      const seasonStr = s < 10 ? `0${s}` : s
      const episodeStr = e < 10 ? `0${e}` : e
      seString = `S${seasonStr}E${episodeStr}`
    }

    if (seriesName) {
      displayName = seriesName
      if (seString) displayName += ` - ${seString}`
      let episodeTitle = session.itemName || ''
      if (episodeTitle.startsWith(seriesName)) {
        episodeTitle = episodeTitle.substring(seriesName.length).replace(/^[\s-:]+/, '')
      }
      if (episodeTitle) displayName += ` - ${episodeTitle}`
    } else if (session.itemName?.includes(' : ')) {
      const parts = session.itemName.split(' : ')
      displayName = parts[0]
      if (seString) displayName += ` - ${seString}`
      if (parts.length > 1) displayName += ` - ${parts.slice(1).join(' : ')}`
    } else {
      if (seString) {
        displayName = `${seString} - ${displayName}`
      }
    }
  }

  let progress = 0
  if (session.runTimeTicks && session.playbackPosition) {
    const total = Number(session.runTimeTicks)
    const current = Number(session.playbackPosition)
    if (total > 0) {
      progress = Math.round((current / total) * 100)
    }
  }

  const tmdbId = session.tmdbId || session.TmdbId || mediaInfo.tmdbId || mediaInfo.ProviderIds?.Tmdb
  const itemId = session.itemId || session.NowPlayingItemId || session.Id

  const searchName = isEpisode ? seriesName || session.seriesName || displayName : session.itemName || displayName

  const mediaInfoSeasonIndex = mediaInfo.seasonIndex ?? mediaInfo.ParentIndexNumber
  const mediaInfoEpisodeIndex = mediaInfo.episodeIndex ?? mediaInfo.IndexNumber
  const sIdx = seasonIndex ?? mediaInfoSeasonIndex
  const eIdx = episodeIndex ?? mediaInfoEpisodeIndex

  let href: string | null = null
  if (tmdbId) {
    href = `/dashboard/media/${tmdbId}?type=${isEpisode ? 'tv' : 'movie'}${
      isEpisode && sIdx !== undefined && eIdx !== undefined ? `&season=${sIdx}&episode=${eIdx}` : ''
    }`
  } else if (itemId) {
    href = `/dashboard/media/${itemId}?type=${isEpisode ? 'tv' : 'movie'}&source=${session.source || 'emby'}&name=${encodeURIComponent(searchName ?? 'Unknown')}${
      isEpisode && sIdx !== undefined && eIdx !== undefined ? `&season=${sIdx}&episode=${eIdx}` : ''
    }`
  }

  return { displayName, subName, progress, href, isEpisode, source: session.source ?? null }
}
