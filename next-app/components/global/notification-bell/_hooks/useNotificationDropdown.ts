'use client'

import { useEffect, useRef, useState } from 'react'

interface UseNotificationDropdownOptions {
    /**
     * Called once when the dropdown transitions from closed to open. Used by
     * the orchestrator to mark unread notifications as read.
     */
    onOpen?: () => void
    /**
     * Called once when the dropdown transitions from open to closed. Used by
     * the orchestrator to refresh and prune already-read entries.
     */
    onClose?: () => void
}

interface UseNotificationDropdownResult {
    isOpen: boolean
    setIsOpen: (next: boolean) => void
    menuRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Owns the open/close UI state of the notification dropdown:
 * - Click-outside the menu container closes the panel.
 * - Fires `onOpen` / `onClose` callbacks on transitions so data side effects
 *   stay in the data hook layer instead of leaking into UI components.
 */
export function useNotificationDropdown({
    onOpen,
    onClose,
}: UseNotificationDropdownOptions = {}): UseNotificationDropdownResult {
    const [isOpen, setIsOpenState] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpenState(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (isOpen) {
            onOpen?.()
        } else {
            onClose?.()
        }
        // We intentionally only re-run on isOpen changes; the callbacks are
        // expected to be stable refs from the parent (useCallback).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const setIsOpen = (next: boolean) => setIsOpenState(next)

    return { isOpen, setIsOpen, menuRef }
}
