'use client'

import { useCallback, useEffect, useState } from 'react'
import type { InternalNotificationType } from '@/lib/notifications/internal'

export interface NotificationItem {
  id: number
  title: string
  message: string
  type: InternalNotificationType
  mediaId: string | null
  mediaType: string | null
  posterPath: string | null
  isRead: boolean
  link: string | null
  data: string | null
  createdAt: number
}

export interface UseNotificationsResult {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: number) => Promise<void>
  refresh: () => Promise<void>
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setNotifications(json.items ?? [])
      setUnreadCount(json.unreadCount ?? 0)
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to mark as read')
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // Silently fail
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to mark all as read')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // Silently fail
    }
  }, [])

  const deleteNotification = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setNotifications(prev => prev.filter(n => n.id !== id))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  }
}
