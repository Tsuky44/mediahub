'use client'

import { createElement, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { io } from 'socket.io-client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

const notificationsKey = ['notifications', 'list'] as const
const unreadKey = ['notifications', 'unread-count'] as const

interface UseNotificationsResult {
    notifications: NotificationItem[]
    displayedNotifications: NotificationItem[]
    unreadCount: number
    refresh: () => Promise<void>
    markAsRead: (id: number) => Promise<{ success: boolean }>
    deleteOne: (id: number) => Promise<{ success: boolean }>
    markAllAsRead: () => Promise<{ success: boolean }>
}

/**
 * TanStack Query-powered notifications hook.
 *
 * - Notifications + unread count fetched & polled via useQuery (60s).
 * - Realtime socket.io connection (gated by `session.user.id`) pops a
 *   custom toast and invalidates the query cache on incoming events.
 * - Mutations invalidate queries on success for automatic refresh.
 */
export function useNotifications(): UseNotificationsResult {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const queryClient = useQueryClient()

    const { data: notifications = [] } = useQuery({
        queryKey: notificationsKey,
        queryFn: async () => getNotifications() as Promise<NotificationItem[]>,
        refetchInterval: POLL_INTERVAL_MS,
    })

    const { data: unreadCount = 0 } = useQuery({
        queryKey: unreadKey,
        queryFn: getUnreadCount,
        refetchInterval: POLL_INTERVAL_MS,
    })

    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    const markAsReadMutation = useMutation({
        mutationFn: markAsReadAction,
        onSuccess: () => refresh(),
    })

    const deleteOneMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => refresh(),
    })

    const markAllAsReadMutation = useMutation({
        mutationFn: markAllAsReadAction,
        onSuccess: () => refresh(),
    })

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
    }, [userId])

    const displayedNotifications = useMemo(
        () => notifications.filter(n => !n.isRead),
        [notifications]
    )

    return {
        notifications,
        displayedNotifications,
        unreadCount,
        refresh,
        markAsRead: (id: number) => markAsReadMutation.mutateAsync(id),
        deleteOne: (id: number) => deleteOneMutation.mutateAsync(id),
        markAllAsRead: () => markAllAsReadMutation.mutateAsync(),
    }
}
