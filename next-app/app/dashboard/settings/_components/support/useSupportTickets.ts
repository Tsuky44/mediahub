import { useState, useEffect, useCallback } from 'react'
import type { SupportTicketWithRelations } from '@/types/support'

export function useSupportTickets() {
  const [tickets, setTickets] = useState<SupportTicketWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/support/tickets')
      if (res.ok) {
        const data = (await res.json()) as SupportTicketWithRelations[]
        setTickets(data)
      }
    } catch (e) {
      console.error('[useSupportTickets] refresh error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) await refresh()
      return res.ok
    },
    [refresh]
  )

  return {
    tickets,
    isLoading,
    refresh,
    updateStatus,
  }
}
