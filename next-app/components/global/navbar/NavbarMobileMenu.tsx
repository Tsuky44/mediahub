'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BarChart3, LogOut, Settings, User } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import clsx from 'clsx'
import type { NavItem } from './_types/navbar'

interface NavbarMobileMenuProps {
  items: NavItem[]
  pathname: string
  isOpen: boolean
}

export function NavbarMobileMenu({
  items,
  pathname,
  isOpen,
}: NavbarMobileMenuProps) {
  const { data: session } = useSession()

  return (
    <div
      className={clsx(
        'fixed inset-0 z-40 bg-gray-900/95 backdrop-blur-xl transition-all duration-300 lg:hidden',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="flex flex-col h-full pt-20 px-6 pb-6">
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">
          {items.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-4 px-4 py-3 text-base font-medium rounded-xl transition-all duration-300',
                  isActive
                    ? 'bg-indigo-500/10 text-white border border-indigo-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon
                  className={clsx(
                    'h-5 w-5',
                    isActive ? 'text-indigo-400' : 'text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </div>

        {session?.user && (
          <div className="mt-auto border-t border-gray-800 pt-6">
            <div className="flex items-center gap-4 px-4 mb-6">
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-700">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-300">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {session.user.name}
                </span>
                <span className="text-xs text-gray-400">
                  {session.user.email}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard/stats/me"
                className="flex items-center gap-4 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 rounded-xl transition-colors"
              >
                <BarChart3 className="h-5 w-5 text-indigo-400" />
                Mes Statistiques
              </Link>

              {session.user.role === 'admin' && (
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-4 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Settings className="h-5 w-5 text-gray-400" />
                  Paramètres
                </Link>
              )}

              <button
                onClick={() => signOut()}
                className="flex items-center gap-4 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors mt-2"
              >
                <LogOut className="h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
