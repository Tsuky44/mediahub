'use client'

import { useEffect, useRef, useState } from 'react'

interface UseDockerOpenMenuResult {
    openMenuId: string | null
    setOpenMenuId: (id: string | null) => void
    toggleMenu: (id: string) => void
    closeMenu: () => void
    menuRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Owns the per-container action menu state. Closes the menu when the user
 * clicks anywhere outside the registered container.
 *
 * The orchestrator forwards `menuRef` to the relevant DOM region so the
 * click-outside detector can resolve the active subtree.
 */
export function useDockerOpenMenu(): UseDockerOpenMenuResult {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleMenu = (id: string) => {
        setOpenMenuId(prev => (prev === id ? null : id))
    }
    const closeMenu = () => setOpenMenuId(null)

    return { openMenuId, setOpenMenuId, toggleMenu, closeMenu, menuRef }
}
