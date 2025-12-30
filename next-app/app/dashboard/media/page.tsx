import { fetchEmbyMedia, fetchRecentlyWatchedItems } from './actions'
import { InfiniteEmbyList } from './InfiniteEmbyList'
import { SearchInput } from '@/components/SearchInput'
import { Suspense } from 'react'
import { RecentlyWatched } from './RecentlyWatched'

export const dynamic = 'force-dynamic'

export default async function MediaPage({ searchParams }: { searchParams: Promise<any> }) {
  const { q: query, type = 'all', favorites = 'false', watchLater = 'false' } = await searchParams
  const currentType = (type === 'tv' || type === 'movie' || type === 'all') ? type : 'all'
  const isFavoritesOnly = favorites === 'true'
  const isWatchLaterOnly = watchLater === 'true'
  
  let initialData: { results: any[]; total_pages: number } = { results: [], total_pages: 0 }
  let recentlyWatchedItems: any[] = []
  
  const showRecentlyWatched = currentType === 'all' && !query && !isFavoritesOnly && !isWatchLaterOnly

  try {
    const promises: Promise<any>[] = []
    
    promises.push(fetchEmbyMedia(1, currentType as 'movie' | 'tv' | 'all', query, isFavoritesOnly, isWatchLaterOnly))

    if (showRecentlyWatched) {
        promises.push(fetchRecentlyWatchedItems())
    }

    const results = await Promise.all(promises)
    
    initialData = results[0]

    if (showRecentlyWatched) {
        recentlyWatchedItems = results[results.length - 1]
    }
  } catch (e) {
      console.error('Failed to fetch media', e)
  }

  return (
      <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">Ma médiathèque</h2>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <a
                href={`?type=${currentType}${query ? `&q=${query}` : ''}&favorites=${!isFavoritesOnly}${isWatchLaterOnly ? '&watchLater=true' : ''}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isFavoritesOnly 
                    ? 'bg-red-500 text-white hover:bg-red-400' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                Favoris
              </a>

              <a
                href={`?type=${currentType}${query ? `&q=${query}` : ''}&watchLater=${!isWatchLaterOnly}${isFavoritesOnly ? '&favorites=true' : ''}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isWatchLaterOnly 
                    ? 'bg-blue-500 text-white hover:bg-blue-400' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isWatchLaterOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                À regarder
              </a>

              <Suspense fallback={<div className="h-10 w-full max-w-md bg-gray-800 rounded-full animate-pulse" />}>
                <SearchInput />
              </Suspense>
            </div>
          </div>
          
          <div className="flex justify-center border-b border-gray-700">
            <div className="flex space-x-8">
              <a 
                href={`?type=all${query ? `&q=${query}` : ''}${isFavoritesOnly ? '&favorites=true' : ''}${isWatchLaterOnly ? '&watchLater=true' : ''}`}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                  currentType === 'all' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Tout
              </a>
              <a 
                href={`?type=movie${query ? `&q=${query}` : ''}${isFavoritesOnly ? '&favorites=true' : ''}${isWatchLaterOnly ? '&watchLater=true' : ''}`}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                  currentType === 'movie' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Films
              </a>
              <a 
                href={`?type=tv${query ? `&q=${query}` : ''}${isFavoritesOnly ? '&favorites=true' : ''}${isWatchLaterOnly ? '&watchLater=true' : ''}`}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                  currentType === 'tv' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Séries
              </a>
            </div>
          </div>

          <>
              {showRecentlyWatched && recentlyWatchedItems.length > 0 && (
                <RecentlyWatched items={recentlyWatchedItems} />
              )}

              <InfiniteEmbyList 
                 initialItems={initialData.results} 
                 type={currentType as 'all' | 'movie' | 'tv'} 
                 query={query} 
                 favoritesOnly={isFavoritesOnly} 
                 watchLaterOnly={isWatchLaterOnly}
               />
          </>
      </div>
  )
}
