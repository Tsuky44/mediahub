'use client'

import { useEffect, useState } from 'react'
import {
  getNotificationsV2Config,
  saveNotificationsV2Config,
  testNotificationsV2,
  getUsersForNotifications,
} from './notifications-v2-actions'
import type { NotificationsV2Config, NotificationEvent } from '@/lib/notifications-v2'

interface UserOption {
  id: number
  name: string
  email: string
  hasWhatsapp: boolean
}

const EVENT_LABELS: Record<NotificationEvent, string> = {
  MEDIA_REQUESTED: 'Nouvelle demande',
  MEDIA_APPROVED: 'Demande approuvée',
  MEDIA_IMPORTING: 'Téléchargement terminé (import)',
  MEDIA_AVAILABLE: 'Média disponible (Emby)',
  MEDIA_FAILED: 'Échec',
}

const EVENT_ORDER: NotificationEvent[] = [
  'MEDIA_REQUESTED',
  'MEDIA_APPROVED',
  'MEDIA_IMPORTING',
  'MEDIA_AVAILABLE',
  'MEDIA_FAILED',
]

export default function NotificationsV2Settings() {
  const [config, setConfig] = useState<NotificationsV2Config | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [cfg, userList] = await Promise.all([
          getNotificationsV2Config(),
          getUsersForNotifications(),
        ])
        setConfig(cfg)
        setUsers(userList)
      } catch (e: any) {
        setMessage(`Erreur chargement : ${e.message}`)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="p-4">Chargement...</div>
  if (!config) return <div className="p-4 text-red-500">{message}</div>

  const update = (patch: Partial<NotificationsV2Config>) =>
    setConfig((c) => (c ? { ...c, ...patch } : c))

  const updateEvolution = (patch: Partial<NotificationsV2Config['evolution']>) =>
    setConfig((c) => (c ? { ...c, evolution: { ...c.evolution, ...patch } } : c))

  const updateEventRoute = (
    ev: NotificationEvent,
    patch: Partial<NotificationsV2Config['events'][NotificationEvent]>
  ) =>
    setConfig((c) =>
      c ? { ...c, events: { ...c.events, [ev]: { ...c.events[ev], ...patch } } } : c
    )

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setMessage(null)
    try {
      await saveNotificationsV2Config(config)
      setMessage('✅ Sauvegardé')
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    try {
      const res = await testNotificationsV2()
      setMessage(res.message)
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    }
  }

  return (
    <div className="space-y-6 p-4 bg-white dark:bg-gray-900 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Notifications V2 (indépendant)</h2>
          <p className="text-sm text-gray-500">
            Système autonome basé sur des événements internes, sans webhooks
            Radarr/Sonarr.
          </p>
        </div>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="h-5 w-5"
          />
          <span className="font-medium">Activer le module</span>
        </label>
      </div>

      <section>
        <h3 className="font-semibold mb-2">Evolution API</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2 dark:bg-gray-800"
            placeholder="URL (ex: https://evolution.example.com)"
            value={config.evolution.apiUrl}
            onChange={(e) => updateEvolution({ apiUrl: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2 dark:bg-gray-800"
            placeholder="API Key"
            type="password"
            value={config.evolution.apiKey}
            onChange={(e) => updateEvolution({ apiKey: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2 dark:bg-gray-800"
            placeholder="Instance"
            value={config.evolution.instance}
            onChange={(e) => updateEvolution({ instance: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2 dark:bg-gray-800"
            placeholder="Numéro par défaut (ex: 33612345678)"
            value={config.evolution.defaultNumber ?? ''}
            onChange={(e) => updateEvolution({ defaultNumber: e.target.value })}
          />
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Reprise d'erreur</h3>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            Tentatives max
            <input
              type="number"
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 mt-1"
              value={config.retry.maxAttempts}
              min={1}
              max={10}
              onChange={(e) =>
                update({
                  retry: {
                    ...config.retry,
                    maxAttempts: parseInt(e.target.value, 10) || 3,
                  },
                })
              }
            />
          </label>
          <label className="text-sm">
            Délai base (ms)
            <input
              type="number"
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 mt-1"
              value={config.retry.baseDelayMs}
              onChange={(e) =>
                update({
                  retry: {
                    ...config.retry,
                    baseDelayMs: parseInt(e.target.value, 10) || 1000,
                  },
                })
              }
            />
          </label>
          <label className="text-sm">
            Délai max (ms)
            <input
              type="number"
              className="w-full border rounded px-3 py-2 dark:bg-gray-800 mt-1"
              value={config.retry.maxDelayMs}
              onChange={(e) =>
                update({
                  retry: {
                    ...config.retry,
                    maxDelayMs: parseInt(e.target.value, 10) || 15000,
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Événements</h3>
        <div className="space-y-4">
          {EVENT_ORDER.map((ev) => {
            const route = config.events[ev]
            return (
              <div
                key={ev}
                className="border rounded p-3 dark:border-gray-700 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={route.enabled}
                      onChange={(e) =>
                        updateEventRoute(ev, { enabled: e.target.checked })
                      }
                    />
                    <span className="font-medium">{EVENT_LABELS[ev]}</span>
                    <code className="text-xs text-gray-500">{ev}</code>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={route.notifyRequester}
                      onChange={(e) =>
                        updateEventRoute(ev, {
                          notifyRequester: e.target.checked,
                        })
                      }
                    />
                    Notifier le demandeur
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500">
                    Utilisateurs destinataires (leur numéro WhatsApp sera utilisé)
                  </label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800"
                    value=""
                    onChange={(e) => {
                      const id = parseInt(e.target.value, 10)
                      if (!id) return
                      const current = route.targetUserIds ?? []
                      if (!current.includes(id)) {
                        updateEventRoute(ev, { targetUserIds: [...current, id] })
                      }
                      e.target.value = ''
                    }}
                  >
                    <option value="">— Ajouter un utilisateur —</option>
                    {users
                      .filter((u) => !(route.targetUserIds ?? []).includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {(u.name || u.email) + (u.hasWhatsapp ? '' : ' ⚠️ sans WhatsApp')}
                        </option>
                      ))}
                  </select>
                  {(route.targetUserIds ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(route.targetUserIds ?? []).map((uid) => {
                        const u = users.find((x) => x.id === uid)
                        const label = u ? u.name || u.email : `User #${uid}`
                        const warn = u && !u.hasWhatsapp
                        return (
                          <span
                            key={uid}
                            className={
                              'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ' +
                              (warn
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30')
                            }
                            title={warn ? 'Aucun numéro WhatsApp sur ce compte' : ''}
                          >
                            {label}
                            {warn && ' ⚠️'}
                            <button
                              type="button"
                              onClick={() =>
                                updateEventRoute(ev, {
                                  targetUserIds: (route.targetUserIds ?? []).filter(
                                    (x) => x !== uid
                                  ),
                                })
                              }
                              className="hover:text-black dark:hover:text-white ml-1"
                            >
                              ×
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
                <input
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800"
                  placeholder="Numéros bruts additionnels, séparés par virgules (ex: 33611112222, 33633334444)"
                  value={route.targetNumbers.join(', ')}
                  onChange={(e) =>
                    updateEventRoute(ev, {
                      targetNumbers: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm font-mono dark:bg-gray-800"
                  rows={4}
                  placeholder="Template personnalisé (placeholders: {title} {year} {user} {overview} {genres} {rating} {quality} {size} {reason}). Laisser vide = template par défaut."
                  value={route.template ?? ''}
                  onChange={(e) =>
                    updateEventRoute(ev, { template: e.target.value })
                  }
                />
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-4 border-t dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button
          onClick={handleTest}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
        >
          Envoyer un test
        </button>
        {message && <span className="text-sm">{message}</span>}
      </div>
    </div>
  )
}
