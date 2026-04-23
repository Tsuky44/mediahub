import { fetchEmbyMedia, fetchRecentlyWatchedItems } from './actions'
import { InfiniteEmbyList } from './InfiniteEmbyList'
import { SearchInput } from '@/components/global/SearchInput'
import { Suspense } from 'react'
import { RecentlyWatched } from './RecentlyWatched'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { redirect } from 'next/navigation'

import { Heart, Clock, Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MediaPage({ searchParams }: { searchParams: Promise<any> }) {
  const session = await getServerSession(authOptions)
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
              {/* Filtres rapides */}
              <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                <a
                  href={`?type=${currentType}${query ? `&q=${query}` : ''}&favorites=${!isFavoritesOnly}${isWatchLaterOnly ? '&watchLater=true' : ''}`}
                  className={`group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border backdrop-blur-md whitespace-nowrap ${
                    isFavoritesOnly 
                      ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/30' 
                      : 'bg-gray-900/40 border-white/10 text-gray-400 hover:bg-gray-800/60 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Heart className={`w-4 h-4 transition-transform duration-300 ${isFavoritesOnly ? 'fill-current scale-110' : 'group-hover:scale-110'}`} />
                  <span>Favoris</span>
                </a>

                <a
                  href={`?type=${currentType}${query ? `&q=${query}` : ''}&watchLater=${!isWatchLaterOnly}${isFavoritesOnly ? '&favorites=true' : ''}`}
                  className={`group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border backdrop-blur-md whitespace-nowrap ${
                    isWatchLaterOnly 
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:bg-blue-500/30' 
                      : 'bg-gray-900/40 border-white/10 text-gray-400 hover:bg-gray-800/60 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Clock className={`w-4 h-4 transition-transform duration-300 ${isWatchLaterOnly ? 'fill-current scale-110' : 'group-hover:scale-110'}`} />
                  <span>À regarder</span>
                </a>
              </div>

              {/* Barre de recherche */}
              <div className="w-full sm:w-72 lg:w-96">
                <Suspense fallback={<div className="h-11 w-full bg-gray-800/50 rounded-full animate-pulse" />}>
                  <SearchInput />
                </Suspense>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-gray-900/50 p-1.5 rounded-full border border-gray-800/50 backdrop-blur-md shadow-inner">
              <a 
                href={`?type=all${query ? `&q=${query}` : ''}${isFavoritesOnly ? '&favorites=true' : ''}${isWatchLaterOnly ? '&watchLater=true' : ''}`}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  currentType === 'all' 
                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-105' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                Tout
              </a>
              <a 
                href={`?type=movie${query ? `&q=${query}` : ''}${isFavoritesOnly ? '&favorites=true' : ''}${isWatchLaterOnly ? '&watchLater=true' : ''}`}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  currentType === 'movie' 
                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-105' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                Films
              </a>
              <a 
                href={`?type=tv${query ? `&q=${query}` : ''}${isFavoritesOnly ? '&favorites=true' : ''}${isWatchLaterOnly ? '&watchLater=true' : ''}`}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  currentType === 'tv' 
                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-105' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
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
