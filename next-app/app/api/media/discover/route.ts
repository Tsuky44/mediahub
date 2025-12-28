import { NextResponse } from 'next/server'
import { tmdbService } from '@/lib/services/tmdb'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword')
  const page = parseInt(searchParams.get('page') || '1')

  if (!keyword) {
    return NextResponse.json({ results: [], total_pages: 0 }, { status: 400 })
  }

  try {
    const keywordId = parseInt(keyword)
    const results = await tmdbService.discoverMixed({ 
      keywords: keywordId,
      page 
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('[API Discover] Error:', error)
    return NextResponse.json({ results: [], total_pages: 0 }, { status: 500 })
  }
}
