'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Notification {
  id: number
  title: string
  message: string
  type: string
  mediaId: string | null
  mediaType: string | null
  posterPath: string | null
  isRead: boolean
  link: string | null
  createdAt: number
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setNotifications(json.items ?? [])
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed')
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
    } catch {
      // Silently fail
    }
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {
      // Silently fail
    }
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {
      // Silently fail
    }
  }, [])

  return {
    notifications,
    loading,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
    refresh: fetchNotifications,
  }
}
