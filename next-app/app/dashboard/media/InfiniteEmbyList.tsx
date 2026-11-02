'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInView } from 'react-intersection-observer'
import { MediaCard } from '@/components/global/MediaCard'
import { fetchEmbyMedia, type LibraryProblem } from './actions'
import { preloadPosters } from '@/components/global/media-card/preloadPosters'
import { Loader2, Library, RotateCw } from 'lucide-react'

interface InfiniteEmbyListProps {
  initialItems: any[]
  /** Raison d'une liste vide (plateforme absente, compte non lié, serveur injoignable) */
  problem?: LibraryProblem
  source?: 'emby' | 'jellyfin'
  type: 'movie' | 'tv' | 'all'
  query?: string
  favoritesOnly?: boolean
  watchLaterOnly?: boolean
}

const SOURCE_NAME = { emby: 'Emby', jellyfin: 'Jellyfin' } as const

/** Médiathèque vide : dit pourquoi, au lieu d'une page blanche */
function EmptyLibrary({ problem, source, filtered }: { problem?: LibraryProblem; source?: 'emby' | 'jellyfin'; filtered: boolean }) {
  const router = useRouter()
  const name = source ? SOURCE_NAME[source] : 'Le serveur média'
  const text =
    problem === 'no-server'
      ? "Aucune plateforme de bibliothèque n'est configurée (Emby ou Jellyfin). Un administrateur peut l'ajouter dans les réglages."
      : problem === 'not-linked'
        ? `Votre compte n'est pas lié à ${name} : connectez-vous avec votre compte ${name} pour voir votre bibliothèque.`
        : problem === 'unreachable'
          ? `${name} ne répond pas pour le moment.`
          : filtered
            ? 'Aucun média ne correspond.'
            : 'Votre bibliothèque est vide.'
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/5 bg-white/[0.02] px-6 py-16 text-center">
      <Library className="h-10 w-10 text-gray-500" />
      <p className="max-w-md text-sm text-gray-300">{text}</p>
      {problem === 'unreachable' && (
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          <RotateCw className="h-4 w-4" />
          Réessayer
        </button>
      )}
    </div>
  )
}

export function InfiniteEmbyList({ initialItems, problem, source, type, query, favoritesOnly, watchLaterOnly }: InfiniteEmbyListProps) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  // Liste vide pour une raison connue : rien à charger de plus
  const [hasMore, setHasMore] = useState(!problem)
  const [loading, setLoading] = useState(false)
  
  // Déclenché bien avant le bas de la liste : les éléments (déjà préchargés) sont ajoutés hors écran
  const { ref, inView } = useInView({
    rootMargin: '2500px',
  })

  // Préchargement de la page suivante (même principe que la page Demandes)
  const prefetchRef = useRef<{ key: string; promise: ReturnType<typeof fetchEmbyMedia> } | null>(null)
  const pageKey = (p: number) => JSON.stringify([p, type, query ?? null, !!favoritesOnly, !!watchLaterOnly])
  const getPage = (p: number) => {
    const prefetched = prefetchRef.current
    if (prefetched?.key === pageKey(p)) {
      prefetchRef.current = null
      return prefetched.promise
    }
    return fetchEmbyMedia(p, type, query, favoritesOnly, watchLaterOnly)
  }

  useEffect(() => {
    setItems(initialItems)
    setPage(1)
    setHasMore(!problem)
  }, [initialItems, problem, type, query, favoritesOnly, watchLaterOnly])

  const loadMore = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const nextPage = page + 1
    const data = await getPage(nextPage)
    
    if (data.results.length > 0) {
        setItems(prev => {
            const existingIds = new Set(prev.map((existingItem: any) => existingItem.id))
            const newItems = data.results.filter((newItem: any) => !existingIds.has(newItem.id))
            return [...prev, ...newItems]
        })
        setPage(nextPage)
        if (nextPage >= (data.total_pages || 1)) {
            setHasMore(false)
        }
    } else {
        setHasMore(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Rejoué après chaque page : tant que le bas de liste reste proche, on enchaîne
    // (une page préchargée arrive instantanément, le déclencheur ne sort jamais de l'écran)
    if (inView && !loading && hasMore) {
      loadMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, loading, hasMore, page])

  // Lance le chargement de la page suivante en arrière-plan dès que la page courante est affichée
  useEffect(() => {
    if (!hasMore || loading) return
    const key = pageKey(page + 1)
    if (prefetchRef.current?.key === key) return
    const promise = fetchEmbyMedia(page + 1, type, query, favoritesOnly, watchLaterOnly)
    // Affiches téléchargées en même temps que les données ; l'erreur éventuelle remontera à l'utilisation
    promise.then((data) => preloadPosters(data.results ?? [])).catch(() => {})
    prefetchRef.current = { key, promise }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, loading, type, query, favoritesOnly, watchLaterOnly])

  if (items.length === 0 && !hasMore) {
    return <EmptyLibrary problem={problem} source={source} filtered={!!query || !!favoritesOnly || !!watchLaterOnly} />
  }

  return (
    <div className="space-y-6">
        <div className="onyx-stagger grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} showFavoriteButton={true} />
        ))}
      </div>
        
        {hasMore && (
            <div ref={ref} className="flex justify-center p-8">
                {loading && <Loader2 className="h-8 w-8 animate-spin text-blue-500" />}
            </div>
        )}
    </div>
  )
}
