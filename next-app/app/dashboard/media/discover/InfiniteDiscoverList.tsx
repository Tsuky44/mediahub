'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { MediaCard } from '@/components/global/MediaCard'
import { Loader2 } from 'lucide-react'

interface InfiniteDiscoverListProps {
  initialItems: any[]
  keywordId: number
  initialPage?: number
  totalPages?: number
}

export function InfiniteDiscoverList({ 
  initialItems, 
  keywordId, 
  initialPage = 1,
  totalPages = 1
}: InfiniteDiscoverListProps) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(initialPage)
  const [hasMore, setHasMore] = useState(initialPage < totalPages)
  const [loading, setLoading] = useState(false)
  
  const { ref, inView } = useInView({
    rootMargin: '800px', // Trigger load 800px before reaching bottom
  })

  const loadMore = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const nextPage = page + 1
    
    try {
      const response = await fetch(`/api/media/discover?keyword=${keywordId}&page=${nextPage}`)
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        setItems(prev => {
          // Filter out duplicates just in case
          const newItems = data.results.filter((newItem: any) => 
            !prev.some((existingItem: any) => 
              (existingItem.id === newItem.id && existingItem.media_type === newItem.media_type)
            )
          )
          return [...prev, ...newItems]
        })
        setPage(nextPage)
        setHasMore(nextPage < (data.total_pages || 1))
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load more media:', error)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (inView && !loading && hasMore) {
      loadMore()
    }
  }, [inView, loading, hasMore])

  return (
    <div className="space-y-8">
      <div className="onyx-stagger grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {items.map((item) => (
          <MediaCard 
            key={`${item.media_type}-${item.id}`} 
            item={item} 
          />
        ))}
        
        {items.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center text-gray-500">
            Aucun contenu trouvé pour ce mot-clé.
          </div>
        )}
      </div>

      {/* Loading States & Infinite Scroll Trigger */}
      <div className="flex flex-col items-center justify-center py-8">
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}
        
        {hasMore && !loading && (
          <div ref={ref} className="h-10 w-full opacity-0 pointer-events-none" />
        )}

        {!hasMore && items.length > 0 && (
          <p className="text-gray-500 text-sm mt-4">Vous avez atteint la fin de la liste.</p>
        )}
      </div>
    </div>
  )
}
