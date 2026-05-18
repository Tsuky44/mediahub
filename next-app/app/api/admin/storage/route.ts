import { NextResponse } from 'next/server'
import { getRealUser } from '@/lib/auth'
import { EmbyService } from '@/lib/services/emby'
import { SonarrService } from '@/lib/services/sonarr'
import { RadarrService } from '@/lib/services/radarr'
import { getSetting } from '@/lib/settings'
import { defineAbilityFor } from '@/lib/ability'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };


export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getRealUser() as { role: string }
    const ability = defineAbilityFor(user)

    if (!user || (!ability.can('manage_storage', 'Stats') && user?.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const embyUrl = await getSetting('emby_url')
    const embyApiKey = await getSetting('emby_api_key')

    if (!embyUrl || !embyApiKey) {
      return NextResponse.json({ error: 'Emby not configured' }, { status: 500 })
    }

    const embyService = new EmbyService(embyUrl, embyApiKey)

    const items = await embyService.getStorageItems()
    const activeSessions: Array<Record<string, unknown>> = []

    // 3. Process and Group items
    const movies: Array<Record<string, unknown>> = []
    const seriesMap = new Map<string, Record<string, unknown>>()

    // First pass: Initialize Series
    for (const item of items) {
      if (item.Type === 'Series') {
        seriesMap.set(item.Id, {
          id: item.Id,
          name: item.Name,
          type: 'Series',
          size: 0,
          path: item.Path,
          isPlaying: false,
          activeUser: null,
          episodesCount: 0,
          addedAt: item.DateCreated,
          tvdbId: item.ProviderIds?.Tvdb
        })
      }
    }

    // Second pass: Process Episodes and Movies
    for (const item of items) {
      let size = 0
      if (item.MediaSources && item.MediaSources.length > 0) {
        size = item.MediaSources.reduce((acc: number, src: Record<string, unknown>) => acc + ((src.Size as number) || 0), 0)
      }

      const activeSession = activeSessions.find(s => s.itemId === item.Id || (item.Type === 'Episode' && s.itemId === item.Id))
      const isPlaying = !!activeSession
      const activeUser = activeSession?.userName

      if (item.Type === 'Movie') {
        movies.push({
          id: item.Id,
          name: item.Name,
          type: 'Movie',
          size,
          path: item.Path,
          isPlaying,
          activeUser,
          addedAt: item.DateCreated,
          tmdbId: item.ProviderIds?.Tmdb
        })
      } else if (item.Type === 'Episode') {
        const seriesId = item.SeriesId
        if (!seriesId) continue

        let series = seriesMap.get(seriesId)
        
        // If series not found (maybe not returned by Emby query?), create it from episode info
        if (!series) {
             series = {
                id: seriesId,
                name: item.SeriesName || 'Unknown Series',
                type: 'Series',
                size: 0,
                path: item.Path,
                isPlaying: false,
                activeUser: null,
                episodesCount: 0,
                addedAt: item.DateCreated,
                tvdbId: null // Missing if series object not found
             }
             seriesMap.set(seriesId, series)
        }

        const typedSeries = series as { size: number; episodesCount: number }
        typedSeries.size += size
        typedSeries.episodesCount += 1
        
        if (isPlaying) {
          series.isPlaying = true
          series.activeUser = activeUser
        }
      }
    }

    const series = Array.from(seriesMap.values())
    const allItems = [...movies, ...series].sort((a, b) => ((b as { size?: number }).size || 0) - ((a as { size?: number }).size || 0))

    return NextResponse.json(allItems)
  } catch (err) {
    error('Storage API Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getRealUser() as { role: string }
    const ability = defineAbilityFor(user)

    if (!user || (!ability.can('delete_media', 'Stats') && user?.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, type, deleteFromArr, providerId, seasonNumber } = body

    if (!itemId) {
        return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    const embyUrl = await getSetting('emby_url')
    const embyApiKey = await getSetting('emby_api_key')
    
    if (!embyUrl || !embyApiKey) {
        return NextResponse.json({ error: 'Emby not configured' }, { status: 500 })
    }

    const embyService = new EmbyService(embyUrl, embyApiKey)

    // Get item info before deletion to know parent for refresh (Series/Season)
    const itemInfo = await embyService.getItemDetails(itemId)
    const parentId = itemInfo?.SeriesId || itemInfo?.ParentId

    // 1. Delete/Unmonitor from *Arr (Files first!)
    // We prioritize deleting files so Emby doesn't re-scan them
    if (deleteFromArr) {
        if (type === 'Movie') {
            const radarrUrl = await getSetting('radarr_url')
            const radarrApiKey = await getSetting('radarr_api_key')
            
            if (radarrUrl && radarrApiKey && providerId) {
                const radarrService = new RadarrService(radarrUrl, radarrApiKey)
                try {
                    const movie = await radarrService.getMovieByTmdbId(providerId)
                    if (movie && movie.id) {
                         await radarrService.deleteMovie(movie.id, true)
                    }
                } catch (e) {
                    error('Failed to delete from Radarr:', e)
                }
            }
        } else if (type === 'Series') {
             const sonarrUrl = await getSetting('sonarr_url')
             const sonarrApiKey = await getSetting('sonarr_api_key')
             
             if (sonarrUrl && sonarrApiKey && providerId) {
                 const sonarrService = new SonarrService(sonarrUrl, sonarrApiKey)
                 try {
                     const series = await sonarrService.getSeriesByTvdbId(providerId)
                     if (series && series.id) {
                         await sonarrService.deleteSeries(series.id, true)
                     }
                 } catch (e) {
                     error('Failed to delete Series from Sonarr:', e)
                 }
             }
        } else if (type === 'Season') {
            const sonarrUrl = await getSetting('sonarr_url')
            const sonarrApiKey = await getSetting('sonarr_api_key')
             
             if (sonarrUrl && sonarrApiKey && providerId && seasonNumber !== undefined) {
                 const sonarrService = new SonarrService(sonarrUrl, sonarrApiKey)
                 try {
                     const series = await sonarrService.getSeriesByTvdbId(providerId)
                     if (series && series.id) {
                         // Unmonitor the season to prevent redownload
                         await sonarrService.unmonitorSeason(series.id, seasonNumber)
                         
                         // Delete all episode files for this season
                         try {
                             const files = await sonarrService.getEpisodeFiles(series.id)
                             const seasonFiles = files.filter(f => f.seasonNumber === seasonNumber)
                             
                             log(`Deleting ${seasonFiles.length} files for Season ${seasonNumber} of series ${series.title}`)
                             
                             for (const file of seasonFiles) {
                                 await sonarrService.deleteEpisodeFile(file.id)
                             }
                         } catch (fileError) {
                             error('Failed to delete season files:', fileError)
                         }
                    }
                } catch (e) {
                    error('Failed to unmonitor/delete Season from Sonarr:', e)
                }
            }
        }
    }

    // 2. Delete from Emby
    try {
        if (type === 'Season' && parentId && seasonNumber !== undefined) {
            // Delete individual episodes first to ensure they are gone from stats/metadata immediately
            await embyService.deleteEpisodesBySeasonNumber(parentId, seasonNumber)
        }
        await embyService.deleteItem(itemId)
    } catch (e) {
        error('Failed to delete item from Emby:', e)
    }

    // 3. Refresh Parent in Emby (if applicable)
    // This forces Emby to realize the season/episodes are gone if deleteItem didn't fully clean up or if files were just removed
    if (parentId) {
        log(`Refreshing parent item ${parentId} in Emby`)
        await embyService.refreshItem(parentId)
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    error('Storage Delete API Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

