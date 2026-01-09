'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Download, Activity, ArrowRight, Globe, Database, HardDrive, ArrowUp, Film, Tv } from 'lucide-react'
import Link from 'next/link'
import { getTorrents } from './downloads/actions'
import { checkServicesHealth, liveSearch } from './dashboard-actions'

interface QuickActionsProps {
  initialTorrents?: any[]
  userName?: string
  isAdmin?: boolean
}

export function QuickActions({ initialTorrents = [], userName, isAdmin }: QuickActionsProps) {
  const [torrents, setTorrents] = useState(initialTorrents)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [servicesStatus, setServicesStatus] = useState({
    emby: 'loading',
    jellystat: 'loading'
  })

  // Formatage de la vitesse
  const formatSpeed = (bytesPerSecond: number) => {
    const mbps = bytesPerSecond / (1024 * 1024)
    return mbps.toFixed(1) + ' Mo/s'
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true)
        const results = await liveSearch(searchQuery)
        setSearchResults(results)
        setIsSearching(false)
        setShowResults(true)
      } else {
        setSearchResults([])
        setShowResults(false)
      }
    }

    const timer = setTimeout(performSearch, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const checkServices = async () => {
      try {
        const status = await checkServicesHealth()
        setServicesStatus(status)
      } catch (e) {
        console.error('Failed to check services', e)
      }
    }

    checkServices()
    const timer = setInterval(async () => {
      // On récupère tous les torrents pour calculer les vitesses globales
      const all = await getTorrents('all')
      setTorrents(all)
    }, 5000)
    
    const serviceTimer = setInterval(checkServices, 30000) // Plus fréquent pour corriger le "marche pas"
    
    return () => {
      clearInterval(timer)
      clearInterval(serviceTimer)
    }
  }, [])

  const activeTorrents = Array.isArray(torrents) 
    ? torrents.filter((t: any) => 
        ['downloading', 'stalledDL', 'uploading', 'stalledUP', 'checkingUP', 'checkingDL', 'forcedDL', 'forcedUP'].includes(t.state)
      )
      .sort((a: any, b: any) => {
        // Priorité à ceux qui ont de la vitesse (DL ou UL)
        const aSpeed = (a.dlspeed || 0) + (a.upspeed || 0)
        const bSpeed = (b.dlspeed || 0) + (b.upspeed || 0)
        if (aSpeed > 0 && bSpeed === 0) return -1
        if (aSpeed === 0 && bSpeed > 0) return 1
        return bSpeed - aSpeed // Trier par vitesse décroissante si les deux sont actifs
      })
    : []

  const totalDlSpeed = Array.isArray(torrents) ? torrents.reduce((acc, t) => acc + (t.dlspeed || 0), 0) : 0
  const totalUlSpeed = Array.isArray(torrents) ? torrents.reduce((acc, t) => acc + (t.upspeed || 0), 0) : 0

  return (
    <div className="space-y-6">
      {/* Barre de recherche centrale style Jellyseerr */}
      <div className="max-w-4xl mx-auto pt-8 pb-4" ref={searchRef}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
            {userName ? `Bonjour ${userName}, que` : 'Que'} voulez-vous <span className="text-blue-500">regarder</span> ?
          </h1>
          <p className="text-gray-400">Recherchez parmi des milliers de films et séries à ajouter.</p>
        </div>
        
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Rechercher un film ou une série..."
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-6 py-5 pl-14 text-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-2xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  window.location.href = `/dashboard/requests?search=${encodeURIComponent(searchQuery)}`
                }
              }}
            />
            <Search className={`absolute left-5 w-6 h-6 transition-colors ${isSearching ? 'text-blue-500 animate-pulse' : 'text-gray-500 group-focus-within:text-blue-500'}`} />
          </div>

          {/* Résultats de recherche Live */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl bg-opacity-95">
              <div className="max-h-[400px] overflow-y-auto py-2">
                {searchResults.map((result) => (
                  <Link 
                    key={`${result.type}-${result.id}`}
                    href={`/dashboard/requests?search=${encodeURIComponent(result.title)}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/50 transition-colors group"
                  >
                    <div className="w-10 h-14 bg-gray-800 rounded flex-shrink-0 overflow-hidden">
                      {result.poster ? (
                        <img src={result.poster} alt={result.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {result.type === 'movie' ? <Film className="w-5 h-5 text-gray-600" /> : <Tv className="w-5 h-5 text-gray-600" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                        {result.title}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="capitalize">{result.type === 'movie' ? 'Film' : 'Série'}</span>
                        {result.year && <span>• {result.year}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status et Téléchargements (Uniquement Admin) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Services */}
        <div className="bg-gray-900/40 border border-gray-800/50 p-4 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Services</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Emby</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${servicesStatus.emby === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-xs ${servicesStatus.emby === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                  {servicesStatus.emby === 'online' ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Jellystat</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${servicesStatus.jellystat === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-xs ${servicesStatus.jellystat === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                  {servicesStatus.jellystat === 'online' ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Téléchargements Actifs */}
        <div className="bg-gray-900/40 border border-gray-800/50 p-4 rounded-2xl backdrop-blur-sm md:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Téléchargements</span>
              <div className="flex items-center gap-2 border-l border-gray-800 pl-3">
                <div className="flex items-center gap-1 text-[10px] text-blue-400">
                  <Download className="w-3 h-3" />
                  <span>{formatSpeed(totalDlSpeed)}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-green-400">
                  <ArrowUp className="w-3 h-3" />
                  <span>{formatSpeed(totalUlSpeed)}</span>
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-blue-500" />
          </div>
          {activeTorrents.length > 0 ? (
            <div className="space-y-3">
              {activeTorrents.slice(0, 2).map((torrent: any) => (
                <div key={torrent.hash} className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span className="truncate max-w-[200px]">{torrent.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={torrent.dlspeed > 0 ? 'text-blue-400' : 'text-green-400'}>
                        {torrent.dlspeed > 0 ? `↓ ${formatSpeed(torrent.dlspeed)}` : `↑ ${formatSpeed(torrent.upspeed)}`}
                      </span>
                      <span>{Math.round(torrent.progress * 100)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                    <div 
                      className={`${torrent.dlspeed > 0 ? 'bg-blue-500' : 'bg-green-500'} h-full transition-all duration-500`} 
                      style={{ width: `${torrent.progress * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {activeTorrents.length > 2 && (
                <Link href="/dashboard/downloads" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  +{activeTorrents.length - 2} autres transferts <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-10">
              <span className="text-xs text-gray-600 italic">Aucun transfert actif</span>
            </div>
          )}
        </div>

        {/* Quick Link / Storage */}
        <div className="bg-gray-900/40 border border-gray-800/50 p-4 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Liens Rapides</span>
            <Globe className="w-4 h-4 text-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/dashboard/requests" className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-[11px] text-gray-300 transition-colors">
              <Database className="w-3 h-3 text-blue-400" />
              Demandes
            </Link>
            <Link href="/dashboard/downloads" className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-[11px] text-gray-300 transition-colors">
              <HardDrive className="w-3 h-3 text-purple-400" />
              Stockage
            </Link>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
