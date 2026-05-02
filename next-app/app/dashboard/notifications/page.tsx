'use client'

import { Bell, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useNotifications } from './_components/useNotifications'
import { NotificationItem } from './_components/NotificationItem'

export default function NotificationsPage() {
  const { notifications, loading, handleMarkAsRead, handleMarkAllAsRead, handleDelete } = useNotifications()

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/requests"
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-3xl font-bold">Notifications</h1>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Tout marquer comme lu
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-12 text-center">
            <div className="bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="h-10 w-10 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Aucune notification</h2>
            <p className="text-gray-400">Vous n'avez pas encore de notifications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
