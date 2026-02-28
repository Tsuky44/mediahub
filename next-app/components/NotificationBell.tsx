'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Trash2, ExternalLink, X, RefreshCw } from 'lucide-react'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '@/app/actions/notifications'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { io } from 'socket.io-client'

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

export function NotificationBell() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    const data = await getNotifications()
    setNotifications(data as any)
    const count = await getUnreadCount()
    setUnreadCount(count)
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 60 seconds as fallback
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  // Socket.IO Connection for Real-time Notifications
  useEffect(() => {
    if (!session?.user?.id) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    let wsUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL;
    
    if (!wsUrl) {
        if (process.env.NODE_ENV === 'development') {
            wsUrl = `${protocol === 'wss' ? 'https' : 'http'}://${window.location.hostname}:3005`;
        } else {
            // Production: Use relative path to leverage Next.js rewrites
            wsUrl = undefined;
        }
    }

    const socket = io(wsUrl || undefined, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        query: {
            userId: session.user.id
        }
    })

    socket.on('notification', (notif: Notification) => {
        // Play notification sound if desired
        // const audio = new Audio('/notification.mp3');
        // audio.play().catch(e => console.error(e));

        toast.custom((t) => (
            <div
                className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-gray-900 border border-gray-700 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
                <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        {notif.posterPath ? (
                            <img
                                className="h-10 w-10 rounded-md object-cover"
                                src={`https://image.tmdb.org/t/p/w92${notif.posterPath}`}
                                alt=""
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Bell size={20} />
                            </div>
                        )}
                    </div>
                    <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-white">
                        {notif.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                        {notif.message}
                    </p>
                    </div>
                </div>
                </div>
                <div className="flex border-l border-gray-700">
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none"
                >
                    Fermer
                </button>
                </div>
            </div>
        ), { duration: 5000 });
        
        fetchNotifications()
    })

    return () => {
        socket.disconnect()
    }
  }, [session?.user?.id])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Mark as read when opening
      if (unreadCount > 0) {
        markAllAsRead()
        setUnreadCount(0)
      }
    } else {
      // Refresh notifications when closing to clean up read ones
      fetchNotifications()
    }
  }, [isOpen])

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id)
    fetchNotifications()
  }

  const handleDelete = async (id: number) => {
    await deleteNotification(id)
    fetchNotifications()
  }

  const displayedNotifications = notifications.filter(n => !n.isRead)

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full bg-gray-800 p-1.5 text-gray-400 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 border-2 border-gray-900 animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-800/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {!Array.isArray(displayedNotifications) || displayedNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-gray-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-gray-400 text-sm">Aucune nouvelle notification</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {displayedNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={clsx(
                      "p-4 flex gap-4 transition-colors hover:bg-gray-800/30 group",
                      !notif.isRead && "bg-indigo-500/5"
                    )}
                  >
                    {notif.posterPath ? (
                      <div className="flex-shrink-0 w-12 h-18 rounded-md overflow-hidden bg-gray-800 border border-gray-700">
                        <img
                          src={`https://image.tmdb.org/t/p/w92${notif.posterPath}`}
                          alt={notif.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={clsx(
                        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                        notif.type === 'system_update' ? "bg-orange-500/20 text-orange-400" : "bg-indigo-500/20 text-indigo-400"
                      )}>
                        {notif.type === 'system_update' ? (
                           <RefreshCw className="h-5 w-5" />
                        ) : (
                           <Bell className="h-5 w-5" />
                        )}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={clsx(
                          "text-sm font-semibold truncate",
                          notif.isRead ? "text-gray-300" : "text-white"
                        )}>
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="p-1 text-gray-400 hover:text-green-400 rounded-md hover:bg-gray-700"
                              title="Marquer comme lu"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notif.id)}
                            className="p-1 text-gray-400 hover:text-red-400 rounded-md hover:bg-gray-700"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-500">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                        {notif.link && (
                          <Link
                            href={notif.link}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                            onClick={() => {
                              handleMarkAsRead(notif.id)
                              setIsOpen(false)
                            }}
                          >
                            Voir <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 bg-gray-800/30 border-t border-gray-800 text-center">
            <Link
              href="/dashboard/notifications"
              className="text-xs text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
