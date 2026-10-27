'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, CheckCheck, Film, Ticket, Rocket, X, Trash2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications } from './navbar/_hooks/useNotifications'
import type { NotificationItem } from './navbar/_hooks/useNotifications'

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  media_available: (
    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
      <Film className="h-5 w-5" />
    </div>
  ),
  new_ticket: (
    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
      <Ticket className="h-5 w-5" />
    </div>
  ),
  system_update: (
    <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
      <Rocket className="h-5 w-5" />
    </div>
  ),
}

function formatTimeAgo(dateInput: number | string | Date): string {
  const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput)
  const timestamp = date.getTime()
  if (isNaN(timestamp)) return "Récemment"

  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  return `Il y a ${days}j`
}

export function NotificationBell() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread')
  const containerRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const openedAtRef = useRef<number>(0)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  // Track opening/closing logic
  const handleToggle = () => {
    setIsOpen(prev => {
      if (prev) {
        // Closing manually
        const openDuration = Date.now() - openedAtRef.current
        if (openDuration >= 5000) {
          markAllAsRead()
        }
      } else {
        // Opening
        openedAtRef.current = Date.now()
      }
      return !prev
    })
  }

  const handleClose = () => {
    const openDuration = Date.now() - openedAtRef.current
    if (openDuration >= 5000) {
      markAllAsRead()
    }
    setIsOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedInsideBell = containerRef.current && containerRef.current.contains(target)
      const clickedInsideDrawer = drawerRef.current && drawerRef.current.contains(target)

      if (!clickedInsideBell && !clickedInsideDrawer) {
        if (isOpen) {
          const openDuration = Date.now() - openedAtRef.current
          if (openDuration >= 5000) {
            markAllAsRead()
          }
        }
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, markAllAsRead])

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleItemClick = (n: NotificationItem) => {
    if (n.link) {
      router.push(n.link)
    }
    if (!n.isRead) {
      markAsRead(n.id)
    }
    setIsOpen(false)
  }

  // Filter list based on selected tab
  const displayedNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead
    return true
  })

  return (
    <div ref={containerRef}>
      {/* Bell Trigger Icon */}
      <button
        onClick={handleToggle}
        className="group relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        aria-label="Notifications"
      >
        <Bell className="onyx-swing h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </button>

      {/* Drawer Overlay & Panel via Portal */}
      {mounted && typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop Blur Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />

              {/* Sliding Drawer Side Panel */}
              <motion.div
                ref={drawerRef}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-gray-950 border-l border-gray-800 shadow-2xl z-[101] flex flex-col overflow-hidden text-white"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-gray-900/50">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Bell className="h-6 w-6 text-indigo-400" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-gray-950">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Centre de notifications</h2>
                      <p className="text-xs text-gray-400">Restez informé de votre contenu</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-800/80 px-4 bg-gray-950">
                  <button
                    onClick={() => setActiveTab('unread')}
                    className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'unread'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <EyeOff className="h-4 w-4" />
                    Non lues
                    {unreadCount > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'all'
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    Toutes
                    {notifications.length > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Utility Panel */}
                {displayedNotifications.length > 0 && (
                  <div className="flex justify-between items-center px-6 py-2 bg-gray-900/30 border-b border-gray-900 text-xs text-gray-400">
                    <span>Affichage de {displayedNotifications.length} éléments</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>
                )}

                {/* Notifications Scrolling Container */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-900/60 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                  {isLoading && notifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      <p className="text-sm">Chargement des notifications...</p>
                    </div>
                  )}

                  {!isLoading && displayedNotifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                      <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center text-gray-500 border border-gray-800 mb-4 animate-bounce">
                        <Bell className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-gray-300 text-base">Aucune notification {activeTab === 'unread' ? 'non lue' : ''}</p>
                      <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
                        {activeTab === 'unread'
                          ? "Tout est à jour ! Regardez l'onglet 'Toutes' ou l'historique complet pour revoir vos anciennes notifications."
                          : "Vous n'avez reçu aucune notification pour le moment."}
                      </p>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {displayedNotifications.map((n) => {
                      const icon = NOTIFICATION_ICONS[n.type] ?? (
                        <div className="p-2 bg-gray-500/10 text-gray-400 rounded-xl border border-gray-500/20">
                          <Bell className="h-5 w-5" />
                        </div>
                      )

                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 50, height: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => handleItemClick(n)}
                          className={`flex items-start gap-4 p-5 transition-all relative group border-b border-gray-800/30 ${
                            n.link ? 'cursor-pointer hover:bg-white/[0.02]' : ''
                          } ${
                            n.isRead
                              ? 'bg-transparent'
                              : 'bg-indigo-500/[0.02] border-l-2 border-l-indigo-500 hover:bg-indigo-500/[0.04]'
                          }`}
                        >
                          {/* Poster or Icon */}
                          <div className="shrink-0">
                            {n.posterPath ? (
                              <div className="relative w-12 h-18 rounded-lg overflow-hidden bg-gray-800 border border-gray-700 shadow-md">
                                <img
                                  loading="lazy"
                                  decoding="async"
                                  src={`https://image.tmdb.org/t/p/w92${n.posterPath}`}
                                  alt={n.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              icon
                            )}
                          </div>

                          {/* Content text */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm leading-tight line-clamp-1 ${n.isRead ? 'text-gray-300' : 'text-white font-semibold'}`}>
                              {n.title}
                            </h4>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                              {n.message}
                            </p>
                            
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 font-medium">
                              <span>{formatTimeAgo(n.createdAt)}</span>
                              {n.link && (
                                <span className="flex items-center gap-0.5 text-indigo-400/80">
                                  • Clic pour ouvrir
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons (Appear on hover) */}
                          <div className="flex flex-col gap-1 items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.isRead && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  markAsRead(n.id)
                                }}
                                className="p-1.5 text-gray-400 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors"
                                title="Marquer comme lu"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  deleteNotification(n.id)
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>

                {/* Drawer Footer */}
                <div className="border-t border-gray-800 bg-gray-900/80 p-4">
                  <Link
                    href="/dashboard/notifications"
                    onClick={handleClose}
                    className="flex items-center justify-center gap-2 py-3 px-4 w-full text-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition-all"
                  >
                    Ouvrir l&apos;historique complet
                    <CheckCheck className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
