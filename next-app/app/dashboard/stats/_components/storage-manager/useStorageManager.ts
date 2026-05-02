'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import type { StorageItem, SeasonDetail, DeleteTarget } from '../../_types/storage'

export function useStorageManager(items: StorageItem[]) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'Movie' | 'Series'>('Movie')

  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null)
  const [deleteFromArr, setDeleteFromArr] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredItems = items.filter(
    item =>
      item.type === activeTab &&
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSize = items.reduce((acc, item) => acc + item.size, 0)
  const categorySize = items
    .filter(i => i.type === activeTab)
    .reduce((acc, item) => acc + item.size, 0)

  const openDeleteModal = (item: StorageItem, season?: SeasonDetail, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (item.isPlaying) {
      toast.error(`Impossible de supprimer : ${item.activeUser} regarde ce contenu actuellement !`)
      return
    }
    setItemToDelete({ item, season })
    setDeleteFromArr(true)
  }

  return {
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    filteredItems,
    totalSize,
    categorySize,
    itemToDelete,
    setItemToDelete,
    deleteFromArr,
    setDeleteFromArr,
    isDeleting,
    setIsDeleting,
    openDeleteModal,
  }
}
