import { NextRequest, NextResponse } from 'next/server'
import { embyService } from '@/lib/services/emby'
import axios from 'axios'
import { getSetting } from '@/lib/settings'

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

    const embyBaseUrl = await getSetting('emby_url')
    const embyApiKey = await getSetting('emby_api_key')

    if (!embyBaseUrl || !embyApiKey) {
      return new NextResponse('Emby not configured', { status: 500 })
    }

    const baseUrl = embyBaseUrl.split('/web/')[0].replace(/\/$/, '')
    const imageUrl = `${baseUrl}/Items/${id}/Images/${type}`

    const response = await axios.get(imageUrl, {
      params: {
        api_key: embyApiKey,
        maxHeight,
        maxWidth,
        quality
      },
      responseType: 'arraybuffer'
    })

    const contentType = response.headers['content-type'] || 'image/jpeg'

    return new NextResponse(response.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    console.error('[Image Proxy Error]:', error)
    return new NextResponse('Image not found', { status: 404 })
  }
}
