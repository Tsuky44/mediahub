'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Home, Film, ListPlus, Settings, LogOut, Search, Download, BarChart3, User, Play, Server, ChevronRight, Loader2, Container, Menu, X } from 'lucide-react'
import { signOut, useSession, signIn } from 'next-auth/react'
import { NotificationBell } from './NotificationBell'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/components/providers/AbilityContext'
import { ImpersonationBannerClient } from './ImpersonationBannerClient'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Demander', href: '/dashboard/requests', icon: Search },
  { name: 'Mes demandes', href: '/dashboard/requests/list', icon: ListPlus },
  { name: 'Ma médiathèque', href: '/dashboard/media', icon: Film },
  { name: 'Statistiques', href: '/dashboard/stats', icon: BarChart3 },
  { name: 'Téléchargements', href: '/dashboard/downloads', icon: Download },
  { name: 'Docker', href: '/dashboard/docker', icon: Container },
]

export interface NavbarProps {
  configStatus?: {
    hasDownloads: boolean
    hasDocker: boolean
  }
  impersonation?: {
    role: string
  }
}

export function Navbar({ configStatus, impersonation }: NavbarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const ability = useAbility(AbilityContext)

  const filteredNavigation = navigation.filter(item => {
    if (item.href === '/dashboard/downloads') {
      if (configStatus && !configStatus.hasDownloads) return false
      return ability.can('read', 'Downloads')
    }
    if (item.href === '/dashboard/docker') {
      if (configStatus && !configStatus.hasDocker) return false
      return ability.can('read', 'Docker')
    }
    if (item.href === '/dashboard/stats') {
      return ability.can('read', 'Stats')
    }
    if (item.href === '/dashboard/requests') {
      return ability.can('read', 'Media')
    }
    if (item.href === '/dashboard/requests/list') {
      return ability.can('read', 'MediaRequest')
    }
    // Dashboard is always available
    if (item.href === '/dashboard') return true
    
    // Ma médiathèque defaults to Media read
    if (item.href === '/dashboard/media') {
      return ability.can('read', 'Library')
    }

    return true
  })

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

  // Fermer le dropdown et le menu mobile quand on change de page
  useEffect(() => {
    setIsDropdownOpen(false)
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Bloquer le scroll quand le menu mobile est ouvert
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

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-gray-900/80 backdrop-blur-xl border-b border-white/5 shadow-2xl supports-[backdrop-filter]:bg-gray-900/60">
        {impersonation && (
          <ImpersonationBannerClient roleName={impersonation.role} />
        )}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Logo et Menu Mobile */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors relative z-[60]"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              
              <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-3 group transition-all duration-300 relative">
                 <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 <div className="relative w-9 h-9 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                   <Image 
                     src="/logo.png" 
                     alt="Logo" 
                     width={36} 
                     height={36}
                     className="object-contain drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                   />
                 </div>
                 <div className="flex flex-col leading-none relative">
                    <span className="text-lg font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors drop-shadow-md">
                      MEDIA<span className="text-indigo-500">HUB</span>
                    </span>
                  </div>
              </Link>
            </div>

            {/* Navigation centrée (Desktop) */}
            <div className="hidden lg:flex flex-1 justify-center px-8">
              <div className="flex items-center gap-1">
                {filteredNavigation.map((item) => {
                   const isActive = pathname === item.href
                   const Icon = item.icon
                   return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        'relative px-2 lg:px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg flex items-center gap-2 group whitespace-nowrap',
                        isActive
                          ? 'text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)] border border-indigo-500/20'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      )}
                    >
                      <Icon className={clsx("w-4 h-4 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                      <span>{item.name}</span>
                      {isActive && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-indigo-500/50 rounded-full blur-[2px]" />
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
                <div className="hidden lg:flex items-center gap-3">
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
                          
                          {ability.can('read', 'Settings') && (
                            <>
                              <Link 
                                href="/dashboard/settings" 
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group"
                              >
                                <Settings className="h-4 w-4 text-gray-400 group-hover:rotate-45 transition-transform" />
                                Paramètres
                              </Link>
                            </>
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

      {/* Menu Mobile */}
      <div 
        className={clsx(
          "fixed inset-0 z-40 bg-gray-900/95 backdrop-blur-xl transition-all duration-300 lg:hidden",
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="flex flex-col h-full pt-20 px-6 pb-6">
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">
            {filteredNavigation.map((item) => {
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
                  <Icon className={clsx("h-5 w-5", isActive ? "text-indigo-400" : "text-gray-500")} />
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
                  <span className="text-sm font-semibold text-white">{session.user.name}</span>
                  <span className="text-xs text-gray-400">{session.user.email}</span>
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
                
                {(session?.user as any)?.role === 'admin' && (
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
    </>
  )
}
