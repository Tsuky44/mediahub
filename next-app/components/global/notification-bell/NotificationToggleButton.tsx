'use client'

import { Bell } from 'lucide-react'

interface NotificationToggleButtonProps {
    unreadCount: number
    onClick: () => void
}

export default function NotificationToggleButton({
    unreadCount,
    onClick,
}: NotificationToggleButtonProps) {
    return (
        <button
            onClick={onClick}
            className="relative rounded-full bg-gray-800 p-1.5 text-gray-400 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 border-2 border-gray-900 animate-pulse" />
            )}
        </button>
    )
}
