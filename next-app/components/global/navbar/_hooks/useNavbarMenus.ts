'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { usePathname } from 'next/navigation'

const USER_DROPDOWN_CONTAINER_ID = 'user-dropdown-container'

export interface UseNavbarMenusResult {
  isDropdownOpen: boolean
  setIsDropdownOpen: Dispatch<SetStateAction<boolean>>
  toggleDropdown: () => void
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>
  toggleMobileMenu: () => void
}

/**
 * Owns the navbar UI state:
 * - desktop user dropdown (closes on outside click & on path change)
 * - mobile menu overlay (locks body scroll, closes on path change)
 */
export function useNavbarMenus(): UseNavbarMenusResult {
  const pathname = usePathname()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById(USER_DROPDOWN_CONTAINER_ID)
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset both menus on route change
  useEffect(() => {
    setIsDropdownOpen(false)
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  return {
    isDropdownOpen,
    setIsDropdownOpen,
    toggleDropdown: () => setIsDropdownOpen((prev) => !prev),
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    toggleMobileMenu: () => setIsMobileMenuOpen((prev) => !prev),
  }
}

export { USER_DROPDOWN_CONTAINER_ID }
