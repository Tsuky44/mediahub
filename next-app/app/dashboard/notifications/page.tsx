'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Trash2, ExternalLink, ArrowLeft } from 'lucide-react'
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '@/app/actions/notifications'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import Link from 'next/link'

interface Notification {
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    setLoading(true)
    const data = await getNotifications()
    setNotifications(data as any)
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

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
              <div
                key={notif.id}
                className={clsx(
                  "bg-gray-900 border transition-all duration-200 rounded-2xl p-5 flex gap-6 items-start group",
                  notif.isRead 
                    ? "border-gray-800/50 opacity-80" 
                    : "border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.1)] bg-indigo-500/[0.02]"
                )}
              >
                {notif.posterPath ? (
                  <div className="flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden bg-gray-800 border border-gray-700 shadow-lg">
                    <img
                      src={`https://image.tmdb.org/t/p/w185${notif.posterPath}`}
                      alt={notif.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Bell className="h-8 w-8" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={clsx(
                        "text-lg font-bold mb-1",
                        notif.isRead ? "text-gray-300" : "text-white"
                      )}>
                        {notif.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-xl transition-all"
                          title="Marquer comme lu"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        title="Supprimer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                    
                    {notif.link && (
                      <Link
                        href={notif.link}
                        className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border border-indigo-500/20"
                      >
                        Voir le média <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
