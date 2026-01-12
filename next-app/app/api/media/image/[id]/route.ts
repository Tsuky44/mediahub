import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'

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
    const queryInstanceId = searchParams.get('instanceId')

    const user = await getCurrentUser()
    const instanceIdStr = user ? (user as any).instanceId : null
    
    // Default to the first instance ID we found in the DB if none provided
    let instanceId = queryInstanceId ? parseInt(queryInstanceId) : (instanceIdStr ? parseInt(instanceIdStr) : 3)
    if (isNaN(instanceId)) instanceId = 3

    console.log(`[Image Proxy]: Request for ID ${id}, instanceId ${instanceId}, tmdbId ${tmdbId}`)

    let finalTmdbId = tmdbId
    let finalMediaType = mediaType

    // If tmdbId is missing, try to get it from Emby first
    if (!finalTmdbId) {
      const cached = embyToTmdbCache.get(`${instanceId}-${id}`)
      if (cached) {
        finalTmdbId = cached.tmdbId
        finalMediaType = cached.mediaType
      } else {
        try {
          const embyBaseUrl = await getSetting('emby_url', instanceId)
          const embyApiKey = await getSetting('emby_api_key', instanceId)
          
          if (embyBaseUrl && embyApiKey) {
            const lookupUrl = `${embyBaseUrl.replace(/\/$/, '')}/Items/${id}?api_key=${embyApiKey}`
            const embyRes = await fetch(lookupUrl, { redirect: 'manual' })
            
            if (embyRes.status === 307 || embyRes.status === 301 || embyRes.status === 302) {
              console.warn(`[Image Proxy]: Emby redirected to ${embyRes.headers.get('location')} for metadata. API Key might be invalid or instance needs login. URL: ${lookupUrl}`)
            } else if (embyRes.ok) {
              const contentType = embyRes.headers.get('content-type') || ''
              if (contentType.includes('application/json')) {
                 const item = await embyRes.json()
                 const foundTmdbId = item.ProviderIds?.Tmdb || item.ProviderIds?.TMDB
                 if (foundTmdbId) {
                   finalTmdbId = String(foundTmdbId)
                   finalMediaType = (item.Type === 'Series' || item.Type === 'Episode') ? 'tv' : 'movie'
                   embyToTmdbCache.set(`${instanceId}-${id}`, { tmdbId: finalTmdbId, mediaType: finalMediaType as any })
                   console.log(`[Image Proxy]: Found missing TMDB ID for ${id}: ${finalTmdbId} (${finalMediaType})`)
                 }
               } else if (contentType.includes('text/html')) {
                 console.warn(`[Image Proxy]: Emby metadata lookup returned HTML. URL: ${lookupUrl}`)
               } else {
                 console.warn(`[Image Proxy]: Emby returned non-JSON content-type for metadata: ${contentType}`)
               }
            } else {
              console.warn(`[Image Proxy]: Emby metadata lookup failed with status ${embyRes.status} for ${lookupUrl}`)
            }
          }
        } catch (e) {
          console.warn(`[Image Proxy]: Failed to lookup TMDB ID for ${id} from Emby`)
        }
      }
    }

    // If still missing TMDB ID but we have a name, try searching TMDB directly
    if (!finalTmdbId && itemName) {
      try {
        let tmdbApiKey = await getSetting('tmdb_api_key', instanceId)
        if (!tmdbApiKey) {
          const defaultInstance = await (prisma as any).instance.findFirst({ where: { isDefault: true } })
          if (defaultInstance) tmdbApiKey = await getSetting('tmdb_api_key', defaultInstance.id)
        }

        if (tmdbApiKey) {
          // Clean name for search (remove SxxExx if present)
          const cleanName = itemName.split(' - s')[0].split(' - S')[0].trim()
          const searchType = finalMediaType === 'tv' ? 'tv' : 'movie'
          
          console.log(`[Image Proxy]: Searching TMDB for "${cleanName}" (${searchType})`)
          const tmdbSearchRes = await fetch(`https://api.themoviedb.org/3/search/${searchType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(cleanName)}`)
          
          if (tmdbSearchRes.ok) {
            const searchData = await tmdbSearchRes.json()
            if (searchData.results && searchData.results.length > 0) {
              const result = searchData.results[0]
              finalTmdbId = String(result.id)
              console.log(`[Image Proxy]: Found TMDB ID via search for "${cleanName}": ${finalTmdbId}`)
              // Cache it for this Emby ID too
              embyToTmdbCache.set(`${instanceId}-${id}`, { tmdbId: finalTmdbId, mediaType: finalMediaType as any })
            }
          }
        }
      } catch (searchError) {
        console.warn(`[Image Proxy]: TMDB search failed for "${itemName}"`)
      }
    }

    // If we have a TMDB ID (either from params or from lookup), try TMDB first
    if (finalTmdbId) {
      try {
        let posterPath = tmdbPosterCache.get(`${finalMediaType}-${finalTmdbId}`)
        let tmdbApiKey = await getSetting('tmdb_api_key', instanceId)
        
        // If no API key for this instance, try the default instance
        if (!tmdbApiKey) {
          const defaultInstance = await (prisma as any).instance.findFirst({ where: { isDefault: true } })
          if (defaultInstance && defaultInstance.id !== instanceId) {
            tmdbApiKey = await getSetting('tmdb_api_key', defaultInstance.id)
          }
        }

        console.log(`[Image Proxy]: TMDB lookup for ${finalMediaType} ${finalTmdbId}, apiKey found: ${!!tmdbApiKey}`)

        if (!posterPath && tmdbApiKey) {
          const tmdbMetaRes = await fetch(`https://api.themoviedb.org/3/${finalMediaType === 'movie' ? 'movie' : 'tv'}/${finalTmdbId}?api_key=${tmdbApiKey}`)
          if (tmdbMetaRes.ok) {
            const data = await tmdbMetaRes.json()
            posterPath = data.poster_path
            console.log(`[Image Proxy]: TMDB poster path found: ${posterPath}`)
            if (posterPath) {
              tmdbPosterCache.set(`${finalMediaType}-${finalTmdbId}`, posterPath)
            }
          } else {
            console.warn(`[Image Proxy]: TMDB meta fetch failed: ${tmdbMetaRes.status}`)
          }
        }

        if (posterPath) {
          const tmdbImageUrl = `https://image.tmdb.org/t/p/w500${posterPath}`
          console.log(`[Image Proxy]: Fetching from TMDB: ${tmdbImageUrl}`)
          
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
        console.error(`[Image Proxy]: TMDB fetch failed for ${finalMediaType} ${finalTmdbId}:`, tmdbError.message)
        // Fallback to Emby if TMDB fails
      }
    }

    // Fallback to Emby
    const instance = await (prisma as any).instance.findUnique({
      where: { id: instanceId }
    })

    let embyBaseUrl = await getSetting('emby_url', instanceId) || instance?.embyUrl
    let embyApiKey = await getSetting('emby_api_key', instanceId) || instance?.embyApiKey

    console.log(`[Image Proxy]: Emby settings for instance ${instanceId}: url=${embyBaseUrl}, hasKey=${!!embyApiKey}`)

    if (!embyBaseUrl || !embyApiKey) {
      console.error('[Image Proxy]: Emby not configured', { embyBaseUrl, hasApiKey: !!embyApiKey })
      return new NextResponse('Emby not configured', { status: 500 })
    }

    // Clean up baseUrl
    const baseUrl = embyBaseUrl.split('/web/')[0].replace(/\/$/, '')
    // Try both /Items and /emby/Items
    const urlsToTry = [
      `${baseUrl}/Items/${id}/Images/${type}`,
      `${baseUrl}/emby/Items/${id}/Images/${type}`
    ]

    for (const imageUrl of urlsToTry) {
      try {
        const queryParams = new URLSearchParams({
          api_key: embyApiKey,
        })
        if (maxHeight) queryParams.append('maxHeight', maxHeight)
        if (maxWidth) queryParams.append('maxWidth', maxWidth)
        if (quality) queryParams.append('quality', quality)

        const fetchUrl = `${imageUrl}?${queryParams.toString()}`
        const embyRes = await fetch(fetchUrl, {
          headers: {
            'Accept': 'image/*, */*'
          },
          redirect: 'manual',
          next: { revalidate: 3600 } // Cache for 1 hour
        })

        if (embyRes.status === 307 || embyRes.status === 301 || embyRes.status === 302) {
          console.warn(`[Image Proxy]: Emby redirected to ${embyRes.headers.get('location')} for image. URL: ${fetchUrl}`)
          continue
        }

        if (embyRes.ok) {
          const contentType = embyRes.headers.get('content-type') || ''
          if (!contentType.startsWith('image/')) {
            console.warn(`[Image Proxy]: Emby returned non-image content-type: ${contentType} for ${fetchUrl}`)
            continue
          }
          
          const buffer = await embyRes.arrayBuffer()
          console.log(`[Image Proxy]: Success from Emby ${fetchUrl} (${contentType})`)

          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable'
            }
          })
        } else {
          console.warn(`[Image Proxy]: Emby returned ${embyRes.status} for ${fetchUrl}`)
        }
      } catch (fetchError: any) {
        console.warn(`[Image Proxy]: Failed for ${imageUrl}: ${fetchError.message}`)
      }
    }

    return new NextResponse('Image not found', { status: 404 })
  } catch (error) {
    console.error('[Image Proxy Global Error]:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
