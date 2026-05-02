import { fetchMedia } from './actions'
import { InfiniteMediaList } from './InfiniteMediaList'
import { SearchInput } from '@/components/global/SearchInput'
import { Suspense } from 'react'
import { fetchUserRecommendations } from '../media/actions'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { defineAbilityFor } from '@/lib/ability'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; sort_by?: string; start_date?: string; end_date?: string; genres?: string; language?: string; watch_region?: string; watch_providers?: string }> }) {
  const session = await getServerSession(authOptions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  const ability = defineAbilityFor(user)

  const canView = ability.can('read', 'Media')
  const canInteractive = ability.can('create', 'MediaRequest')
  
  if (!canView) {
      redirect('/dashboard')
  }

  const { 
    q: rawQuery, 
    filter,
    sort_by,
    start_date,
    end_date,
    genres,
    language,
    watch_region,
    watch_providers,
  } = await searchParams
  // Only allow query if view permission is present
  const query = canView ? rawQuery : undefined

  // Build filters from URL params
  const initialFilters = {
    ...(sort_by && { sort_by }),
    ...(start_date && { start_date }),
    ...(end_date && { end_date }),
    ...(genres && { genres: genres.split(',').map(Number).filter(Boolean) }),
    ...(language && { language }),
    ...(watch_region && { watch_region }),
    ...(watch_providers && { watch_providers: watch_providers.split(',').map(Number).filter(Boolean) }),
  }

  let recommendationData: { results: any[]; total_pages: number } = { results: [], total_pages: 0 }
  let results: any[] = []
  let title = 'Demander'
  let currentType: 'all' | 'movie' | 'tv' | 'watch-later' | 'recommendations' = 'all'
  
  // Determine type based on filter
  if (filter === 'movie') currentType = 'movie'
  else if (filter === 'tv') currentType = 'tv'
  else if (filter === 'watch-later') currentType = 'watch-later'
  else if (filter === 'recommendations') currentType = 'recommendations'
  else currentType = 'all'

  try {
      if (currentType === 'recommendations') {
          recommendationData = await fetchUserRecommendations()
          title = 'Recommandés pour vous'
      } else {
          // Use fetchMedia to get enriched data (with status)
          const data = await fetchMedia(1, currentType as any, query, initialFilters)
          results = data.results || []

          if (query) {
              title = `Résultats pour "${query}"`
          } else if (currentType === 'movie') {
              title = 'Films populaires'
          } else if (currentType === 'tv') {
              title = 'Séries populaires'
          } else if (currentType === 'watch-later') {
              title = 'À regarder plus tard'
          }
      }
  } catch (error) {
      console.error('Error fetching media:', error)
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">{title}</h2>
            <p className="text-gray-400 mt-1">
                {currentType === 'recommendations' 
                    ? 'Basé sur vos lectures récentes et vos demandes'
                    : 'Recherchez et demandez de nouveaux films et séries'
                }
            </p>
        </div>
        
        {canView && (
            <Suspense fallback={<div className="h-10 w-full max-w-md bg-gray-800 rounded-full animate-pulse" />}>
                <SearchInput />
            </Suspense>
        )}
      </div>

        {currentType === 'recommendations' ? (
            <InfiniteMediaList 
                initialItems={recommendationData.results} 
                initialType="recommendations" 
            />
        ) : (
            <Suspense fallback={
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            }>
              <InfiniteMediaList 
                  initialItems={results} 
                  initialType={currentType as any} 
                  initialSearch={query}
                  initialFilters={initialFilters}
              />
            </Suspense>
        )}
    </div>
  )
}
