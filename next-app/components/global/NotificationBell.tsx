'use client'

import { useCallback } from 'react'

import { useNotifications } from './notification-bell/_hooks/useNotifications'
import { useNotificationDropdown } from './notification-bell/_hooks/useNotificationDropdown'
import NotificationToggleButton from './notification-bell/NotificationToggleButton'
import NotificationDropdown from './notification-bell/NotificationDropdown'

export function NotificationBell() {
    const {
        displayedNotifications,
        unreadCount,
        refresh,
        markAsRead,
        deleteOne,
        markAllAsRead,
    } = useNotifications()

    const onOpen = useCallback(() => {
        if (unreadCount > 0) {
            markAllAsRead()
        }
    }, [unreadCount, markAllAsRead])

    const onClose = useCallback(() => {
        refresh()
    }, [refresh])

    const { isOpen, setIsOpen, menuRef } = useNotificationDropdown({ onOpen, onClose })

    const handleLinkClick = useCallback(
        (id: number) => {
            markAsRead(id)
            setIsOpen(false)
        },
        [markAsRead, setIsOpen]
    )

    return (
        <div className="relative" ref={menuRef}>
            <NotificationToggleButton
                unreadCount={unreadCount}
                onClick={() => setIsOpen(!isOpen)}
            />

            {isOpen && (
                <NotificationDropdown
                    notifications={displayedNotifications}
                    unreadCount={unreadCount}
                    onClose={() => setIsOpen(false)}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteOne}
                    onLinkClick={handleLinkClick}
                />
            )}
        </div>
    )
}
