import { fetchEmbyMedia } from './actions'
import { InfiniteEmbyList } from './InfiniteEmbyList'
import { SearchInput } from '@/components/SearchInput'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q: query, type = 'movie' } = await searchParams
  const currentType = type === 'tv' ? 'tv' : 'movie'
  
  let initialData: { results: any[]; total_pages: number } = { results: [], total_pages: 0 }
  
  try {
    initialData = await fetchEmbyMedia(1, currentType, query)
  } catch (e) {
      console.error('Failed to fetch media', e)
  }

  return (
      <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">Ma médiathèque</h2>
            <Suspense fallback={<div className="h-10 w-full max-w-md bg-gray-800 rounded-full animate-pulse" />}>
              <SearchInput />
            </Suspense>
          </div>
          
          <div className="flex justify-center border-b border-gray-700">
            <div className="flex space-x-8">
              <a 
                href={`?type=movie${query ? `&q=${query}` : ''}`}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                  currentType === 'movie' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Films
              </a>
              <a 
                href={`?type=tv${query ? `&q=${query}` : ''}`}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                  currentType === 'tv' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Séries
              </a>
            </div>
          </div>

          <InfiniteEmbyList 
            initialItems={initialData.results} 
            type={currentType} 
            query={query} 
          />
      </div>
  )
}
