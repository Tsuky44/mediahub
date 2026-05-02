'use client'

import { useState, useEffect, useCallback } from 'react'
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '@/app/actions/notifications'

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
  createdAt: Date
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const data = await getNotifications()
    setNotifications(data as Notification[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id)
    fetchNotifications()
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    fetchNotifications()
  }

  const handleDelete = async (id: number) => {
    await deleteNotification(id)
    fetchNotifications()
  }

  return {
    notifications,
    loading,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
  }
}
