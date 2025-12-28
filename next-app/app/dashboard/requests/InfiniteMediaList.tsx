'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { MediaCard } from '@/components/MediaCard'
import { MediaFilters } from '@/components/MediaFilters'
import { fetchMedia } from './actions'
import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { Loader2, SlidersHorizontal, X } from 'lucide-react'

interface InfiniteMediaListProps {
  initialItems: any[]
  initialType: 'all' | 'movie' | 'tv'
  initialSearch?: string
}

export function InfiniteMediaList({ initialItems, initialType, initialSearch }: InfiniteMediaListProps) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<any>({})
  const [showFilters, setShowFilters] = useState(false)
  
  const { ref, inView } = useInView({
    rootMargin: '1000px', // Trigger load 1000px before reaching bottom
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  // Reset when filter/search changes from parent (URL)
  useEffect(() => {
    setItems(initialItems)
    setPage(1)
    setHasMore(true)
    setActiveFilters({}) // Reset active filters on type change if needed, but usually we want to keep them if compatible? 
    // Actually, type change might invalidate filters (like studios for TV). 
    // The MediaFilters component handles its own state reset on type change.
  }, [initialItems, initialType, initialSearch])

  const loadMore = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const nextPage = page + 1
    const data = await fetchMedia(nextPage, initialType, initialSearch, activeFilters)
    
    if (data.results.length > 0) {
        setItems(prev => {
            const newItems = data.results.filter((newItem: any) => 
                !prev.some((existingItem: any) => existingItem.id === newItem.id)
            )
            return [...prev, ...newItems]
        })
        setPage(nextPage)
        if (page >= (data.total_pages || 1000)) {
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

  const handleFilterChange = (type: 'all' | 'movie' | 'tv') => {
      const params = new URLSearchParams(searchParams)
      if (type === 'all') {
          params.delete('filter')
      } else {
          params.set('filter', type)
      }
      router.push(`/dashboard/requests?${params.toString()}`)
  }

  const onSideFilterChange = async (filters: any) => {
      setActiveFilters(filters)
      setPage(1)
      setHasMore(true)
      setLoading(true)
      // Fetch page 1 with new filters
      const data = await fetchMedia(1, initialType, initialSearch, filters)
      setItems(data.results || [])
      setLoading(false)
  }

  return (
    <div className="flex flex-col gap-6 items-start relative">
       {/* Filters Modal (Full Screen) */}
       {showFilters && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
               <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
               
               <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                   <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                       <div className="flex items-center gap-3">
                           <SlidersHorizontal className="h-5 w-5 text-indigo-500" />
                           <h2 className="text-xl font-bold text-white">Filtres avancés</h2>
                       </div>
                       <button 
                           onClick={() => setShowFilters(false)}
                           className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
                       >
                           <X className="h-6 w-6" />
                       </button>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-6">
                        <MediaFilters type={initialType} onFilterChange={onSideFilterChange} />
                   </div>
                   
                   <div className="p-6 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl flex justify-end">
                       <button
                           onClick={() => setShowFilters(false)}
                           className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105"
                       >
                           Voir les résultats
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Floating Action Button (FAB) for Filters - Always Visible & Sticky */}
       <button
           onClick={() => setShowFilters(true)}
           className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 hover:scale-110 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/30 group"
           title="Ouvrir les filtres"
       >
           <SlidersHorizontal className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
       </button>

       <div className="flex-1 space-y-6 w-full">
            {/* Type Filters */}
            <div className="flex items-center justify-center border-b border-gray-800 pb-4">
                <div className="flex space-x-2 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                        <button
                            onClick={() => handleFilterChange('all')}
                            className={clsx(
                                'px-6 py-2 text-sm font-medium rounded-lg transition-all',
                                initialType === 'all' 
                                    ? 'bg-gray-800 text-white shadow-sm' 
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            )}
                        >
                            Tout
                        </button>
                        <button
                            onClick={() => handleFilterChange('movie')}
                            className={clsx(
                                'px-6 py-2 text-sm font-medium rounded-lg transition-all',
                                initialType === 'movie' 
                                    ? 'bg-gray-800 text-white shadow-sm' 
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            )}
                        >
                            Films
                        </button>
                        <button
                            onClick={() => handleFilterChange('tv')}
                            className={clsx(
                                'px-6 py-2 text-sm font-medium rounded-lg transition-all',
                                initialType === 'tv' 
                                    ? 'bg-gray-800 text-white shadow-sm' 
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            )}
                        >
                            Séries
                        </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {items.map((item) => (
                    <MediaCard key={item.id} item={{...item, media_type: item.media_type || (initialType === 'movie' ? 'movie' : initialType === 'tv' ? 'tv' : undefined)}} />
                ))}
            </div>
            
            {loading && items.length === 0 && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            )}
            
            {/* Invisible Trigger for Infinite Scroll */}
            {!loading && hasMore && (
                <div ref={ref} className="h-10 opacity-0 pointer-events-none" />
            )}

            {loading && items.length > 0 && (
                <div className="flex justify-center py-4 opacity-50">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
            )}

            {!loading && items.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    Aucun résultat trouvé
                </div>
            )}
       </div>
    </div>
  )
}
