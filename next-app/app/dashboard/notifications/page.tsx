'use client'

import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { NotificationItem } from './_components/NotificationItem'
import { useNotifications } from './_components/useNotifications'

export default function NotificationsPage() {
  const { notifications, loading, handleMarkAsRead, handleMarkAllAsRead, handleDelete } =
    useNotifications()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 rounded-xl">
            <Bell className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-gray-400 mt-0.5">Historique de vos notifications</p>
          </div>
        </div>

        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {loading && notifications.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-20">
          <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Aucune notification</p>
          <p className="text-gray-500 text-sm mt-1">Vous n&apos;avez pas encore reçu de notifications.</p>
        </div>
      )}

      <div className="onyx-stagger space-y-4">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
