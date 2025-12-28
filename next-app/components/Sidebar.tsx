'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Film, ListPlus, Settings, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import clsx from 'clsx'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home },
  { name: 'Médiathèque', href: '/dashboard/media', icon: Film },
  { name: 'Demandes', href: '/dashboard/requests', icon: ListPlus },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold">MediaHub</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
              )}
            >
              <item.icon
                className={clsx(
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                  'mr-3 h-6 w-6 flex-shrink-0'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-800 p-4">
        <button
          onClick={() => signOut()}
          className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <LogOut
            className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-white"
            aria-hidden="true"
          />
          Déconnexion
        </button>
      </div>
    </div>
  )
}
