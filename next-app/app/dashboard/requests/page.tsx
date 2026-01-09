import { fetchMedia } from './actions'
import { InfiniteMediaList } from './InfiniteMediaList'
import { SearchInput } from '@/components/SearchInput'
import { Suspense } from 'react'
import { fetchUserRecommendations } from '../media/actions'
import { getJellyseerrServiceForUser } from '@/lib/auth'
import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const { q: query, filter } = await searchParams
  let recommendationData: { results: any[]; total_pages: number } = { results: [], total_pages: 0 }
  let results: any[] = []
  let title = 'Demander'
  let currentType: 'all' | 'movie' | 'tv' | 'watch-later' | 'recommendations' = 'all'
  
  // Check if Jellyseerr is configured
  const jellyseerrService = await getJellyseerrServiceForUser()
  const isJellyseerrConfigured = !!jellyseerrService

  // Determine type based on filter
  if (filter === 'movie') currentType = 'movie'
  else if (filter === 'tv') currentType = 'tv'
  else if (filter === 'watch-later') currentType = 'watch-later'
  else if (filter === 'recommendations') currentType = 'recommendations'
  else currentType = 'all'

  if (!isJellyseerrConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Jellyseerr non configuré</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Cette fonctionnalité nécessite une connexion à Jellyseerr pour fonctionner. 
            Veuillez configurer l'URL et la clé API dans les paramètres.
          </p>
        </div>
        <Link 
          href="/dashboard/settings" 
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-xl shadow-indigo-500/20"
        >
          <Settings className="w-5 h-5" />
          Aller aux paramètres
        </Link>
      </div>
    )
  }

  try {
      if (currentType === 'recommendations') {
          recommendationData = await fetchUserRecommendations()
          title = 'Recommandés pour vous'
      } else {
          // Use fetchMedia to get enriched data (with Jellyseerr status)
          const data = await fetchMedia(1, currentType as any, query)
          results = data.results || []

          if (query) {
              title = `Résultats pour "${query}"`
          } else if (currentType === 'movie') {
              title = 'Films Populaires'
          } else if (currentType === 'tv') {
              title = 'Séries Populaires'
          } else if (currentType === 'watch-later') {
              title = 'À regarder plus tard'
          } else {
              title = 'Tendances'
          }
      }
  } catch (e) {
      console.error('Failed to fetch discovery data', e)
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <Suspense fallback={<div className="h-10 w-full max-w-md bg-gray-800 rounded-full animate-pulse" />}>
                  <SearchInput />
                </Suspense>
            </div>
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
