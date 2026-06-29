'use client'

import { useState, useEffect } from 'react'
import { checkDownloadStatus, DownloadStatus } from '../download-status-actions'

export function useDownloadStatus(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  tvdbId?: number,
  title?: string
) {
  const [status, setStatus] = useState<DownloadStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await checkDownloadStatus(tmdbId, mediaType, tvdbId, title)
        setStatus(result)
      } catch (e) {
        console.error('Failed to fetch download status', e)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()

    const interval = setInterval(() => {
      if (!document.hidden) fetchStatus()
    }, 2_000)

    const onVisibilityChange = () => {
      if (!document.hidden) fetchStatus()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [tmdbId, mediaType, tvdbId, title])

  return { status, loading }
}
