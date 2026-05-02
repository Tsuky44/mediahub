'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

export type MediaTypeFilter = 'all' | 'movie' | 'tv'
export type OwnershipFilter = 'all' | 'mine' | 'others'

export interface UseRequestFiltersResult {
    mediaType: MediaTypeFilter
    ownership: OwnershipFilter
    searchQuery: string
    setMediaType: (v: MediaTypeFilter) => void
    setOwnership: (v: OwnershipFilter) => void
    setSearchQuery: (v: string) => void
    filteredItems: (items: any[]) => any[]
    activeFilterCount: number
}

/**
 * Hook de filtrage client pour la liste des demandes.
 * Supporte le filtre par type (film/serie), proprietaire (perso/autres)
 * et recherche textuelle sur le titre.
 */
export function useRequestFilters(): UseRequestFiltersResult {
    const { data: session } = useSession()
    const userEmail = session?.user?.email

    const [mediaType, setMediaType] = useState<MediaTypeFilter>('all')
    const [ownership, setOwnership] = useState<OwnershipFilter>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const filteredItems = useCallback((items: any[]) => {
        const q = searchQuery.trim().toLowerCase()
        return items.filter(item => {
            if (mediaType !== 'all' && item.type !== mediaType) return false

            if (ownership !== 'all' && userEmail) {
                const requesterEmail = item.requestedBy?.email || ''
                if (ownership === 'mine' && requesterEmail !== userEmail) return false
                if (ownership === 'others' && requesterEmail === userEmail) return false
            }

            if (q) {
                const title = (item.media?.title || '').toLowerCase()
                const requesterName = (item.requestedBy?.displayName || '').toLowerCase()
                if (!title.includes(q) && !requesterName.includes(q)) return false
            }

            return true
        })
    }, [mediaType, ownership, searchQuery, userEmail])

    const activeFilterCount = useMemo(() => {
        let count = 0
        if (mediaType !== 'all') count++
        if (ownership !== 'all') count++
        if (searchQuery.trim()) count++
        return count
    }, [mediaType, ownership, searchQuery])

    return {
        mediaType,
        ownership,
        searchQuery,
        setMediaType,
        setOwnership,
        setSearchQuery,
        filteredItems,
        activeFilterCount,
    }
}
