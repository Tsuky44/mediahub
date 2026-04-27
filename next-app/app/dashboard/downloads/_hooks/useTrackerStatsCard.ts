'use client'

import { useCallback, useEffect, useState } from 'react'
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

export function useTrackerStatsCard(): UseTrackerStatsCardResult {
  const [stats, setStats] = useState<TrackerStat[]>([])
  const [cacheInfo, setCacheInfo] = useState<TrackerStatsCacheInfo>({
    cached: false,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadStats = useCallback(async (force: boolean = false) => {
    if (force) setRefreshing(true)
    try {
      const res = await getAllTrackerStats(force)
      setStats(res.formatted || [])
      setCacheInfo(res.cache || { cached: false })
    } catch (e) {
      console.error('Failed to load tracker stats:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return { stats, cacheInfo, loading, refreshing, loadStats }
}
