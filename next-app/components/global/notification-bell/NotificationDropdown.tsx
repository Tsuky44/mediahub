'use client'

import Link from 'next/link'
import { Bell, X } from 'lucide-react'

import NotificationItemRow from './NotificationItemRow'
import type { NotificationItem } from './_types/notification-bell'

interface NotificationDropdownProps {
    notifications: NotificationItem[]
    unreadCount: number
    onClose: () => void
    onMarkAsRead: (id: number) => void
    onDelete: (id: number) => void
    onLinkClick: (id: number) => void
}

export default function NotificationDropdown({
    notifications,
    unreadCount,
    onClose,
    onMarkAsRead,
    onDelete,
    onLinkClick,
}: NotificationDropdownProps) {
    const isEmpty = !Array.isArray(notifications) || notifications.length === 0

    return (
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
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {isEmpty ? (
                    <div className="p-8 text-center">
                        <div className="bg-gray-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell className="h-6 w-6 text-gray-500" />
                        </div>
                        <p className="text-gray-400 text-sm">Aucune nouvelle notification</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800/50">
                        {notifications.map(notif => (
                            <NotificationItemRow
                                key={notif.id}
                                notif={notif}
                                onMarkAsRead={onMarkAsRead}
                                onDelete={onDelete}
                                onLinkClick={onLinkClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="p-3 bg-gray-800/30 border-t border-gray-800 text-center">
                <Link
                    href="/dashboard/notifications"
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                    onClick={onClose}
                >
                    Voir toutes les notifications
                </Link>
            </div>
        </div>
    )
}
