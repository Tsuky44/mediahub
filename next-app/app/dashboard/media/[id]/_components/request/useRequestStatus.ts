'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function useRequestStatus(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  title: string,
  initialStatus: string
) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  // Polling for status updates if pending or processing
  useEffect(() => {
    if (status !== 'pending' && status !== 'processing') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/media/availability/${tmdbId}?type=${mediaType}&refresh=true&t=${Date.now()}`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.status !== status) {
            setStatus(data.status)
            if (data.status === 'available' || data.status === 'partial' || data.status === 'unknown') {
              router.refresh()
            }
          }
        }
      } catch (e) {
        console.error('Polling failed:', e)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [status, tmdbId, mediaType, router])

  const sendRequest = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId, mediaType, title }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('processing')
        router.refresh()
        return true
      }
      alert('Request failed: ' + (data.error || data.message || 'Unknown error'))
      return false
    } catch (e) {
      console.error(e)
      alert('An error occurred')
      return false
    } finally {
      setLoading(false)
    }
  }, [tmdbId, mediaType, title, router])

  return {
    status,
    loading,
    showSeasonModal,
    setShowSeasonModal,
    setStatus,
    sendRequest,
  }
}
