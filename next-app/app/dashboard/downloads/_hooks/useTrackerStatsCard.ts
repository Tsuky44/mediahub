'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllTrackerStats } from '@/app/dashboard/settings/tracker-stats-actions'
import type {
  TrackerStat,
  TrackerStatsCacheInfo,
} from '../_types/tracker-stat'

interface UseTrackerStatsCardResult {
  stats: TrackerStat[]
  cacheInfo: TrackerStatsCacheInfo
  loading: boolean
  refreshing: boolean
  loadStats: (force?: boolean) => Promise<void>
}

const QUERY_KEY = ['tracker-stats', 'all'] as const

export function useTrackerStatsCard(): UseTrackerStatsCardResult {
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => getAllTrackerStats(false),
  })

  const stats: TrackerStat[] = data?.formatted ?? []
  const cacheInfo: TrackerStatsCacheInfo = data?.cache ?? { cached: false }

  const loadStats = async (force: boolean = false) => {
    if (force) {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    } else {
      await queryClient.refetchQueries({ queryKey: QUERY_KEY })
    }
  }

  return {
    stats,
    cacheInfo,
    loading: isLoading,
    refreshing: isFetching && !isLoading,
    loadStats,
  }
}
