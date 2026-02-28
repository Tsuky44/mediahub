'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { MediaCard } from '@/components/MediaCard'
import { fetchEmbyMedia } from './actions'
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
  
  const { ref, inView } = useInView({
    rootMargin: '1000px',
  })

  useEffect(() => {
    setItems(initialItems)
    setPage(1)
    setHasMore(true)
  }, [initialItems, type, query, favoritesOnly, watchLaterOnly])

  const loadMore = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const nextPage = page + 1
    const data = await fetchEmbyMedia(nextPage, type, query, favoritesOnly, watchLaterOnly)
    
    if (data.results.length > 0) {
        setItems(prev => {
            const newItems = data.results.filter((newItem: any) => 
                !prev.some((existingItem: any) => existingItem.id === newItem.id)
            )
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
    if (inView) {
      loadMore()
    }
  }, [inView])

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
