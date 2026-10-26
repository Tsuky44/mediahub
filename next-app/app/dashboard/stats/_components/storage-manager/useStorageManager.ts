'use client'

import { useEffect, useState } from 'react'
import type { DeleteTarget, StorageFilters } from '../../_types/storage'
import { DEFAULT_STORAGE_FILTERS } from '../../_utils/storage-filters'

export function useStorageManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filters, setFilters] = useState<StorageFilters>(DEFAULT_STORAGE_FILTERS)
  const [debouncedFilters, setDebouncedFilters] = useState<StorageFilters>(DEFAULT_STORAGE_FILTERS)

  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null)
  const [deleteFromArr, setDeleteFromArr] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Une seule requête après une série de changements de filtres (saisie du nombre de mois…)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 300)
    return () => clearTimeout(timer)
  }, [filters])

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    filters,
    setFilters,
    debouncedFilters,
    itemToDelete,
    setItemToDelete,
    deleteFromArr,
    setDeleteFromArr,
    isDeleting,
    setIsDeleting,
  }
}
