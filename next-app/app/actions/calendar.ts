'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService } from '@/lib/services/sonarr'
import { getTmdbService } from '@/lib/services/tmdb'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };

// Typed shapes for external API responses
interface TmdbSeason {
  season_number: number
  air_date?: string
}
interface TmdbEpisode {
  id?: number | string
  air_date?: string
  episode_number: number
  name: string
  overview?: string
  still_path?: string
}
interface RadarrCalendarMovie {
  id: number
  inCinemas?: string
  digitalRelease?: string
  physicalRelease?: string
  added?: string
  tmdbId: number
  title: string
  overview?: string
  images?: Array<{ coverType?: string; url?: string; remoteUrl?: string }>
  certification?: string
  genres?: string[]
  runtime?: number
  hasFile: boolean
  monitored: boolean
}
interface SonarrCalendarEpisode {
  id: number
  airDateUtc?: string
  seasonNumber: number
  episodeNumber: number
  title: string
  overview?: string
  hasFile: boolean
  monitored: boolean
  series: {
    id: number
    title: string
    tmdbId?: number
    tvdbId?: number
    images?: Array<{ coverType?: string; url?: string; remoteUrl?: string }>
    overview?: string
    certification?: string
    genres?: string[]
    runtime?: number
    network?: string
  }
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end?: Date
  allDay?: boolean
  resource?: unknown
  type: 'request' | 'personal'
  mediaType: 'movie' | 'tv'
  tmdbId: string
  status?: string
  overview?: string
  posterUrl?: string
  seasonNumber?: number
  episodeNumber?: number
}

