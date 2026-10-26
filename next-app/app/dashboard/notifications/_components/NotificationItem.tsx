'use client'

import { Bell, RefreshCw, Check, Trash2, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import type { Notification } from './useNotifications'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: number) => void
  onDelete: (id: number) => void
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const router = useRouter()

  const getButtonText = () => {
    switch (notification.type) {
      case 'new_ticket':
        return 'Voir le ticket'
      case 'system_update':
        return 'Mettre à jour'
      case 'media_available':
      default:
        return 'Voir le média'
    }
  }

  const handleContainerClick = () => {
    if (notification.link) {
      router.push(notification.link)
      if (!notification.isRead) {
        onMarkAsRead(notification.id)
      }
    }
  }

  return (
    <div
      onClick={handleContainerClick}
      className={clsx(
        "bg-gray-900 border transition-all duration-200 rounded-2xl p-5 flex gap-6 items-start group",
        notification.link && "cursor-pointer hover:bg-gray-900/80 hover:border-indigo-500/40",
        notification.isRead
          ? "border-gray-800/50 opacity-80"
          : "border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.1)] bg-indigo-500/[0.02]"
      )}
    >
      {notification.posterPath ? (
        <div className="flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden bg-gray-800 border border-gray-700 shadow-lg">
          <img
            loading="lazy"
            decoding="async"
            src={`https://image.tmdb.org/t/p/w185${notification.posterPath}`}
            alt={notification.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className={clsx(
          "flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center",
          notification.type === 'system_update' ? "bg-orange-500/20 text-orange-400" : "bg-indigo-500/20 text-indigo-400"
        )}>
          {notification.type === 'system_update' ? (
             <RefreshCw className="h-8 w-8" />
          ) : (
             <Bell className="h-8 w-8" />
          )}
        </div>
      )}

      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className={clsx(
              "text-lg font-bold mb-1",
              notification.isRead ? "text-gray-300" : "text-white"
            )}>
              {notification.title}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {notification.message}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!notification.isRead && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkAsRead(notification.id)
                }}
                className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-xl transition-all"
                title="Marquer comme lu"
              >
                <Check className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(notification.id)
              }}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
              title="Supprimer"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
          </span>

          {notification.link && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleContainerClick()
              }}
              className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border border-indigo-500/20"
            >
              {getButtonText()} <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
