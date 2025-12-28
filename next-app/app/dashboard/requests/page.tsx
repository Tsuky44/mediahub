import { fetchMedia } from './actions'
import { InfiniteMediaList } from './InfiniteMediaList'
import { SearchInput } from '@/components/SearchInput'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const { q: query, filter } = await searchParams
  let results: any[] = []
  let title = 'Demander'
  let currentType: 'all' | 'movie' | 'tv' = 'all'

  // Determine type based on filter
  if (filter === 'movie') currentType = 'movie'
  else if (filter === 'tv') currentType = 'tv'
  else currentType = 'all'

  try {
      // Use fetchMedia to get enriched data (with Jellyseerr status)
      const data = await fetchMedia(1, currentType, query)
      results = data.results || []

      if (query) {
          title = `Résultats pour "${query}"`
      } else if (currentType === 'movie') {
          title = 'Films Populaires'
      } else if (currentType === 'tv') {
          title = 'Séries Populaires'
      } else {
          title = 'Tendances'
      }
  } catch (e) {
      console.error('Failed to fetch discovery data', e)
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <Suspense fallback={<div className="h-10 w-full max-w-md bg-gray-800 rounded-full animate-pulse" />}>
              <SearchInput />
            </Suspense>
        </div>
        <Suspense fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        }>
          <InfiniteMediaList 
              initialItems={results} 
              initialType={currentType} 
              initialSearch={query} 
          />
        </Suspense>
    </div>
  )
}
