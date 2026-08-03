'use client'

import { useEffect, useState } from 'react'
import type { DeleteTarget } from '../../_types/storage'

export function useStorageManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null)
  const [deleteFromArr, setDeleteFromArr] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    itemToDelete,
    setItemToDelete,
    deleteFromArr,
    setDeleteFromArr,
    isDeleting,
    setIsDeleting,
  }
}
