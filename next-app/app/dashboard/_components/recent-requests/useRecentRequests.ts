'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getRecentRequests } from '../../dashboard-actions'
import { groupRequests } from '../../requests/list/_utils/group-requests'

export interface MediaRequest {
  id: string
  type: string
  status: number
  media: {
    title: string
    posterPath?: string
    tmdbId?: string
    seasons?: number[]
  }
  requestedBy: {
    displayName: string
    email?: string
  }
}

export function useRecentRequests(initialRequests: MediaRequest[]) {
  const { data: session } = useSession()
  const userEmail = session?.user?.email
  const [showMineOnly, setShowMineOnly] = useState(false)
  const [requests, setRequests] = useState<MediaRequest[]>(groupRequests(initialRequests) as MediaRequest[])

  // Si userEmail pas encore chargé (session hydrating), ne pas filtrer
  const filteredRequests = showMineOnly
    ? userEmail
      ? requests.filter(r => r.requestedBy?.email === userEmail)
      : requests
    : requests

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newRequests = await getRecentRequests()
        setRequests(groupRequests(newRequests) as MediaRequest[])
      } catch (error) {
        console.error('Failed to update recent requests:', error)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return { requests: filteredRequests, showMineOnly, setShowMineOnly }
}
