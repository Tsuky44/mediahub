import { useState, useEffect, useCallback } from 'react'
import type { SupportCategoryWithSubcategories } from '@/types/support'

export function useSupportCategories() {
  const [categories, setCategories] = useState<SupportCategoryWithSubcategories[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/support/categories')
      if (res.ok) {
        const data = (await res.json()) as SupportCategoryWithSubcategories[]
        setCategories(data)
      }
    } catch (e) {
      console.error('[useSupportCategories] refresh error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createCategory = useCallback(
    async (payload: { name: string; discordWebhook?: string; discordMentions?: string }) => {
      const res = await fetch('/api/support/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) await refresh()
      return res.ok
    },
    [refresh]
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!confirm('Supprimer cette catégorie et toutes ses sous-catégories ?')) return
      const res = await fetch(`/api/support/categories?id=${id}`, { method: 'DELETE' })
      if (res.ok) await refresh()
      return res.ok
    },
    [refresh]
  )

  const updateCategory = useCallback(
    async (payload: { id: string; name?: string; discordWebhook?: string | null; discordMentions?: string | null }) => {
      const res = await fetch('/api/support/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) await refresh()
      return res.ok
    },
    [refresh]
  )

  const createSubcategory = useCallback(
    async (payload: { categoryId: string; name: string; discordWebhook?: string; discordMentions?: string }) => {
      const res = await fetch('/api/support/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) await refresh()
      return res.ok
    },
    [refresh]
  )

  const updateSubcategory = useCallback(
    async (payload: { id: string; name?: string; discordWebhook?: string | null; discordMentions?: string | null }) => {
      const res = await fetch('/api/support/subcategories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) await refresh()
      return res.ok
    },
    [refresh]
  )

  const deleteSubcategory = useCallback(
    async (id: string) => {
      if (!confirm('Supprimer cette sous-catégorie ?')) return
      const res = await fetch(`/api/support/subcategories?id=${id}`, { method: 'DELETE' })
      if (res.ok) await refresh()
      return res.ok
    },
    [refresh]
  )

  return {
    categories,
    isLoading,
    refresh,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
  }
}
