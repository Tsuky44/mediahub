'use client'

import { useEffect, useState } from 'react'
import {
  getFilterOptions,
  getWatchProviders,
} from '@/app/dashboard/requests/actions'
import { DEFAULT_MEDIA_FILTERS } from '../_constants/media-filters-options'
import type {
  Genre,
  MediaFiltersType,
  MediaFiltersValue,
  WatchProvider,
} from '../_types/media-filters'

export interface UseMediaFiltersOptions {
  type: MediaFiltersType
  onFilterChange: (filters: MediaFiltersValue) => void
}

export interface UseMediaFiltersResult {
  filters: MediaFiltersValue
  genres: Genre[]
  providers: WatchProvider[]
  loadingProviders: boolean
  showAllProviders: boolean
  setShowAllProviders: (value: boolean) => void
  handleChange: <K extends keyof MediaFiltersValue>(
    key: K,
    value: MediaFiltersValue[K]
  ) => void
  toggleGenre: (id: number) => void
  toggleProvider: (id: number) => void
  resetFilters: () => void
}

export function useMediaFilters({
  type,
  onFilterChange,
}: UseMediaFiltersOptions): UseMediaFiltersResult {
  const [genres, setGenres] = useState<Genre[]>([])
  const [providers, setProviders] = useState<WatchProvider[]>([])
  const [showAllProviders, setShowAllProviders] = useState(false)
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [filters, setFilters] = useState<MediaFiltersValue>(
    DEFAULT_MEDIA_FILTERS
  )

  // Load genres on `type` change (also seeds providers).
  useEffect(() => {
    let cancelled = false
    getFilterOptions(type).then((data) => {
      if (!cancelled) setGenres(data.genres as Genre[])
    })
    return () => {
      cancelled = true
    }
  }, [type])

  // Reload providers whenever region or type changes.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingProviders(true)
      const data = (await getWatchProviders(
        type,
        filters.watch_region
      )) as WatchProvider[]
      if (!cancelled) {
        setProviders(data)
        setLoadingProviders(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filters.watch_region, type])

  const handleChange = <K extends keyof MediaFiltersValue>(
    key: K,
    value: MediaFiltersValue[K]
  ) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleGenre = (id: number) => {
    const current = filters.genres
    const updated = current.includes(id)
      ? current.filter((g) => g !== id)
      : [...current, id]
    handleChange('genres', updated)
  }

  const toggleProvider = (id: number) => {
    const current = filters.watch_providers
    const updated = current.includes(id)
      ? current.filter((p) => p !== id)
      : [...current, id]
    handleChange('watch_providers', updated)
  }

  const resetFilters = () => {
    setFilters(DEFAULT_MEDIA_FILTERS)
    onFilterChange(DEFAULT_MEDIA_FILTERS)
  }

  return {
    filters,
    genres,
    providers,
    loadingProviders,
    showAllProviders,
    setShowAllProviders,
    handleChange,
    toggleGenre,
    toggleProvider,
    resetFilters,
  }
}
