'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { fetchMedia } from '../../actions'
import type { MediaFiltersValue } from '@/components/global/media-filters/_types/media-filters'
import { mapGenres } from '@/components/global/media-filters/_utils/genre-mapping'

const CACHE_KEY = 'infinite-media-cache'

interface ScrollCache {
  items: any[]
  page: number
  hasMore: boolean
  scrollY: number
  timestamp: number
}

function getCacheKey(pathname: string, search: string): string {
  return `${CACHE_KEY}:${pathname}?${search}`
}

function saveScrollCache(key: string, data: ScrollCache) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

function loadScrollCache(key: string): ScrollCache | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as ScrollCache
    // Expire cache after 5 minutes
    if (Date.now() - data.timestamp > 5 * 60 * 1000) {
      sessionStorage.removeItem(key)
      return null
    }
    return data
  } catch {
    return null
  }
}

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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const cacheKey = getCacheKey(pathname, searchParams.toString())
  const restoredRef = useRef(false)

  const [items, setItems] = useState(() => {
    if (typeof window === 'undefined') return initialItems
    const cached = loadScrollCache(cacheKey)
    if (cached && cached.items.length > 0) {
      restoredRef.current = true
      return cached.items
    }
    return initialItems
  })
  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 1
    const cached = loadScrollCache(cacheKey)
    return cached ? cached.page : 1
  })
  const [hasMore, setHasMore] = useState(() => {
    if (typeof window === 'undefined') return true
    const cached = loadScrollCache(cacheKey)
    return cached ? cached.hasMore : true
  })
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [activeFilters, setActiveFilters] = useState<Partial<MediaFiltersValue>>(() => {
    // Prioritize URL params over initialFilters
    const urlFilters = parseFiltersFromURL(searchParams)
    return Object.keys(urlFilters).length > 0 ? urlFilters : (initialFilters || {})
  })
  const [showFilters, setShowFilters] = useState(false)

  const { ref, inView } = useInView({ rootMargin: '1000px' })
  const router = useRouter()

  // Préchargement de la page suivante : quand le bas de la liste est atteint,
  // ses éléments sont déjà chargés et s'affichent sans attendre le serveur.
  const prefetchRef = useRef<{ key: string; promise: ReturnType<typeof fetchMedia> } | null>(null)
  const pageKey = (p: number) => JSON.stringify([p, initialType, initialSearch ?? null, activeFilters])
  const getPage = (p: number) => {
    const prefetched = prefetchRef.current
    if (prefetched?.key === pageKey(p)) {
      prefetchRef.current = null
      return prefetched.promise
    }
    return fetchMedia(p, initialType, initialSearch, activeFilters)
  }
  
  // Track previous type for genre mapping
  const prevTypeRef = useRef(initialType)

  // Restore scroll position after items are rendered
  useEffect(() => {
    if (restoredRef.current) {
      const cached = loadScrollCache(cacheKey)
      if (cached && cached.scrollY > 0) {
        // Wait for DOM to paint before scrolling
        requestAnimationFrame(() => {
          window.scrollTo(0, cached.scrollY)
        })
      }
      restoredRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save scroll cache on beforeunload and when items/page change
  useEffect(() => {
    const save = () => {
      saveScrollCache(cacheKey, {
        items,
        page,
        hasMore,
        scrollY: window.scrollY,
        timestamp: Date.now(),
      })
    }

    window.addEventListener('beforeunload', save)
    return () => window.removeEventListener('beforeunload', save)
  }, [items, page, hasMore, cacheKey])

  // Also save on visibility change (covers navigation to detail page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScrollCache(cacheKey, {
          items,
          page,
          hasMore,
          scrollY: window.scrollY,
          timestamp: Date.now(),
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [items, page, hasMore, cacheKey])

  // Save scroll position on scroll (debounced) to handle SPA navigation via Link
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        saveScrollCache(cacheKey, {
          items,
          page,
          hasMore,
          scrollY: window.scrollY,
          timestamp: Date.now(),
        })
      }, 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [items, page, hasMore, cacheKey])

  useEffect(() => {
    // Skip reset if we just restored from cache
    if (loadScrollCache(cacheKey)?.items.length && items.length > initialItems.length) return
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
    const data = await getPage(nextPage)

    if (data.results.length > 0) {
      setItems(prev => {
        const existingIds = new Set(prev.map((existingItem: any) => existingItem.id))
        const newItems = data.results.filter((newItem: any) => !existingIds.has(newItem.id))
        return [...prev, ...newItems]
      })
      setPage(nextPage)
      if (nextPage >= (data.total_pages || 1000)) {
        setHasMore(false)
      }
    } else {
      setHasMore(false)
    }
    setLoading(false)
  }

  // Lance le chargement de la page suivante en arrière-plan dès que la page courante est affichée
  useEffect(() => {
    if (!hasMore || loading) return
    const key = pageKey(page + 1)
    if (prefetchRef.current?.key === key) return
    const promise = fetchMedia(page + 1, initialType, initialSearch, activeFilters)
    promise.catch(() => {}) // l'erreur éventuelle remontera au moment de l'utilisation
    prefetchRef.current = { key, promise }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, loading, initialType, initialSearch, activeFilters])

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
