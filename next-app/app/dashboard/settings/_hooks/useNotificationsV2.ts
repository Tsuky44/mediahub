'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getNotificationsV2Config,
  saveNotificationsV2Config,
  testNotificationsV2,
  getUsersForNotifications,
} from '../notifications-v2-actions'
import type { NotificationsV2Config, NotificationEvent } from '@/lib/notifications-v2'
import type { UserOption } from '../_types/notifications-v2'

interface UseNotificationsV2Result {
  config: NotificationsV2Config | null
  users: UserOption[]
  loading: boolean
  saving: boolean
  message: string | null
  update: (patch: Partial<NotificationsV2Config>) => void
  updateEvolution: (patch: Partial<NotificationsV2Config['evolution']>) => void
  updateRetry: (patch: Partial<NotificationsV2Config['retry']>) => void
  updateEventRoute: (
    ev: NotificationEvent,
    patch: Partial<NotificationsV2Config['events'][NotificationEvent]>
  ) => void
  handleSave: () => Promise<void>
  handleTest: () => Promise<void>
}

export function useNotificationsV2(): UseNotificationsV2Result {
  const [config, setConfig] = useState<NotificationsV2Config | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cfg, userList] = await Promise.all([
          getNotificationsV2Config(),
          getUsersForNotifications(),
        ])
        if (cancelled) return
        setConfig(cfg)
        setUsers(userList)
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : String(e)
        setMessage(`Erreur chargement : ${msg}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const update = useCallback((patch: Partial<NotificationsV2Config>) => {
    setConfig((c) => (c ? { ...c, ...patch } : c))
  }, [])

  const updateEvolution = useCallback(
    (patch: Partial<NotificationsV2Config['evolution']>) => {
      setConfig((c) =>
        c ? { ...c, evolution: { ...c.evolution, ...patch } } : c
      )
    },
    []
  )

  const updateRetry = useCallback(
    (patch: Partial<NotificationsV2Config['retry']>) => {
      setConfig((c) => (c ? { ...c, retry: { ...c.retry, ...patch } } : c))
    },
    []
  )

  const updateEventRoute = useCallback(
    (
      ev: NotificationEvent,
      patch: Partial<NotificationsV2Config['events'][NotificationEvent]>
    ) => {
      setConfig((c) =>
        c
          ? { ...c, events: { ...c.events, [ev]: { ...c.events[ev], ...patch } } }
          : c
      )
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!config) return
    setSaving(true)
    setMessage(null)
    try {
      await saveNotificationsV2Config(config)
      setMessage('✅ Sauvegardé')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessage(`❌ ${msg}`)
    } finally {
      setSaving(false)
    }
  }, [config])

  const handleTest = useCallback(async () => {
    try {
      const res = await testNotificationsV2()
      setMessage(res.message)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessage(`❌ ${msg}`)
    }
  }, [])

  return {
    config,
    users,
    loading,
    saving,
    message,
    update,
    updateEvolution,
    updateRetry,
    updateEventRoute,
    handleSave,
    handleTest,
  }
}
