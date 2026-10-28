'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSeasonDetails } from '@/app/dashboard/media/[id]/actions'
import type { Episode } from '../_types/season'

const seasonEpisodesQuery = (tvId: number, seasonNumber: number) => ({
    queryKey: ['season-episodes', tvId, seasonNumber] as const,
    queryFn: async (): Promise<Episode[]> => {
        const data = await getSeasonDetails(tvId, seasonNumber)
        return data?.episodes ?? []
    },
    staleTime: Infinity,
})

/** Episodes d'une saison (TanStack Query) : charges au premier affichage, gardes en cache. */
export function useSeasonEpisodes(tvId: number, seasonNumber: number) {
    const { data: episodes = [], isLoading, isSuccess, isError } = useQuery(seasonEpisodesQuery(tvId, seasonNumber))
    return { episodes, loading: isLoading, loaded: isSuccess, error: isError }
}

/** Precharge les episodes d'une saison (survol ou focus de sa puce) : l'ouverture est immediate. */
export function usePrefetchSeasonEpisodes(tvId: number) {
    const queryClient = useQueryClient()
    return useCallback(
        (seasonNumber: number) => void queryClient.prefetchQuery(seasonEpisodesQuery(tvId, seasonNumber)),
        [queryClient, tvId],
    )
}
