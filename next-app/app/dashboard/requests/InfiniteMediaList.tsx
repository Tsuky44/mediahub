'use client'

import { useEffect, useState, useTransition } from 'react'
import { useInView } from 'react-intersection-observer'
import { MediaCard } from '@/components/global/MediaCard'
import { MediaFilters } from '@/components/global/MediaFilters'
import { fetchMedia } from './actions'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import { Loader2, SlidersHorizontal, X } from 'lucide-react'

interface InfiniteMediaListProps {
  initialItems: any[]
  initialType: 'all' | 'movie' | 'tv' | 'watch-later' | 'recommendations' | 'trends'
  initialSearch?: string
  showTabs?: boolean
}

export function InfiniteMediaList({ initialItems, initialType, initialSearch, showTabs = true }: InfiniteMediaListProps) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [activeFilters, setActiveFilters] = useState<any>({})
  const [showFilters, setShowFilters] = useState(false)
  
  const { ref, inView } = useInView({
    rootMargin: '1000px', // Trigger load 1000px before reaching bottom
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  // Update items when initialItems changes (from server)
  useEffect(() => {
    setItems(initialItems)
    setPage(1)
    setHasMore(true)
  }, [initialItems])

  const loadMore = async () => {
    if (loading || !hasMore || isPending) return
    
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

  const handleFilterChange = (type: 'all' | 'movie' | 'tv' | 'watch-later' | 'recommendations') => {
      if (type === initialType) return;
      
      const params = new URLSearchParams(searchParams)
      if (type === 'all') {
          params.delete('filter')
      } else {
          params.set('filter', type)
      }
      
      startTransition(() => {
          router.push(`/dashboard/requests?${params.toString()}`)
      })
  }

  const onSideFilterChange = async (filters: any) => {
      setActiveFilters(filters)
      setPage(1)
      setHasMore(initialType !== 'watch-later')
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
               
               <div className="relative w-full max-w-5xl bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
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
                        <MediaFilters 
                            type={initialType === 'watch-later' || initialType === 'recommendations' || initialType === 'trends' ? 'all' : initialType} 
                            onFilterChange={onSideFilterChange} 
                        />
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

       <div className={clsx("flex-1 space-y-6 w-full transition-opacity duration-300", isPending && "opacity-50 pointer-events-none")}>
            {/* Type Filters */}
            {showTabs && (
                <div className="w-full border-b border-gray-800/50 pb-4">
                    <div className="flex items-center justify-start sm:justify-center overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                        <div className="flex p-1 gap-1.5 bg-gray-900/40 backdrop-blur-md rounded-2xl border border-gray-800/50 relative whitespace-nowrap">
                            {isPending && (
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                </div>
                            )}
                            {[
                                { id: 'all', label: 'Tout' },
                                { id: 'movie', label: 'Films' },
                                { id: 'tv', label: 'Séries' },
                                { id: 'recommendations', label: 'Recommandés' },
                                { id: 'watch-later', label: 'À regarder plus tard' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleFilterChange(tab.id as any)}
                                    disabled={isPending}
                                    className={clsx(
                                        'px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative',
                                        initialType === tab.id 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40',
                                        isPending && initialType === tab.id && 'animate-pulse'
                                    )}
                                >
                                    {tab.label}
                                    {initialType === tab.id && (
                                        <div className="absolute inset-0 bg-white/10 rounded-xl animate-pulse" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
