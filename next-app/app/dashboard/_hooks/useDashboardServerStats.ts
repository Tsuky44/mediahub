'use client'

import { useEffect, useState } from 'react'
import {
  checkServicesHealth,
  getDashboardStats,
} from '../dashboard-actions'
import type {
  DashboardStats,
  ServicesHealth,
} from '../_types/dashboard'

const isDev = process.env.NODE_ENV === 'development'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const error = (...args: any[]) => {
  if (isDev) console.error(...args)
}

const SERVICES_POLL_MS = 30_000
const STATS_POLL_MS = 60_000

export interface UseDashboardServerStatsResult {
  servicesStatus: ServicesHealth
  stats: DashboardStats | null
}

export function useDashboardServerStats(): UseDashboardServerStatsResult {
  const [servicesStatus, setServicesStatus] = useState<ServicesHealth>({
    emby: 'loading',
  })
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    const checkServices = async () => {
      try {
        const status = (await checkServicesHealth()) as ServicesHealth
        setServicesStatus(status)
      } catch (e) {
        error('Failed to check services', e)
      }
    }

    const fetchStats = async () => {
      try {
        const s = (await getDashboardStats()) as DashboardStats | null
        setStats(s)
      } catch (e) {
        error('Failed to fetch stats', e)
      }
    }

    checkServices()
    fetchStats()

    const serviceTimer = setInterval(checkServices, SERVICES_POLL_MS)
    const statsTimer = setInterval(fetchStats, STATS_POLL_MS)

    return () => {
      clearInterval(serviceTimer)
      clearInterval(statsTimer)
    }
  }, [])

  return { servicesStatus, stats }
}