export async function getCalendarEvents(start: Date, end: Date) {
  log(`[Calendar] Fetching events from ${start.toISOString()} to ${end.toISOString()}`)
  const user = await getCurrentUser()
  if (!user || !user.email) {
    log('[Calendar] No authenticated user found')
    return []
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true }
  })

  if (!dbUser) {
    log('[Calendar] User not found in database')
    return []
  }
  
  const events: CalendarEvent[] = []
  
  const tmdb = await getTmdbService()

  // 1. Fetch Personal Events (Stored in DB)
  try {
    const personalEvents = await prisma.userCalendarEvent.findMany({
        where: {
        userId: dbUser.id
        }
    })
    log(`[Calendar] Found ${personalEvents.length} personal subscriptions`)

    // Process personal events (Movies use stored date, TV shows fetch episodes)
    
    const personalPromises = personalEvents.map(async (e: { id: string; mediaType: string; releaseDate: Date; tmdbId: string; title: string }) => {
        if (e.mediaType === 'movie') {
        // For movies, only show if releaseDate is in range
        if (e.releaseDate >= start && e.releaseDate <= end) {
            let posterUrl, overview
            if (tmdb) {
                try {
                    const details = await tmdb.getDetails(parseInt(e.tmdbId), 'movie')
                    if (details) {
                        posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined
                        overview = details.overview
                    }
                } catch (err) {
                    error(`[Calendar] Failed to fetch details for personal movie ${e.title}`, err)
                }
            }

            return [{
            id: `personal-${e.id}`,
            title: e.title,
            start: e.releaseDate,
            end: e.releaseDate, // Explicit end date
            allDay: true,
            type: 'personal',
            mediaType: 'movie',
            tmdbId: e.tmdbId,
            overview,
            posterUrl
            }] as CalendarEvent[]
        }
        return []
        } else if (e.mediaType === 'tv' && tmdb) {
        // For TV shows, fetch upcoming episodes from TMDB
        try {
            const show = await tmdb.getDetails(parseInt(e.tmdbId), 'tv')
            if (!show || !show.seasons) return []
            
            const showPosterUrl = show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined

            const showEvents: CalendarEvent[] = []
            
            // Filter relevant seasons: Last season + current season + next season
            const relevantSeasons = show.seasons
            .filter((s: TmdbSeason) => s.season_number > 0 && s.air_date) // Skip specials and seasons without date
            .sort((a: TmdbSeason, b: TmdbSeason) => b.season_number - a.season_number)
            .slice(0, 3) // Check last 3 seasons just in case

            for (const season of relevantSeasons) {
            const seasonDetails = await tmdb.getSeasonDetails(parseInt(e.tmdbId), season.season_number)
            if (seasonDetails && seasonDetails.episodes) {
                // Group episodes by air_date
                const episodesByDate = new Map<string, TmdbEpisode[]>()

                seasonDetails.episodes.forEach((ep: TmdbEpisode) => {
                if (ep.air_date) {
                    const dateStr = ep.air_date
                    if (!episodesByDate.has(dateStr)) {
                    episodesByDate.set(dateStr, [])
                    }
                    episodesByDate.get(dateStr)?.push(ep)
                }
                })

                // Process grouped episodes
                for (const [dateStr, episodes] of episodesByDate.entries()) {
                const airDate = new Date(dateStr)
                if (airDate >= start && airDate <= end) {
                    if (episodes.length > 1) {
                    // Season release (or bulk)
                    showEvents.push({
                        id: `personal-tv-${e.id}-S${season.season_number}-Release`,
                        title: `${show.name} - Saison ${season.season_number}`,
                        start: airDate,
                        end: airDate,
                        allDay: true,
                        type: 'personal',
                        mediaType: 'tv',
                        tmdbId: e.tmdbId,
                        overview: seasonDetails.overview || show.overview,
                        posterUrl: seasonDetails.poster_path ? `https://image.tmdb.org/t/p/w500${seasonDetails.poster_path}` : showPosterUrl,
                        seasonNumber: season.season_number
                    })
                    } else {
                    // Single episode
                    const ep = episodes[0]
                    showEvents.push({
                        id: `personal-tv-${e.id}-${ep.id}`,
                        title: `${show.name} - S${season.season_number}E${ep.episode_number}`,
                        start: airDate,
                        end: airDate,
                        allDay: true,
                        type: 'personal',
                        mediaType: 'tv',
                        tmdbId: e.tmdbId,
                        overview: ep.overview || show.overview,
                        posterUrl: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : showPosterUrl,
                        seasonNumber: season.season_number,
                        episodeNumber: ep.episode_number
                    })
                    }
                }
                }
            }
            }
            return showEvents
        } catch (err) {
            error(`[Calendar] Failed to fetch episodes for personal show ${e.title}`, err)
            return []
        }
        }
        return []
    })

    const processedPersonalEvents = (await Promise.all(personalPromises)).flat()
    events.push(...processedPersonalEvents)
    log(`[Calendar] Processed ${processedPersonalEvents.length} personal episodes/movies`)
  } catch (err) {
    error('[Calendar] Error processing personal events:', err)
  }

  // 2. Fetch Radarr Calendar (Movies)
  try {
    const radarr = await getRadarrService()
    if (radarr) {
      const movies = await radarr.getCalendar(start, end)
      log(`[Calendar] Found ${movies.length} Radarr movies`)
      
      const radarrEventsPromises = movies.map(async (m: RadarrCalendarMovie) => {
        // Calculate the best date
        const date = new Date(m.inCinemas || m.digitalRelease || m.physicalRelease || m.added || '')
        
        // Use the event if Radarr returned it, trusting the service's date range filter mostly
        // But still good to check if it's completely out of bounds, but let's be more lenient or log if we drop it
        if (true) { // Was: if (date >= start && date <= end)
            let posterUrl, overview = m.overview
            if (tmdb) {
                try {
                    const details = await tmdb.getDetails(m.tmdbId, 'movie')
                    if (details) {
                        posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined
                        if (details.overview) overview = details.overview
                    }
                } catch (e) {
                    // Ignore TMDB errors, fall back to basic info
                }
            }

            return {
              id: `radarr-${m.id}`,
              title: m.title,
              start: date,
              end: date, // Explicit end date
              allDay: true,
              type: 'request',
              mediaType: 'movie',
              tmdbId: m.tmdbId.toString(),
              status: m.hasFile ? 'available' : (m.monitored ? 'monitored' : 'unmonitored'),
              overview,
              posterUrl
            } as CalendarEvent
        }
        return null
      })

      const radarrEvents = (await Promise.all(radarrEventsPromises)).filter((e): e is CalendarEvent => e !== null)
      events.push(...radarrEvents)
    } else {
        warn('[Calendar] Radarr service not available')
    }
  } catch (e) {
    error('[Calendar] Failed to fetch Radarr calendar', e)
  }

  // 3. Fetch Sonarr Calendar (Series)
  try {
    const sonarr = await getSonarrService()
    if (sonarr) {
      const episodes = (await sonarr.getCalendar(start, end)) as unknown as SonarrCalendarEpisode[]
      log(`[Calendar] Found ${episodes.length} Sonarr episodes`)
      
      // Group episodes by seriesId + seasonNumber + airDate
      const episodesGrouped = new Map<string, SonarrCalendarEpisode[]>()

      episodes.forEach((e: SonarrCalendarEpisode) => {
          const date = new Date(e.airDateUtc || '').toISOString().split('T')[0]
          const key = `${e.series.id}-${e.seasonNumber}-${date}`
          if (!episodesGrouped.has(key)) {
              episodesGrouped.set(key, [])
          }
          episodesGrouped.get(key)?.push(e)
      })

      const sonarrEventsPromises = Array.from(episodesGrouped.values()).map(async (groupEpisodes) => {
        const firstEp = groupEpisodes[0]
        const tmdbId = firstEp.series.tmdbId || firstEp.series.tvdbId
        const startDate = new Date(firstEp.airDateUtc || '')
        const endDate = new Date(startDate.getTime() + (30 * 60 * 1000))
        
        // Relaxed filter: Trust Sonarr's return
        // if (startDate < start || startDate > end) return null

        let posterUrl, overview = firstEp.overview
        let title = `${firstEp.series.title} - S${firstEp.seasonNumber}E${firstEp.episodeNumber}`
        let isSeasonRelease = false

        if (groupEpisodes.length > 1) {
            isSeasonRelease = true
            title = `${firstEp.series.title} - Saison ${firstEp.seasonNumber}`
            overview = "Saison complète disponible." // Placeholder
        }

        if (tmdb && firstEp.series.tmdbId) {
            try {
                // Fetch season details
                const season = await tmdb.getSeasonDetails(firstEp.series.tmdbId, firstEp.seasonNumber)
                
                if (isSeasonRelease) {
                    // Season Release: Use season overview and poster
                    if (season) {
                        if (season.overview) overview = season.overview
                        if (season.poster_path) posterUrl = `https://image.tmdb.org/t/p/w500${season.poster_path}`
                    }
                } else {
                    // Single Episode: Use episode overview and still
                    let episodeFound = false
                    if (season && season.episodes) {
                        const episode = season.episodes.find((ep: TmdbEpisode) => ep.episode_number === firstEp.episodeNumber)
                        if (episode) {
                            episodeFound = true
                            if (episode.overview) overview = episode.overview
                            if (episode.still_path) posterUrl = `https://image.tmdb.org/t/p/w500${episode.still_path}`
                        }
                    }
                }

                // Fallback for poster if not found
                if (!posterUrl) {
                     const show = await tmdb.getDetails(firstEp.series.tmdbId, 'tv')
                     if (show && show.poster_path) {
                         posterUrl = `https://image.tmdb.org/t/p/w500${show.poster_path}`
                     }
                     // Fallback overview for single episode if missing
                     if (!isSeasonRelease && !overview && show) {
                         overview = show.overview
                     }
                }

            } catch (err) {
                // Ignore
            }
        }

        return {
            id: isSeasonRelease ? `sonarr-${firstEp.series.id}-S${firstEp.seasonNumber}-Release` : `sonarr-${firstEp.id}`,
            title,
            start: startDate,
            end: endDate,
            allDay: isSeasonRelease, // Season releases are usually all day events
            type: 'request',
            mediaType: 'tv',
            tmdbId: tmdbId?.toString() ?? '',
            status: firstEp.hasFile ? 'available' : (firstEp.monitored ? 'monitored' : 'unmonitored'),
            overview,
            posterUrl,
            seasonNumber: firstEp.seasonNumber,
            episodeNumber: isSeasonRelease ? undefined : firstEp.episodeNumber
        } as CalendarEvent
      })

      const sonarrEvents = (await Promise.all(sonarrEventsPromises)).filter((e): e is CalendarEvent => e !== null)
      events.push(...sonarrEvents)
    }
  } catch (e) {
    error('Failed to fetch Sonarr calendar', e)
  }

  // Remove duplicates based on ID if any (e.g. same movie in personal and radarr?)
  // Usually we keep both or prioritize one.
  // Personal events are distinct by ID prefix.
  
  return events
}

export async function addToCalendar(tmdbId: string, mediaType: 'movie' | 'tv', title: string, releaseDate: Date) {
  const user = await getCurrentUser()
  if (!user || !user.email) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true }
  })

  if (!dbUser) throw new Error('User not found')

  // Check if already exists
  const existing = await prisma.userCalendarEvent.findFirst({
    where: {
      userId: dbUser.id,
      tmdbId: tmdbId.toString(),
      mediaType
    }
  })

  if (existing) {
    // Update date if needed
    await prisma.userCalendarEvent.update({
      where: { id: existing.id },
      data: { releaseDate }
    })
  } else {
    await prisma.userCalendarEvent.create({
      data: {
        userId: dbUser.id,
        tmdbId: tmdbId.toString(),
        mediaType,
        title,
        releaseDate
      }
    })
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function removeFromCalendar(tmdbId: string, mediaType: 'movie' | 'tv') {
  const user = await getCurrentUser()
  if (!user || !user.email) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true }
  })

  if (!dbUser) throw new Error('User not found')

  await prisma.userCalendarEvent.deleteMany({
    where: {
      userId: dbUser.id,
      tmdbId: tmdbId.toString(),
      mediaType
    }
  })

  revalidatePath('/dashboard')
  return { success: true }
}
