'use client'

import { Bell } from 'lucide-react'
import { toast, Toast } from 'react-hot-toast'

import type { NotificationItem } from './_types/notification-bell'

interface NotificationToastProps {
    t: Toast
    notif: NotificationItem
}

/**
 * Custom toast body shown when a realtime notification is pushed by the
 * websocket. Rendered through `toast.custom(t => ...)`.
 */
export default function NotificationToast({ t, notif }: NotificationToastProps) {
    return (
        <div
            className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-gray-900 border border-gray-700 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        {notif.posterPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
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
                        <p className="text-sm font-medium text-white">{notif.title}</p>
                        <p className="mt-1 text-sm text-gray-400">{notif.message}</p>
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
    )
}
