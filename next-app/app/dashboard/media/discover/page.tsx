import { tmdbService } from '@/lib/services/tmdb'
import { InfiniteDiscoverList } from './InfiniteDiscoverList'

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ keyword?: string, name?: string }> }) {
  const { keyword, name } = await searchParams
  
  if (!keyword) {
    return (
      <div className="p-8 text-center text-gray-400">
        Aucun mot-clé spécifié.
      </div>
    )
  }

  const keywordId = parseInt(keyword)
  const results = await tmdbService.discoverMixed({ keywords: keywordId, page: 1 })

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          Contenu avec le tag : <span className="text-indigo-400">"{name || keyword}"</span>
        </h1>
        <p className="text-gray-400">Découvrez des films et séries basés sur ce mot-clé.</p>
      </div>

      <InfiniteDiscoverList 
        initialItems={results.results || []} 
        keywordId={keywordId}
        totalPages={results.total_pages}
      />
    </div>
  )
}
