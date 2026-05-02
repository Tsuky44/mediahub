'use client'

import { useState, useEffect } from 'react'

export interface StatsData {
  cpu: number
  memory: {
    used: number
    limit: number
    percent: number
  }
  network: {
    rx: number
    tx: number
  }
  pids: number
}

export function useContainerStats(containerId: string) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/docker/${containerId}/stats`)
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        if (isMounted) {
          setStats(data.stats)
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          if (!stats) setError('Impossible de charger les statistiques')
        }
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 2000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [containerId])

  return { stats, loading, error }
}
