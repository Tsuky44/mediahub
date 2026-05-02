'use client'

import { useEffect, useState, useTransition, useCallback, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchMedia } from '../../actions'
import type { MediaFiltersValue } from '@/components/global/media-filters/_types/media-filters'
import { mapGenres } from '@/components/global/media-filters/_utils/genre-mapping'

// Parse filters from URL search params
function parseFiltersFromURL(params: URLSearchParams): Partial<MediaFiltersValue> {
  const filters: Partial<MediaFiltersValue> = {}
  
  if (params.has('sort_by')) filters.sort_by = params.get('sort_by')!
  if (params.has('start_date')) filters.start_date = params.get('start_date')!
  if (params.has('end_date')) filters.end_date = params.get('end_date')!
  if (params.has('genres')) filters.genres = params.get('genres')!.split(',').map(Number).filter(Boolean)
  if (params.has('language')) filters.language = params.get('language')!
  if (params.has('watch_region')) filters.watch_region = params.get('watch_region')!
  if (params.has('watch_providers')) filters.watch_providers = params.get('watch_providers')!.split(',').map(Number).filter(Boolean)
  
  return filters
}

// Build URL search params from filters
function buildURLParams(filters: Partial<MediaFiltersValue>): URLSearchParams {
  const params = new URLSearchParams(window.location.search)
  
  if (filters.sort_by) params.set('sort_by', filters.sort_by)
  else params.delete('sort_by')
  
  if (filters.start_date) params.set('start_date', filters.start_date)
  else params.delete('start_date')
  
  if (filters.end_date) params.set('end_date', filters.end_date)
  else params.delete('end_date')
  
  if (filters.genres?.length) params.set('genres', filters.genres.join(','))
  else params.delete('genres')
  
  if (filters.language) params.set('language', filters.language)
  else params.delete('language')
  
  if (filters.watch_region) params.set('watch_region', filters.watch_region)
  else params.delete('watch_region')
  
  if (filters.watch_providers?.length) params.set('watch_providers', filters.watch_providers.join(','))
  else params.delete('watch_providers')
  
  return params
}

export function useInfiniteMedia(
  initialItems: any[],
  initialType: 'all' | 'movie' | 'tv' | 'watch-later' | 'recommendations' | 'trends',
  initialSearch?: string,
  initialFilters?: Partial<MediaFiltersValue>
) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const [activeFilters, setActiveFilters] = useState<Partial<MediaFiltersValue>>(() => {
    // Prioritize URL params over initialFilters
    const urlFilters = parseFiltersFromURL(searchParams)
    return Object.keys(urlFilters).length > 0 ? urlFilters : (initialFilters || {})
  })
  const [showFilters, setShowFilters] = useState(false)

  const { ref, inView } = useInView({ rootMargin: '1000px' })
  const router = useRouter()
  
  // Track previous type for genre mapping
  const prevTypeRef = useRef(initialType)

  useEffect(() => {
    setItems(initialItems)
    setPage(1)
    setHasMore(true)
  }, [initialItems])

  // Re-apply active filters when search query changes
  useEffect(() => {
    if (activeFilters && Object.keys(activeFilters).length > 0) {
      setLoading(true)
      fetchMedia(1, initialType, initialSearch, activeFilters).then((data) => {
        setItems(data.results || [])
        setPage(1)
        setHasMore(data.results?.length > 0)
        setLoading(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch])

  // Re-apply and map genres when type changes (movie/tv)
  useEffect(() => {
    // Only map if type actually changed between movie/tv
    if ((prevTypeRef.current === 'movie' || prevTypeRef.current === 'tv') && 
        (initialType === 'movie' || initialType === 'tv') &&
        prevTypeRef.current !== initialType) {
      
      // Map genres to equivalent ones for the new type
      const mappedFilters = { ...activeFilters }
      if (activeFilters.genres?.length) {
        mappedFilters.genres = mapGenres(activeFilters.genres, prevTypeRef.current, initialType)
        // Update active filters with mapped genres
        setActiveFilters(mappedFilters)
        
        // Update URL with mapped genres
        const params = buildURLParams(mappedFilters)
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
      }
      
      if (Object.keys(mappedFilters).length > 0) {
        setLoading(true)
        fetchMedia(1, initialType, initialSearch, mappedFilters).then((data) => {
          setItems(data.results || [])
          setPage(1)
          setHasMore(data.results?.length > 0)
          setLoading(false)
        })
      }
    }
    
    // Update ref for next change
    prevTypeRef.current = initialType
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialType])

  const loadMore = async () => {
    if (loading || !hasMore || isPending) return

    setLoading(true)
    const nextPage = page + 1
    const data = await fetchMedia(nextPage, initialType, initialSearch, activeFilters)

    if (data.results.length > 0) {
      setItems(prev => {
        const newItems = data.results.filter(
          (newItem: any) => !prev.some((existingItem: any) => existingItem.id === newItem.id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  const handleFilterChange = (type: 'all' | 'movie' | 'tv' | 'watch-later' | 'recommendations') => {
    if (type === initialType) return

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

  const onSideFilterChange = async (filters: Partial<MediaFiltersValue>) => {
    setActiveFilters(filters)
    setPage(1)
    setHasMore(initialType !== 'watch-later')
    setLoading(true)
    
    // Update URL with filters (without navigation)
    const params = buildURLParams(filters)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    
    const data = await fetchMedia(1, initialType, initialSearch, filters)
    setItems(data.results || [])
    setLoading(false)
  }

  // Listen for back/forward navigation to restore filters from URL
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const filters = parseFiltersFromURL(params)
      setActiveFilters(filters)
      
      // Re-apply filters
      if (Object.keys(filters).length > 0) {
        setLoading(true)
        fetchMedia(1, initialType, initialSearch, filters).then((data) => {
          setItems(data.results || [])
          setPage(1)
          setHasMore(data.results?.length > 0)
          setLoading(false)
        })
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialType, initialSearch])

  return {
    items,
    loading,
    isPending,
    hasMore,
    showFilters,
    setShowFilters,
    handleFilterChange,
    onSideFilterChange,
    activeFilters,
    ref,
  }
}
