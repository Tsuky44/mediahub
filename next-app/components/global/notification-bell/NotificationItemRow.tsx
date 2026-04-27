'use client'

import Link from 'next/link'
import { Bell, Check, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { NotificationItem } from './_types/notification-bell'

interface NotificationItemRowProps {
    notif: NotificationItem
    onMarkAsRead: (id: number) => void
    onDelete: (id: number) => void
    onLinkClick: (id: number) => void
}

export default function NotificationItemRow({
    notif,
    onMarkAsRead,
    onDelete,
    onLinkClick,
}: NotificationItemRowProps) {
    return (
        <div
            className={clsx(
                'p-4 flex gap-4 transition-colors hover:bg-gray-800/30 group',
                !notif.isRead && 'bg-indigo-500/5'
            )}
        >
            {notif.posterPath ? (
                <div className="flex-shrink-0 w-12 h-18 rounded-md overflow-hidden bg-gray-800 border border-gray-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`https://image.tmdb.org/t/p/w92${notif.posterPath}`}
                        alt={notif.title}
                        className="w-full h-full object-cover"
                    />
                </div>
            ) : (
                <div
                    className={clsx(
                        'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
                        notif.type === 'system_update'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-indigo-500/20 text-indigo-400'
                    )}
                >
                    {notif.type === 'system_update' ? (
                        <RefreshCw className="h-5 w-5" />
                    ) : (
                        <Bell className="h-5 w-5" />
                    )}
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p
                        className={clsx(
                            'text-sm font-semibold truncate',
                            notif.isRead ? 'text-gray-300' : 'text-white'
                        )}
                    >
                        {notif.title}
                    </p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                            <button
                                onClick={() => onMarkAsRead(notif.id)}
                                className="p-1 text-gray-400 hover:text-green-400 rounded-md hover:bg-gray-700"
                                title="Marquer comme lu"
                            >
                                <Check className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(notif.id)}
                            className="p-1 text-gray-400 hover:text-red-400 rounded-md hover:bg-gray-700"
                            title="Supprimer"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-500">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                            locale: fr,
                        })}
                    </span>
                    {notif.link && (
                        <Link
                            href={notif.link}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                            onClick={() => onLinkClick(notif.id)}
                        >
                            Voir <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}
