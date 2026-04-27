'use client'

import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { io } from 'socket.io-client'

import {
    deleteNotification,
    getNotifications,
    getUnreadCount,
    markAllAsRead as markAllAsReadAction,
    markAsRead as markAsReadAction,
} from '@/app/actions/notifications'

import NotificationToast from '../NotificationToast'
import { resolveTrackerWsUrl } from '../_utils/socket-url'
import type { NotificationItem } from '../_types/notification-bell'

const POLL_INTERVAL_MS = 60_000
const REALTIME_TOAST_DURATION_MS = 5_000

interface UseNotificationsResult {
    notifications: NotificationItem[]
    displayedNotifications: NotificationItem[]
    unreadCount: number
    refresh: () => Promise<void>
    markAsRead: (id: number) => Promise<void>
    deleteOne: (id: number) => Promise<void>
    markAllAsRead: () => Promise<void>
}

/**
 * Owns the notifications data layer:
 * - Initial fetch on mount + 60s polling fallback.
 * - Realtime socket.io connection (gated by `session.user.id`) that pops a
 *   custom toast and refreshes the dropdown on incoming events.
 * - Optimistic mutations: markAsRead, deleteOne, markAllAsRead.
 */
export function useNotifications(): UseNotificationsResult {
    const { data: session } = useSession()
    const userId = session?.user?.id

    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const refresh = useCallback(async () => {
        const [data, count] = await Promise.all([getNotifications(), getUnreadCount()])
        setNotifications(data as NotificationItem[])
        setUnreadCount(count)
    }, [])

    useEffect(() => {
        refresh()
        const interval = setInterval(refresh, POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [refresh])

    useEffect(() => {
        if (!userId) return

        const socket = io(resolveTrackerWsUrl(), {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            query: { userId },
        })

        socket.on('notification', (notif: NotificationItem) => {
            toast.custom(
                t => createElement(NotificationToast, { t, notif }),
                { duration: REALTIME_TOAST_DURATION_MS }
            )
            refresh()
        })

        return () => {
            socket.disconnect()
        }
    }, [userId, refresh])

    const markAsRead = useCallback(
        async (id: number) => {
            await markAsReadAction(id)
            await refresh()
        },
        [refresh]
    )

    const deleteOne = useCallback(
        async (id: number) => {
            await deleteNotification(id)
            await refresh()
        },
        [refresh]
    )

    const markAllAsRead = useCallback(async () => {
        await markAllAsReadAction()
        setUnreadCount(0)
    }, [])

    const displayedNotifications = useMemo(
        () => notifications.filter(n => !n.isRead),
        [notifications]
    )

    return {
        notifications,
        displayedNotifications,
        unreadCount,
        refresh,
        markAsRead,
        deleteOne,
        markAllAsRead,
    }
}
