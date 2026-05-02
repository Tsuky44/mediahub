'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getRecentRequests } from '../../dashboard-actions'

export interface MediaRequest {
  id: string
  type: string
  status: number
  media: {
    title: string
    posterPath?: string
    tmdbId?: string
  }
  requestedBy: {
    displayName: string
    email: string
  }
}

export function useRecentRequests(initialRequests: MediaRequest[]) {
  const { data: session } = useSession()
  const userEmail = session?.user?.email
  const [showMineOnly, setShowMineOnly] = useState(false)
  const [requests, setRequests] = useState<MediaRequest[]>(initialRequests)

  const filteredRequests = showMineOnly && userEmail
    ? requests.filter(r => r.requestedBy?.email === userEmail)
    : requests

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newRequests = await getRecentRequests()
        // @ts-expect-error getRecentRequests may return any[]
        setRequests(newRequests)
      } catch (error) {
        console.error('Failed to update recent requests:', error)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return { requests: filteredRequests, showMineOnly, setShowMineOnly }
}
