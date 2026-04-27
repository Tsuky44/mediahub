'use client'

import { useEffect, useRef, useState } from 'react'
import { liveSearch } from '../dashboard-actions'
import type { LiveSearchResult } from '../_types/dashboard'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

export interface UseDashboardLiveSearchResult {
  searchQuery: string
  setSearchQuery: (value: string) => void
  searchResults: LiveSearchResult[]
  isSearching: boolean
  showResults: boolean
  setShowResults: (value: boolean) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useDashboardLiveSearch(): UseDashboardLiveSearchResult {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LiveSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length >= MIN_QUERY_LENGTH) {
        setIsSearching(true)
        const results = (await liveSearch(searchQuery)) as LiveSearchResult[]
        setSearchResults(results)
        setIsSearching(false)
        setShowResults(true)
      } else {
        setSearchResults([])
        setShowResults(false)
      }
    }

    const timer = setTimeout(performSearch, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showResults,
    setShowResults,
    containerRef,
  }
}
