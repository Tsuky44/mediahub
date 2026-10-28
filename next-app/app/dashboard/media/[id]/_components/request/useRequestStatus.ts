'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOnyxPhase, type OnyxResult } from '@/components/ui/onyx'

export function useRequestStatus(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  title: string,
  initialStatus: string
) {
  const [status, setStatus] = useState(initialStatus)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const { phase, error, run } = useOnyxPhase()
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

  /** Envoi avec les états Onyx ; le statut passe « en cours » après la confirmation. */
  const submit = useCallback(
    (send: () => Promise<OnyxResult>) =>
      run(send, () => {
        setStatus('processing')
        router.refresh()
      }),
    [run, router]
  )

  const sendRequest = useCallback(
    () =>
      submit(async () => {
        const res = await fetch('/api/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdbId, mediaType, title }),
        })
        const data = await res.json().catch(() => ({}))
        return { ok: res.ok && !!data.success, message: data.error || data.message }
      }),
    [submit, tmdbId, mediaType, title]
  )

  return {
    status,
    phase,
    error,
    showSeasonModal,
    setShowSeasonModal,
    setStatus,
    submit,
    sendRequest,
  }
}
