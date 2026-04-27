'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Film, ListPlus, Settings, LogOut, BarChart2, CloudDownload, Container } from 'lucide-react'
import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react'
import clsx from 'clsx'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/components/providers/AbilityContext'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home },
  { name: 'Médiathèque', href: '/dashboard/media', icon: Film },
  { name: 'Statistiques', href: '/dashboard/stats', icon: BarChart2 },
  { name: 'Demandes', href: '/dashboard/requests', icon: ListPlus },
  { name: 'Téléchargements', href: '/dashboard/downloads', icon: CloudDownload },
  { name: 'Docker', href: '/dashboard/docker', icon: Container },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const ability = useAbility(AbilityContext)

  const filteredNavigation = navigation.filter(item => {
    if (item.href === '/dashboard/downloads') {
      return ability.can('read', 'Downloads')
    }
    if (item.href === '/dashboard/docker') {
      return ability.can('read', 'Docker')
    }
    if (item.href === '/dashboard/requests') {
       return ability.can('read', 'MediaRequest')
    }
    if (item.href === '/dashboard/stats') {
        return ability.can('read', 'Stats')
    }
    if (item.href === '/dashboard/media') {
        return ability.can('read', 'Media')
    }
    return true
  })

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Logo" width={32} height={32} />
          <h1 className="text-xl font-bold tracking-tight">
            MEDIA<span className="text-indigo-500">HUB</span>
          </h1>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {filteredNavigation.map((item) => {
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

        {session?.user && session.user.role === 'admin' && (
          <Link
            href="/dashboard/settings"
            className={clsx(
              pathname === '/dashboard/settings'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
            )}
          >
            <Settings
              className={clsx(
                pathname === '/dashboard/settings' ? 'text-white' : 'text-gray-400 group-hover:text-white',
                'mr-3 h-6 w-6 flex-shrink-0'
              )}
              aria-hidden="true"
            />
            Paramètres
          </Link>
        )}
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
