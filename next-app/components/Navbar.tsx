'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Home, Film, ListPlus, Settings, LogOut, Search, Download, BarChart3, User, Play } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { NotificationBell } from './NotificationBell'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Demander', href: '/dashboard/requests', icon: Search },
  { name: 'Mes demandes', href: '/dashboard/requests/list', icon: ListPlus },
  { name: 'Ma médiathèque', href: '/dashboard/media', icon: Film },
  { name: 'Statistiques', href: '/dashboard/stats', icon: BarChart3 },
  { name: 'Téléchargements', href: '/dashboard/downloads', icon: Download },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('user-dropdown-container')
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fermer le dropdown quand on change de page
  useEffect(() => {
    setIsDropdownOpen(false)
  }, [pathname])

  return (
    <nav className="sticky top-0 z-50 w-full bg-gray-900 border-b border-gray-800 shadow-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Logo à gauche */}
          <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-3 group transition-all duration-300">
             <div className="relative w-9 h-9 transition-transform duration-300 group-hover:scale-110">
               <Image 
                 src="/logo.png" 
                 alt="Logo" 
                 width={36} 
                 height={36}
                 className="object-contain"
               />
             </div>
             <div className="flex flex-col leading-none">
                <span className="text-lg font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                  MEDIA<span className="text-indigo-500">HUB</span>
                </span>
              </div>
          </Link>

          {/* Navigation centrée */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center space-x-1">
              {navigation.map((item) => {
                 const isActive = pathname === item.href
                 return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-xl group',
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {item.name}
                    {isActive && (
                      <div className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-xl -z-10 shadow-[0_0_20px_rgba(99,102,241,0.1)]" />
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full mb-1" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
          
          {/* Actions à droite */}
          <div className="flex items-center gap-4">
            <NotificationBell />
            
            {session?.user && (
              <div className="flex items-center gap-3">
                <div className="relative" id="user-dropdown-container">
                  <button 
                    className="flex items-center gap-2 focus:outline-none"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
                          {session.user.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-gray-900 border border-gray-800 shadow-2xl py-1 z-[60] overflow-hidden backdrop-blur-xl bg-gray-900/95"
                    >
                      <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50">
                        <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{session.user.email || 'Utilisateur Emby'}</p>
                      </div>

                      <div className="py-1">
                        <Link 
                          href="/dashboard/stats/me" 
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group"
                        >
                          <BarChart3 className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                          Mes Statistiques
                        </Link>
                        
                        {(session?.user as any)?.role === 'admin' && (
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
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
