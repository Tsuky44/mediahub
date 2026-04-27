'use client'

import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/components/providers/AbilityContext'
import { ImpersonationBannerClient } from './ImpersonationBannerClient'
import { NotificationBell } from './NotificationBell'
import { NavbarLogo } from './navbar/NavbarLogo'
import { NavbarDesktopMenu } from './navbar/NavbarDesktopMenu'
import { NavbarUserMenu } from './navbar/NavbarUserMenu'
import { NavbarMobileMenu } from './navbar/NavbarMobileMenu'
import { useNavbarMenus } from './navbar/_hooks/useNavbarMenus'
import { NAVIGATION_ITEMS } from './navbar/_constants/navigation-items'
import { filterNavigationItems } from './navbar/_utils/filter-navigation'
import type {
  NavbarConfigStatus,
  NavbarImpersonation,
} from './navbar/_types/navbar'

export interface NavbarProps {
  configStatus?: NavbarConfigStatus
  impersonation?: NavbarImpersonation
}

export function Navbar({ configStatus, impersonation }: NavbarProps) {
  const pathname = usePathname()
  const ability = useAbility(AbilityContext)
  const {
    isDropdownOpen,
    toggleDropdown,
    isMobileMenuOpen,
    toggleMobileMenu,
  } = useNavbarMenus()

  const filteredNavigation = filterNavigationItems(
    NAVIGATION_ITEMS,
    ability,
    configStatus
  )

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-gray-900/80 backdrop-blur-xl border-b border-white/5 shadow-2xl supports-[backdrop-filter]:bg-gray-900/60">
        {impersonation && (
          <ImpersonationBannerClient roleName={impersonation.role} />
        )}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors relative z-[60]"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <NavbarLogo />
            </div>

            <NavbarDesktopMenu
              items={filteredNavigation}
              pathname={pathname}
            />

            <div className="flex items-center gap-4">
              <NotificationBell />
              <NavbarUserMenu
                isOpen={isDropdownOpen}
                onToggle={toggleDropdown}
              />
            </div>
          </div>
        </div>
      </nav>

      <NavbarMobileMenu
        items={filteredNavigation}
        pathname={pathname}
        isOpen={isMobileMenuOpen}
      />
    </>
  )
}
