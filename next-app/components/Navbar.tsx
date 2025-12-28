'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Film, ListPlus, Settings, LogOut, Search, Download } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import clsx from 'clsx'

const navigation = [
  { name: 'Demander', href: '/dashboard/requests', icon: Home },
  { name: 'Mes demandes', href: '/dashboard/requests/list', icon: ListPlus },
  { name: 'Ma médiathèque', href: '/dashboard/media', icon: Film },
  { name: 'Téléchargements', href: '/dashboard/downloads', icon: Download },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav className="sticky top-0 z-50 w-full bg-gray-900 border-b border-gray-800 shadow-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
               <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                 MediaHub
               </span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => {
                   const isActive = pathname === item.href
                   return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200'
                      )}
                    >
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                    type="text"
                    className="block w-full rounded-full border-0 bg-gray-800 py-1.5 pl-10 pr-3 text-gray-300 placeholder:text-gray-400 focus:bg-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="Search..."
                />
            </div>

            {session?.user?.name === 'mathis' && (
              <Link href="/dashboard/settings" className="rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white">
                  <Settings className="h-6 w-6" aria-hidden="true" />
              </Link>
            )}

            <button
              onClick={() => signOut()}
              className="rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              <LogOut className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
