'use client'

import { useNotificationsV2 } from '../_hooks/useNotificationsV2'
import NotificationsHeader from './notifications-v2/NotificationsHeader'
import EvolutionApiSection from './notifications-v2/EvolutionApiSection'
import RetrySection from './notifications-v2/RetrySection'
import EventsSection from './notifications-v2/EventsSection'
import NotificationsActionsBar from './notifications-v2/NotificationsActionsBar'

export default function NotificationsV2Settings() {
  const {
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
  } = useNotificationsV2()

  if (loading) return <div className="p-4">Chargement...</div>
  if (!config) return <div className="p-4 text-red-500">{message}</div>

  return (
    <div className="space-y-6 p-4 bg-white dark:bg-gray-900 rounded-lg shadow">
      <NotificationsHeader
        enabled={config.enabled}
        onToggle={(enabled) => update({ enabled })}
      />
      <EvolutionApiSection
        evolution={config.evolution}
        onChange={updateEvolution}
      />
      <RetrySection retry={config.retry} onChange={updateRetry} />
      <EventsSection
        events={config.events}
        users={users}
        onEventChange={updateEventRoute}
      />
      <NotificationsActionsBar
        saving={saving}
        message={message}
        onSave={handleSave}
        onTest={handleTest}
      />
    </div>
  )
}
