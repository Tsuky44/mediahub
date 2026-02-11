import { fetchMedia } from './actions'
import { InfiniteMediaList } from './InfiniteMediaList'
import { SearchInput } from '@/components/SearchInput'
import { Suspense } from 'react'
import { fetchUserRecommendations } from '../media/actions'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const session = await getServerSession(authOptions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  const canView = user?.role === 'admin' || user?.permissions?.includes('requests.search.view')
  const canInteractive = user?.role === 'admin' || user?.permissions?.includes('requests.interactive')
  
  if (!canView) {
      redirect('/dashboard')
  }

  const { q: rawQuery, filter } = await searchParams
  // Only allow query if interactive permission is present
  const query = canInteractive ? rawQuery : undefined

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
          const data = await fetchMedia(1, currentType as any, query)
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
        
        {canInteractive && (
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
              />
            </Suspense>
        )}
    </div>
  )
}
