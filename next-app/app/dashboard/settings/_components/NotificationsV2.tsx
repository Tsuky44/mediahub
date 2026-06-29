'use client'

import { useState } from 'react'
import { useNotificationsV2 } from '../_hooks/useNotificationsV2'
import NotificationsHeader from './notifications-v2/NotificationsHeader'
import EvolutionApiSection from './notifications-v2/EvolutionApiSection'
import RetrySection from './notifications-v2/RetrySection'
import EventsSection from './notifications-v2/EventsSection'
import NotificationsActionsBar from './notifications-v2/NotificationsActionsBar'
import NotificationsDashboard from './notifications-v2/NotificationsDashboard'
import { Sliders, Activity } from 'lucide-react'

export default function NotificationsV2Settings() {
  const [activeTab, setActiveTab] = useState<'config' | 'monitoring'>('config')
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
    handleTestEvent,
  } = useNotificationsV2()

  if (loading) return <div className="p-4">Chargement...</div>
  if (!config) return <div className="p-4 text-red-500">{message}</div>

  return (
    <div className="space-y-6">
      {/* Onglets internes */}
      <div className="flex border-b border-white/5 space-x-1 pb-1">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'config'
              ? 'bg-white/10 text-white shadow'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders size={16} />
          Configuration
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'monitoring'
              ? 'bg-white/10 text-white shadow'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity size={16} />
          Monitoring & Logs
        </button>
      </div>

      {activeTab === 'config' ? (
        <div className="space-y-6">
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
            onTestEvent={handleTestEvent}
          />
          <NotificationsActionsBar
            saving={saving}
            message={message}
            onSave={handleSave}
            onTest={handleTest}
          />
        </div>
      ) : (
        <NotificationsDashboard />
      )}
    </div>
  )
}
