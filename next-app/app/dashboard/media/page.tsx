import { fetchEmbyMedia, fetchRecentlyWatchedItems } from './actions'
import { InfiniteEmbyList } from './InfiniteEmbyList'
import { SearchInput } from '@/components/global/SearchInput'
import { Suspense } from 'react'
import { RecentlyWatched } from './RecentlyWatched'
import { getSession } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { redirect } from 'next/navigation'

import { MediaFilterPills } from './_components/MediaFilterPills'
import { MediaTypeTabs } from './_components/MediaTypeTabs'

export const dynamic = 'force-dynamic'

export default async function MediaPage({ searchParams }: { searchParams: Promise<any> }) {
  const session = await getSession()
  const ability = defineAbilityFor(session?.user)

  if (!ability.can('read', 'Library')) {
    redirect('/dashboard')
  }

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
      <div className="space-y-8">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-sm">Ma médiathèque</h2>
              <p className="text-gray-400 text-sm mt-1">Explorez votre collection de films et séries</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
              <MediaFilterPills
                currentType={currentType}
                query={query}
                isFavoritesOnly={isFavoritesOnly}
                isWatchLaterOnly={isWatchLaterOnly}
              />

              <div className="w-full sm:w-72 lg:w-96">
                <Suspense fallback={<div className="h-11 w-full bg-gray-800/50 rounded-full animate-pulse" />}>
                  <SearchInput />
                </Suspense>
              </div>
            </div>
          </div>

          <MediaTypeTabs
            currentType={currentType as 'all' | 'movie' | 'tv'}
            query={query}
            isFavoritesOnly={isFavoritesOnly}
            isWatchLaterOnly={isWatchLaterOnly}
          />

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
