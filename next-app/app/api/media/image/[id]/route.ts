import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import axios from 'axios'
import { getSetting } from '@/lib/settings'

// Simple in-memory cache for TMDB poster paths
const tmdbPosterCache = new Map<string, string>()

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
    const mediaType = searchParams.get('mediaType') || 'movie'

    const user = await getCurrentUser()
    const instanceIdStr = user ? (user as any).instanceId : null
    let instanceId = instanceIdStr ? parseInt(instanceIdStr) : 1
    if (isNaN(instanceId)) instanceId = 1

    // If TMDB ID is provided, try to get image from TMDB first (as requested by user)
    if (tmdbId) {
      try {
        let posterPath = tmdbPosterCache.get(`${mediaType}-${tmdbId}`)
        const tmdbApiKey = await getSetting('tmdb_api_key', instanceId)

        if (!posterPath && tmdbApiKey) {
          const tmdbRes = await axios.get(`https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${tmdbId}`, {
            params: { api_key: tmdbApiKey }
          })
          posterPath = tmdbRes.data.poster_path
          if (posterPath) {
            tmdbPosterCache.set(`${mediaType}-${tmdbId}`, posterPath)
          }
        }

        if (posterPath) {
          const tmdbImageUrl = `https://image.tmdb.org/t/p/w500${posterPath}`
          console.log(`[Image Proxy]: Fetching from TMDB: ${tmdbImageUrl}`)
          const tmdbResponse = await axios.get(tmdbImageUrl, { responseType: 'arraybuffer' })
          
          return new NextResponse(tmdbResponse.data, {
            headers: {
              'Content-Type': tmdbResponse.headers['content-type'] || 'image/jpeg',
              'Cache-Control': 'public, max-age=31536000, immutable'
            }
          })
        }
      } catch (tmdbError: any) {
        console.error(`[Image Proxy]: TMDB fetch failed for ${mediaType} ${tmdbId}:`, tmdbError.message)
        // Fallback to Emby if TMDB fails
      }
    }

    // Fallback to Emby
    let embyBaseUrl = await getSetting('emby_url', instanceId)
    let embyApiKey = await getSetting('emby_api_key', instanceId)

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
        console.log(`[Image Proxy]: Fetching from Emby: ${imageUrl}`)
        const response = await axios.get(imageUrl, {
          params: {
            api_key: embyApiKey,
            maxHeight,
            maxWidth,
            quality
          },
          responseType: 'arraybuffer',
          timeout: 5000,
          headers: {
              'Accept': 'image/*, */*'
          }
        })

        const contentType = response.headers['content-type'] || 'image/jpeg'
        console.log(`[Image Proxy]: Success from Emby ${imageUrl} (${contentType})`)

        return new NextResponse(response.data, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        })
      } catch (axiosError: any) {
        console.warn(`[Image Proxy]: Failed for ${imageUrl}: ${axiosError.message}`)
      }
    }

    return new NextResponse('Image not found', { status: 404 })
  } catch (error) {
    console.error('[Image Proxy Global Error]:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
