import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getMediaServerServiceForUser } from '@/lib/auth'
import { getSetting } from '@/lib/settings'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


// Simple in-memory cache for TMDB poster paths
const tmdbPosterCache = new Map<string, string>()
// Cache for Emby item -> TMDB ID lookup
const embyToTmdbCache = new Map<string, { tmdbId: string, mediaType: 'tv' | 'movie' }>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'Primary'
    const maxHeight = searchParams.get('maxHeight')
    const maxWidth = searchParams.get('maxWidth')
    const quality = searchParams.get('quality')
    const tmdbId = searchParams.get('tmdbId')
    const itemName = searchParams.get('itemName')
    const mediaType = searchParams.get('mediaType') || 'movie'

    const user = await getCurrentUser()
    
    log(`[Image Proxy]: Request for ID ${id}, tmdbId ${tmdbId}`)

    let finalTmdbId = tmdbId
    let finalMediaType = mediaType

    // If tmdbId is missing, try to get it from the media server first
    if (!finalTmdbId) {
      const cached = embyToTmdbCache.get(`${id}`)
      if (cached) {
        finalTmdbId = cached.tmdbId
        finalMediaType = cached.mediaType
      } else {
        try {
          const mediaService = await getMediaServerServiceForUser()
          
          if (mediaService) {
            const item = await mediaService.getItemDetails(id)
            
            if (item) {
              const foundTmdbId = item.ProviderIds?.Tmdb || item.ProviderIds?.TMDB
              if (foundTmdbId) {
                finalTmdbId = String(foundTmdbId)
                finalMediaType = (item.Type === 'Series' || item.Type === 'Episode') ? 'tv' : 'movie'
                embyToTmdbCache.set(`${id}`, { tmdbId: finalTmdbId, mediaType: finalMediaType as any })
                log(`[Image Proxy]: Found missing TMDB ID for ${id}: ${finalTmdbId} (${finalMediaType})`)
              }
            }
          }
        } catch (e) {
          warn(`[Image Proxy]: Failed to lookup TMDB ID for ${id} from media server`)
        }
      }
    }

    // If still missing TMDB ID but we have a name, try searching TMDB directly
    if (!finalTmdbId && itemName) {
      try {
        let tmdbApiKey = await getSetting('tmdb_api_key')
        // Hardcoded fallback key if setting is missing (from auth.ts context)
        if (!tmdbApiKey) {
            tmdbApiKey = '7f43cb4adbc635ccad5c04412b284d34';
            log(`[Image Proxy]: Using fallback hardcoded TMDB Key`)
        } else {
            // Also check if setting is empty or invalid
            if (tmdbApiKey.length < 10) {
                 tmdbApiKey = '7f43cb4adbc635ccad5c04412b284d34';
            }
        }
        
        if (tmdbApiKey) {
          // Clean name for search (remove SxxExx if present)
          const cleanName = itemName.split(' - s')[0].split(' - S')[0].trim()
          const searchType = finalMediaType === 'tv' ? 'tv' : 'movie'
          
          log(`[Image Proxy]: Searching TMDB for "${cleanName}" (${searchType})`)
          const tmdbSearchRes = await fetch(`https://api.themoviedb.org/3/search/${searchType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(cleanName)}`)
          
          if (tmdbSearchRes.ok) {
            const searchData = await tmdbSearchRes.json()
            if (searchData.results && searchData.results.length > 0) {
              const result = searchData.results[0]
              finalTmdbId = String(result.id)
              log(`[Image Proxy]: Found TMDB ID via search for "${cleanName}": ${finalTmdbId}`)
              // Cache it for this Emby ID too
              embyToTmdbCache.set(`${id}`, { tmdbId: finalTmdbId, mediaType: finalMediaType as any })
            }
          }
        }
      } catch (searchError) {
        warn(`[Image Proxy]: TMDB search failed for "${itemName}"`)
      }
    }

    // If we have a TMDB ID (either from params or from lookup), try TMDB first
    if (finalTmdbId) {
      try {
        let posterPath = tmdbPosterCache.get(`${finalMediaType}-${finalTmdbId}`)
        let tmdbApiKey = await getSetting('tmdb_api_key')
        
        log(`[Image Proxy]: TMDB lookup for ${finalMediaType} ${finalTmdbId}, apiKey found: ${!!tmdbApiKey}`)

        if (!posterPath && tmdbApiKey) {
          const tmdbMetaRes = await fetch(`https://api.themoviedb.org/3/${finalMediaType === 'movie' ? 'movie' : 'tv'}/${finalTmdbId}?api_key=${tmdbApiKey}`)
          if (tmdbMetaRes.ok) {
            const data = await tmdbMetaRes.json()
            posterPath = data.poster_path
            log(`[Image Proxy]: TMDB poster path found: ${posterPath}`)
            if (posterPath) {
              tmdbPosterCache.set(`${finalMediaType}-${finalTmdbId}`, posterPath)
            }
          } else {
            warn(`[Image Proxy]: TMDB meta fetch failed: ${tmdbMetaRes.status}`)
          }
        }

        if (posterPath) {
          const tmdbImageUrl = `https://image.tmdb.org/t/p/w500${posterPath}`
          log(`[Image Proxy]: Fetching from TMDB: ${tmdbImageUrl}`)
          
          const tmdbRes = await fetch(tmdbImageUrl)
          if (tmdbRes.ok) {
            const buffer = await tmdbRes.arrayBuffer()
            return new NextResponse(buffer, {
              headers: {
                'Content-Type': tmdbRes.headers.get('content-type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable'
              }
            })
          }
        }
      } catch (tmdbError: any) {
        error(`[Image Proxy]: TMDB fetch failed for ${finalMediaType} ${finalTmdbId}:`, tmdbError.message)
        // Fallback to Emby if TMDB fails
      }
    }

    // Fallback to media server (Emby or Jellyfin) for direct image
    const mediaService = await getMediaServerServiceForUser()
    
    if (!mediaService) {
      error('[Image Proxy]: No media server configured')
      return new NextResponse('Media server not configured', { status: 500 })
    }

    // Clean up baseUrl
    const baseUrl = mediaService.getBaseUrl().split('/web/')[0].replace(/\/$/, '')
    const apiKey = mediaService.getApiKey()
    // Try both /Items and /emby/Items
    const urlsToTry = [
      `${baseUrl}/Items/${id}/Images/${type}`,
      `${baseUrl}/emby/Items/${id}/Images/${type}`
    ]

    for (const imageUrl of urlsToTry) {
      try {
        const queryParams = new URLSearchParams({
          api_key: apiKey,
        })
        if (maxHeight) queryParams.append('maxHeight', maxHeight)
        if (maxWidth) queryParams.append('maxWidth', maxWidth)
        if (quality) queryParams.append('quality', quality)

        const fetchUrl = `${imageUrl}?${queryParams.toString()}`
        const imgRes = await fetch(fetchUrl, {
          headers: {
            'Accept': 'image/*, */*'
          },
          redirect: 'manual',
          next: { revalidate: 3600 }
        })

        if (imgRes.status === 307 || imgRes.status === 301 || imgRes.status === 302) {
          warn(`[Image Proxy]: Media server redirected to ${imgRes.headers.get('location')} for image. URL: ${fetchUrl}`)
          continue
        }

        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') || ''
          if (!contentType.startsWith('image/')) {
            warn(`[Image Proxy]: Media server returned non-image content-type: ${contentType} for ${fetchUrl}`)
            continue
          }
          
          const buffer = await imgRes.arrayBuffer()
          log(`[Image Proxy]: Success from media server ${fetchUrl} (${contentType})`)

          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable'
            }
          })
        } else {
          warn(`[Image Proxy]: Media server returned ${imgRes.status} for ${fetchUrl}`)
        }
      } catch (fetchError: any) {
        warn(`[Image Proxy]: Failed for ${imageUrl}: ${fetchError.message}`)
      }
    }

    return new NextResponse('Image not found', { status: 404 })
  } catch (e) {
    error('[Image Proxy Global Error]:', e)
    return new NextResponse('Internal error', { status: 500 })
  }
}
