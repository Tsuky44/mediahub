'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BarChart3, LogOut, Settings, User } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/components/providers/AbilityContext'
import { USER_DROPDOWN_CONTAINER_ID } from './_hooks/useNavbarMenus'

interface NavbarUserMenuProps {
  isOpen: boolean
  onToggle: () => void
}

export function NavbarUserMenu({ isOpen, onToggle }: NavbarUserMenuProps) {
  const { data: session } = useSession()
  const ability = useAbility(AbilityContext)

  if (!session?.user) return null

  return (
    <div className="hidden lg:flex items-center gap-3">
      <div className="relative" id={USER_DROPDOWN_CONTAINER_ID}>
        <button
          className="flex items-center gap-2 focus:outline-none"
          onClick={onToggle}
        >
          <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-gray-700 hover:border-indigo-500 transition-all duration-300 hover:scale-105 shadow-lg shadow-black/20">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-sm font-bold text-gray-300">
                {session.user.name?.charAt(0).toUpperCase() || (
                  <User className="w-4 h-4" />
                )}
              </div>
            )}
          </div>
        </button>

        {isOpen && (
          <div className="animate-pop-in absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-gray-900 border border-gray-800 shadow-2xl py-1 z-[60] overflow-hidden backdrop-blur-xl bg-gray-900/95">
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50">
              <p className="text-sm font-semibold text-white truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {session.user.email || 'Utilisateur'}
              </p>
            </div>

            <div className="py-1">
              <Link
                href="/dashboard/stats/me"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group"
              >
                <BarChart3 className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                Mes Statistiques
              </Link>

              {ability.can('read', 'Settings') && (
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group"
                >
                  <Settings className="h-4 w-4 text-gray-400 group-hover:rotate-45 transition-transform" />
                  Paramètres
                </Link>
              )}
            </div>

            <div className="border-t border-gray-800 py-1">
              <button
                onClick={() => signOut()}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
