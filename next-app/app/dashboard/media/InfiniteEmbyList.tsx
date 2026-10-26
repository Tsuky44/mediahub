'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { MediaCard } from '@/components/global/MediaCard'
import { fetchEmbyMedia } from './actions'
import { preloadPosters } from '@/components/global/media-card/preloadPosters'
import { Loader2 } from 'lucide-react'

interface InfiniteEmbyListProps {
  initialItems: any[]
  type: 'movie' | 'tv' | 'all'
  query?: string
  favoritesOnly?: boolean
  watchLaterOnly?: boolean
}

export function InfiniteEmbyList({ initialItems, type, query, favoritesOnly, watchLaterOnly }: InfiniteEmbyListProps) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
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
    setHasMore(true)
  }, [initialItems, type, query, favoritesOnly, watchLaterOnly])

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

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
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
