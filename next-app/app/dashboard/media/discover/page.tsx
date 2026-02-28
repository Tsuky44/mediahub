import { getTmdbServiceForUser, getCurrentUser } from '@/lib/auth'
import { InfiniteDiscoverList } from './InfiniteDiscoverList'
import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { defineAbilityFor } from '@/lib/ability'
import { redirect } from 'next/navigation'

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ keyword?: string, name?: string }> }) {
  const user = await getCurrentUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ability = defineAbilityFor(user as any)

  if (ability.cannot('read', 'Media')) {
    redirect('/dashboard')
  }

  const { keyword, name } = await searchParams
  
  const tmdbService = await getTmdbServiceForUser()
  
  if (!tmdbService) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">TMDB non configuré</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            La découverte par mot-clé nécessite une clé API TMDB valide. 
            Veuillez configurer votre clé API dans les paramètres.
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
