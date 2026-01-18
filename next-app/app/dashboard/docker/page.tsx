
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Container, Play, Square, RefreshCw, Server, Activity, Loader2, RotateCw, FileText, ChevronDown, ChevronRight, LayoutGrid, List as ListIcon, Layers, Search, Terminal } from 'lucide-react'
import clsx from 'clsx'
import LogViewer from './LogViewer'
import GroupManager from './GroupManager'
import ContainerStats from './ContainerStats'
import TerminalViewer from './TerminalViewer'
import ContainerDetails from './ContainerDetails'
import { Box } from 'lucide-react'

interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports?: string
  autoStart: boolean
  icon?: string
}

interface DockerGroup {
    id: string
    name: string
    members: { containerName: string }[]
}

export default function DockerPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isAdmin = user?.role === 'admin'
  const permissions = user?.permissions || []
  const canView = isAdmin || permissions.includes('docker.view') || permissions.includes('docker.manage')
  const canManage = isAdmin || permissions.includes('docker.manage')

  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [groups, setGroups] = useState<DockerGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showLogsForContainer, setShowLogsForContainer] = useState<DockerContainer | null>(null)
  const [statsContainer, setStatsContainer] = useState<DockerContainer | null>(null)
  const [terminalContainer, setTerminalContainer] = useState<DockerContainer | null>(null)
  const [detailsContainer, setDetailsContainer] = useState<DockerContainer | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
  
  // Load view mode and collapsed groups from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('dockerViewMode') as 'grid' | 'list'
    if (savedMode) setViewMode(savedMode)

    const savedCollapsed = localStorage.getItem('dockerCollapsedGroups')
    if (savedCollapsed) {
        try {
            setCollapsedGroups(JSON.parse(savedCollapsed))
        } catch (e) {
            console.error('Error parsing collapsed groups', e)
        }
    }
  }, [])

  // Save view mode to localStorage
  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('dockerViewMode', mode)
  }

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
        const next = prev.includes(groupId) 
            ? prev.filter(id => id !== groupId) 
            : [...prev, groupId]
        localStorage.setItem('dockerCollapsedGroups', JSON.stringify(next))
        return next
    })
  }
  const [showGroupManager, setShowGroupManager] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const fetchGroups = async () => {
    try {
        const res = await fetch('/api/docker/groups')
        if (res.ok) {
            const data = await res.json()
            setGroups(data.groups || [])
        }
    } catch (error) {
        console.error(error)
    }
  }

  const fetchContainers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/unraid/docker')
      if (!res.ok) {
        if (res.status === 401) throw new Error('Non autorisé')
        throw new Error('Erreur lors de la récupération des conteneurs')
      }
      const data = await res.json()
      setContainers(data.containers || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleAction = async (containerId: string, action: 'start' | 'stop' | 'restart') => {
      setActionLoading(containerId)
      setOpenMenuId(null) // Close menu if open
      try {
          const res = await fetch('/api/unraid/docker/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ containerId, action })
          })

          if (!res.ok) throw new Error('Action failed')
          
          // Refresh list after action
          await fetchContainers(true)
      } catch (err: any) {
          setError(`Erreur lors de l'action ${action}: ${err.message}`)
      } finally {
          setActionLoading(null)
      }
  }

  const toggleMenu = (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      setOpenMenuId(openMenuId === id ? null : id)
  }

  useEffect(() => {
    fetchGroups()
    fetchContainers()
    const interval = setInterval(() => {
        fetchContainers(true)
        // Groups don't need frequent refresh, but maybe on explicit refresh
    }, 10000) 
    return () => clearInterval(interval)
  }, [])

  const renderContainerCard = (container: DockerContainer) => {
    if (viewMode === 'list') {
        return (
            <div 
              key={container.id} 
              onClick={() => setStatsContainer(container)}
              className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3 hover:bg-gray-800/60 hover:border-gray-600 transition-all flex items-center gap-4 group relative overflow-hidden cursor-pointer"
            >
                <div className={clsx(
                    "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                    container.state === 'RUNNING' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-gray-700"
                )} />

                <div className={clsx(
                    "w-10 h-10 rounded-lg flex items-center justify-center shadow-lg overflow-hidden bg-gray-900/80 p-1.5 flex-shrink-0 transition-transform group-hover:scale-105",
                    container.state === 'RUNNING' ? "ring-1 ring-green-500/30" : "ring-1 ring-gray-700/50"
                )}>
                    {container.icon ? (
                        <img src={container.icon} alt={container.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                        <Container className={clsx("w-5 h-5", container.state === 'RUNNING' ? "text-green-400" : "text-gray-400")} />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-white text-base leading-tight truncate group-hover:text-blue-400 transition-colors" title={container.name}>
                            {container.name}
                        </h3>
                        <span className={clsx(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-all duration-500",
                            container.state === 'RUNNING' 
                                ? "text-green-400 border-green-500/30 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.1)]" 
                                : "text-gray-400 border-gray-700 bg-gray-800/50"
                        )}>
                            {container.state}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1.5 truncate max-w-[150px]" title={container.image}>
                            <Activity className="w-3.5 h-3.5 text-gray-600" /> {container.image.split(':')[0]}
                        </span>
                        {container.ports && (
                            <span className="flex items-center gap-1.5 truncate max-w-[250px] font-mono text-gray-600" title={container.ports}>
                                <Server className="w-3.5 h-3.5" /> {container.ports}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pr-2">
                    {container.state === 'RUNNING' ? (
                        <>
                            {canManage && (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleAction(container.name, 'stop') }}
                                        disabled={!!actionLoading}
                                        className="p-2 rounded-lg bg-red-500/5 hover:bg-red-500/20 text-red-500/70 hover:text-red-400 border border-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-50"
                                        title="Arrêter"
                                    >
                                        {actionLoading === container.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleAction(container.name, 'restart') }}
                                        className="p-2 rounded-lg bg-blue-500/5 hover:bg-blue-500/20 text-blue-500/70 hover:text-blue-400 border border-blue-500/10 hover:border-blue-500/30 transition-all disabled:opacity-50"
                                        title="Redémarrer"
                                    >
                                        <RotateCw className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowLogsForContainer(container) }}
                                className="p-2 rounded-lg bg-yellow-500/5 hover:bg-yellow-500/20 text-yellow-500/70 hover:text-yellow-400 border border-yellow-500/10 hover:border-yellow-500/30 transition-all disabled:opacity-50"
                                title="Logs"
                            >
                                <FileText className="w-4 h-4" />
                            </button>
                            {canManage && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setTerminalContainer(container) }}
                                    className="p-2 rounded-lg bg-zinc-500/5 hover:bg-zinc-500/20 text-zinc-500/70 hover:text-zinc-400 border border-zinc-500/10 hover:border-zinc-500/30 transition-all disabled:opacity-50"
                                    title="Console"
                                >
                                    <Terminal className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setDetailsContainer(container) }}
                                className="p-2 rounded-lg bg-blue-500/5 hover:bg-blue-500/20 text-blue-500/70 hover:text-blue-400 border border-blue-500/10 hover:border-blue-500/30 transition-all disabled:opacity-50"
                                title="Configuration"
                            >
                                <Box className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        canManage ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleAction(container.name, 'start') }}
                                disabled={!!actionLoading}
                                className="p-2 rounded-lg bg-green-500/5 hover:bg-green-500/20 text-green-500/70 hover:text-green-400 border border-green-500/10 hover:border-green-500/30 transition-all disabled:opacity-50"
                                title="Démarrer"
                            >
                                {actionLoading === container.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>
                        ) : (
                            <span className="text-xs text-gray-500 italic px-2">Arrêté</span>
                        )
                    )}
                </div>
            </div>
        )
    }

    // Grid View (Original Card)
    return (
        <div 
          key={container.id} 
          onClick={() => setStatsContainer(container)}
          className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 hover:bg-gray-800/60 hover:border-gray-500/50 transition-all duration-300 group relative overflow-hidden flex flex-col h-full shadow-lg hover:shadow-blue-500/5 cursor-pointer"
        >
          <div className={clsx(
            "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-opacity duration-500",
            container.state === 'RUNNING' ? "opacity-100" : "opacity-0"
          )} />
          
          <div className="flex justify-between items-start mb-5 relative z-10">
            <div className="flex items-center gap-4">
                <div className={clsx(
                    "w-14 h-14 rounded-xl flex items-center justify-center shadow-2xl overflow-hidden bg-gray-900/90 p-2 transition-transform duration-500 group-hover:scale-110",
                    container.state === 'RUNNING' ? "ring-2 ring-green-500/40 shadow-green-500/10" : "ring-1 ring-gray-700/50"
                )}>
                    {container.icon ? (
                        <img src={container.icon} alt={container.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                        <Container className={clsx("w-7 h-7", container.state === 'RUNNING' ? "text-green-400" : "text-gray-400")} />
                    )}
                </div>
                <div>
                    <h3 className="font-black text-white text-xl leading-tight truncate max-w-[180px] group-hover:text-blue-400 transition-colors" title={container.name}>
                        {container.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className={clsx(
                            "relative flex h-2.5 w-2.5",
                        )}>
                            {container.state === 'RUNNING' && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            )}
                            <span className={clsx(
                                "relative inline-flex rounded-full h-2.5 w-2.5",
                                container.state === 'RUNNING' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-500"
                            )}></span>
                        </span>
                        <span className={clsx(
                            "text-[10px] font-black uppercase tracking-widest",
                            container.state === 'RUNNING' ? "text-green-400" : "text-gray-500"
                        )}>
                            {container.state}
                        </span>
                    </div>
                </div>
            </div>
          </div>

          <div className="space-y-4 relative z-10 flex-grow">
            <div className="flex items-center justify-between text-[13px] py-2.5 border-t border-gray-700/30">
                <span className="text-gray-500 font-medium flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-gray-600" /> Image
                </span>
                <span className="text-gray-300 font-mono truncate max-w-[150px]" title={container.image}>
                    {container.image.split(':')[0]}
                </span>
            </div>
            
            {container.ports && (
                <div className="flex items-center justify-between text-[13px] py-2.5 border-t border-gray-700/30">
                    <span className="text-gray-500 font-medium flex items-center gap-2.5">
                        <Server className="w-4 h-4 text-gray-600" /> Ports
                    </span>
                    <span className="text-gray-400 text-[11px] font-mono bg-gray-900/50 px-2 py-0.5 rounded border border-gray-700/30">
                        {container.ports.length > 20 ? container.ports.substring(0, 20) + '...' : container.ports}
                    </span>
                </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 pt-5 border-t border-gray-700/50 flex gap-2 relative z-10">
             {container.state === 'RUNNING' ? (
                 <div className="flex-1 flex gap-2 relative">
                    {canManage ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleAction(container.name, 'stop') }}
                            disabled={!!actionLoading}
                            className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                        >
                            {actionLoading === container.name ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Square className="w-3.5 h-3.5 fill-current group-hover/btn:scale-110 transition-transform" />
                            )}
                            Arrêter
                        </button>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setDetailsContainer(container) }}
                            className="flex-1 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn"
                        >
                            <Box className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                            Détails
                        </button>
                    )}
                    <button 
                        onClick={(e) => toggleMenu(e, container.name)}
                        className="px-3 rounded-xl bg-gray-700/30 hover:bg-gray-700/50 text-gray-400 hover:text-white border border-gray-700/50 flex items-center justify-center transition-all"
                    >
                        <ChevronDown className={clsx("w-4 h-4 transition-transform", openMenuId === container.name && "rotate-180")} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openMenuId === container.name && (
                        <div 
                            ref={menuRef}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-full right-0 mb-3 w-52 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
                        >
                            {canManage && (
                                <button
                                    onClick={() => handleAction(container.name, 'restart')}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-blue-500/10 hover:text-blue-400 flex items-center gap-3 transition-colors"
                                >
                                    <RotateCw className="w-4 h-4" />
                                    Redémarrer
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setOpenMenuId(null)
                                    setShowLogsForContainer(container)
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-yellow-500/10 hover:text-yellow-400 flex items-center gap-3 border-t border-gray-700/30 transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                Logs en direct
                            </button>
                            {canManage && (
                                <button
                                    onClick={() => {
                                        setOpenMenuId(null)
                                        setTerminalContainer(container)
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-zinc-500/10 hover:text-zinc-400 flex items-center gap-3 border-t border-gray-700/30 transition-colors"
                                >
                                    <Terminal className="w-4 h-4" />
                                    Console
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setOpenMenuId(null)
                                    setDetailsContainer(container)
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-blue-500/10 hover:text-blue-400 flex items-center gap-3 border-t border-gray-700/30 transition-colors"
                            >
                                <Box className="w-4 h-4" />
                                Configuration
                            </button>
                        </div>
                    )}
                 </div>
             ) : (
                canManage ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleAction(container.name, 'start') }}
                        disabled={!!actionLoading}
                        className="flex-1 py-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                        {actionLoading === container.name ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-3.5 h-3.5 fill-current group-hover/btn:scale-110 transition-transform" />
                        )}
                        Démarrer
                    </button>
                ) : (
                    <div className="flex-1 py-2.5 text-center text-xs text-gray-500 italic">Arrêté</div>
                )
             )}
          </div>
        </div>
    )
  }

  // Calculate Stats
  const stats = {
      total: containers.length,
      running: containers.filter(c => c.state === 'RUNNING').length,
      stopped: containers.filter(c => c.state !== 'RUNNING').length,
      groups: groups.length
  }

  // Filter and Group Containers
  const filteredContainers = containers.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.image.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ports && c.ports.includes(searchQuery))
  )

  const groupedContainers = groups.map(group => {
    const groupMembers = group.members.map(m => m.containerName)
    const groupContainers = filteredContainers.filter(c => groupMembers.includes(c.name))
    return { ...group, containers: groupContainers }
  }).filter(g => searchQuery ? g.containers.length > 0 : true)

  const ungroupedContainers = filteredContainers.filter(c => 
    !groups.some(g => g.members.some(m => m.containerName === c.name))
  )

  // Render groups
  if (!canView) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <div className="p-4 bg-red-500/10 rounded-full">
                  <Activity className="w-12 h-12 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">Accès non autorisé</h1>
              <p className="text-gray-400">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          </div>
      )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Stats */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.5)]">
                  <Container className="w-7 h-7 text-blue-400" />
                </div>
                Gestion Docker
              </h1>
              <p className="text-gray-400 mt-2 text-sm font-medium ml-1">Gérez et surveillez vos conteneurs Unraid en temps réel</p>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => fetchContainers(true)} 
                    disabled={refreshing}
                    className="p-3 bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all active:scale-95 disabled:opacity-50"
                    title="Rafraîchir"
                >
                    <RefreshCw className={clsx("w-5 h-5", refreshing && "animate-spin")} />
                </button>
                {canManage && (
                    <button 
                        onClick={() => setShowGroupManager(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                    >
                        <Layers className="w-5 h-5" />
                        <span className="hidden sm:inline">Gérer les Groupes</span>
                    </button>
                )}
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Container className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <div className="text-2xl font-black text-white">{stats.total}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</div>
                </div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                <div className="p-3 bg-green-500/10 rounded-xl">
                    <Play className="w-6 h-6 text-green-400" />
                </div>
                <div>
                    <div className="text-2xl font-black text-white">{stats.running}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">En ligne</div>
                </div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                <div className="p-3 bg-red-500/10 rounded-xl">
                    <Square className="w-6 h-6 text-red-400" />
                </div>
                <div>
                    <div className="text-2xl font-black text-white">{stats.stopped}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Arrêtés</div>
                </div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Layers className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <div className="text-2xl font-black text-white">{stats.groups}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Groupes</div>
                </div>
            </div>
        </div>

        {/* Search & Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-900/40 p-2 rounded-2xl border border-gray-800/50">
            <div className="relative flex-1 w-full sm:w-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Rechercher un conteneur..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all"
                />
            </div>
            <div className="flex bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
                <button
                    onClick={() => handleSetViewMode('grid')}
                    className={clsx(
                        "p-2.5 rounded-lg transition-all duration-200 flex items-center gap-2",
                        viewMode === 'grid' ? "bg-gray-700 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                    )}
                    title="Vue Grille"
                >
                    <LayoutGrid className="w-5 h-5" />
                    {viewMode === 'grid' && <span className="text-xs font-bold pr-1">Grille</span>}
                </button>
                <button
                    onClick={() => handleSetViewMode('list')}
                    className={clsx(
                        "p-2.5 rounded-lg transition-all duration-200 flex items-center gap-2",
                        viewMode === 'list' ? "bg-gray-700 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                    )}
                    title="Vue Liste"
                >
                    <ListIcon className="w-5 h-5" />
                    {viewMode === 'list' && <span className="text-xs font-bold pr-1">Liste</span>}
                </button>
            </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <Activity className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading && !refreshing ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Container className="w-5 h-5 text-blue-500" />
                </div>
            </div>
            <p className="text-gray-500 font-medium animate-pulse">Chargement des conteneurs...</p>
        </div>
      ) : (
        <div className="space-y-10">
            {/* Groups */}
            {groupedContainers.map(group => (
                <div key={group.id} className="space-y-4">
                    <button 
                        onClick={() => toggleGroupCollapse(group.id)}
                        className="w-full flex items-center justify-between group/header"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 shadow-lg group-hover/header:border-blue-500/30 transition-all">
                                <ChevronRight className={clsx(
                                    "w-5 h-5 text-gray-400 group-hover/header:text-blue-400 transition-all duration-300",
                                    !collapsedGroups.includes(group.id) && "rotate-90"
                                )} />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-black text-white group-hover/header:text-blue-400 transition-colors flex items-center gap-2">
                                    {group.name}
                                    <span className="px-2 py-0.5 rounded-md bg-gray-800 text-[10px] text-gray-500 border border-gray-700/50">
                                        {group.containers.length}
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-500 font-medium">Conteneurs groupés</p>
                            </div>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-gray-700/50 to-transparent mx-6 hidden md:block opacity-30 group-hover/header:opacity-60 transition-opacity"></div>
                    </button>

                    {!collapsedGroups.includes(group.id) && (
                        <div className={clsx(
                            "animate-in fade-in slide-in-from-top-2 duration-300",
                            viewMode === 'grid' 
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" 
                                : "space-y-3"
                        )}>
                            {group.containers.map(renderContainerCard)}
                        </div>
                    )}
                </div>
            ))}

            {/* Ungrouped */}
            {ungroupedContainers.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-900/50 border border-gray-800/50 shadow-sm">
                            <Server className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-black text-gray-400">Autres Conteneurs</h2>
                            <p className="text-xs text-gray-600 font-medium">Conteneurs non groupés</p>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-gray-800/50 to-transparent mx-6 hidden md:block opacity-20"></div>
                    </div>
                    
                    <div className={clsx(
                        viewMode === 'grid' 
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" 
                            : "space-y-3"
                    )}>
                        {ungroupedContainers.map(renderContainerCard)}
                    </div>
                </div>
            )}
        </div>
      )}

      {showLogsForContainer && (
        <LogViewer 
            containerId={showLogsForContainer.name} 
            onClose={() => setShowLogsForContainer(null)} 
        />
      )}

      {terminalContainer && (
        <TerminalViewer 
            containerId={terminalContainer.id}
            containerName={terminalContainer.name}
            onClose={() => setTerminalContainer(null)} 
        />
      )}

      {detailsContainer && (
        <ContainerDetails 
            containerId={detailsContainer.id} 
            containerName={detailsContainer.name}
            onClose={() => setDetailsContainer(null)} 
        />
      )}

      {showGroupManager && (
          <GroupManager 
              groups={groups} 
              containers={containers} 
              onClose={() => setShowGroupManager(false)}
              onRefresh={() => {
                  fetchGroups()
              }}
              canManage={canManage}
          />
      )}

      {statsContainer && (
          <ContainerStats 
              container={statsContainer} 
              onClose={() => setStatsContainer(null)} 
          />
      )}
    </div>
  )
}
