
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Container, Play, Square, RefreshCw, Server, Activity, Loader2, RotateCw, FileText, ChevronDown, ChevronRight, LayoutGrid, List as ListIcon, Layers, Search, Terminal, Settings as SettingsIcon } from 'lucide-react'
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

import { useAbility } from '@casl/react'
import { AbilityContext } from '@/components/AbilityContext'

export default function DockerPage() {
  const { data: session } = useSession()
  const ability = useAbility(AbilityContext)
  
  const canView = ability.can('read', 'Docker')
  const canReadDetails = ability.can('read_details', 'Docker')
  const canReadLogs = ability.can('read_logs', 'Docker')
  const canReadStats = ability.can('read_stats', 'Docker')
  const canManageState = ability.can('manage_state', 'Docker')
  const canAccessConsole = ability.can('access_console', 'Docker')
  const canManageGroups = ability.can('manage_groups', 'Docker')
  // Legacy mapping for ease of refactor
  const canManageContainers = canManageState



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
  const [draggedContainerId, setDraggedContainerId] = useState<string | null>(null)
  
  // Auto-scroll refs
  const scrollAnimRef = useRef<number | null>(null)
  const mouseYRef = useRef<number>(0)

  // Auto-scroll logic
  useEffect(() => {
    if (!draggedContainerId) {
        if (scrollAnimRef.current) {
            cancelAnimationFrame(scrollAnimRef.current)
            scrollAnimRef.current = null
        }
        return
    }

    const handleWindowDragOver = (e: DragEvent) => {
        e.preventDefault()
        mouseYRef.current = e.clientY
    }

    window.addEventListener('dragover', handleWindowDragOver)

    const scrollLoop = () => {
        const SCROLL_ZONE = 100 // pixels from top/bottom to trigger scroll
        const BASE_SPEED = 5
        const MAX_SPEED = 25
        
        const y = mouseYRef.current
        const windowHeight = window.innerHeight

        if (y < SCROLL_ZONE && y > 0) { // Scroll Up
            const intensity = 1 - (y / SCROLL_ZONE) // 0 to 1
            const speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * intensity
            window.scrollBy(0, -speed)
        } else if (y > windowHeight - SCROLL_ZONE && y < windowHeight) { // Scroll Down
            const intensity = (y - (windowHeight - SCROLL_ZONE)) / SCROLL_ZONE // 0 to 1
            const speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * intensity
            window.scrollBy(0, speed)
        }

        scrollAnimRef.current = requestAnimationFrame(scrollLoop)
    }

    scrollAnimRef.current = requestAnimationFrame(scrollLoop)

    return () => {
        window.removeEventListener('dragover', handleWindowDragOver)
        if (scrollAnimRef.current) {
            cancelAnimationFrame(scrollAnimRef.current)
            scrollAnimRef.current = null
        }
    }
  }, [draggedContainerId])

  const handleDragStart = (e: React.DragEvent, containerId: string) => {
    e.dataTransfer.setData('text/plain', containerId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedContainerId(containerId)
  }

  const handleDragEnd = () => {
    setDraggedContainerId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnGroup = async (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault()
    const containerId = draggedContainerId || e.dataTransfer.getData('text/plain')
    setDraggedContainerId(null)

    if (!containerId) return

    const container = containers.find(c => c.id === containerId)
    if (!container) return
    const containerName = container.name

    // Find source group
    const sourceGroup = groups.find(g => g.members.some(m => m.containerName === containerName))
    
    // If dropped on same group, do nothing
    if (sourceGroup && sourceGroup.id === targetGroupId) return
    if (!sourceGroup && targetGroupId === 'ungrouped') return

    // Optimistic update
    const newGroups = groups.map(g => {
        // Remove from source if exists
        if (sourceGroup && g.id === sourceGroup.id) {
            return { ...g, members: g.members.filter(m => m.containerName !== containerName) }
        }
        // Add to target
        if (g.id === targetGroupId) {
            return { ...g, members: [...g.members, { containerName }] }
        }
        return g
    })
    setGroups(newGroups)

    try {
        // API Calls
        // 1. If source group exists, remove member
        if (sourceGroup) {
            const newSourceMembers = sourceGroup.members.filter(m => m.containerName !== containerName).map(m => m.containerName)
            await fetch(`/api/docker/groups/${sourceGroup.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ members: newSourceMembers })
            })
        }

        // 2. If target group is not 'ungrouped', add member
        if (targetGroupId !== 'ungrouped') {
            const targetGroup = groups.find(g => g.id === targetGroupId)
            const currentMembers = targetGroup ? targetGroup.members.map(m => m.containerName) : []
            // Avoid duplicates just in case
            const newTargetMembers = Array.from(new Set([...currentMembers, containerName]))
            
            await fetch(`/api/docker/groups/${targetGroupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ members: newTargetMembers })
            })
        }
        
        // Refresh groups to ensure consistency
        fetchGroups()
    } catch (error) {
        console.error("Error moving container", error)
        fetchGroups() // Revert on error
    }
  }
  
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

          if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.error || 'Action failed')
          }
          
          // Refresh list after action
          // Wait a moment for Docker to update state (frontend side double-check)
          await new Promise(resolve => setTimeout(resolve, 500))
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
              draggable
              onDragStart={(e) => handleDragStart(e, container.id)}
              onDragEnd={handleDragEnd}
              onClick={() => canReadStats && setStatsContainer(container)}
              className={clsx(
                "bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-4 hover:bg-white/[0.03] hover:border-indigo-500/30 transition-all duration-300 flex items-center gap-5 group relative overflow-hidden cursor-pointer cursor-grab active:cursor-grabbing hover:shadow-2xl hover:shadow-indigo-500/10",
                draggedContainerId === container.id && "opacity-50",
                !canReadStats && "cursor-default"
              )}
            >
                <div className={clsx(
                    "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                    container.state === 'RUNNING' ? "bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-white/10"
                )} />

                <div className={clsx(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-black/40 p-2.5 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 border border-white/5",
                    container.state === 'RUNNING' ? "ring-1 ring-emerald-500/30 shadow-emerald-500/10" : "ring-1 ring-white/10"
                )}>
                    {container.icon ? (
                        <img src={container.icon} alt={container.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                        <Container className={clsx("w-7 h-7", container.state === 'RUNNING' ? "text-emerald-400" : "text-gray-400")} />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-white text-lg leading-tight truncate group-hover:text-indigo-400 transition-colors" title={container.name}>
                            {container.name}
                        </h3>
                        <span className={clsx(
                            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all duration-500 flex items-center gap-1.5",
                            container.state === 'RUNNING' 
                                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                                : "text-gray-400 border-white/5 bg-white/5"
                        )}>
                            <div className={clsx("w-1.5 h-1.5 rounded-full", container.state === 'RUNNING' ? "bg-emerald-400 animate-pulse" : "bg-gray-500")} />
                            {container.state}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5">
                        <span className="flex items-center gap-1.5 truncate max-w-[200px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5" title={container.image}>
                            <Activity className="w-3.5 h-3.5 text-indigo-400" /> {container.image.split(':')[0]}
                        </span>
                        {container.ports && (
                            <span className="flex items-center gap-1.5 truncate max-w-[300px] font-mono text-gray-400 px-2 py-0.5 rounded-md bg-white/5 border border-white/5" title={container.ports}>
                                <Server className="w-3.5 h-3.5" /> {container.ports}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                    {container.state === 'RUNNING' ? (
                        <>
                            {canManageContainers && (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleAction(container.id, 'stop') }}
                                        disabled={!!actionLoading}
                                        className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-500/10"
                                        title="Arrêter"
                                    >
                                        {actionLoading === container.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleAction(container.id, 'restart') }}
                                        className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 hover:text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-indigo-500/10"
                                        title="Redémarrer"
                                    >
                                        <RotateCw className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            {canReadLogs && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowLogsForContainer(container) }}
                                    className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 hover:border-amber-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-amber-500/10"
                                    title="Logs"
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                            )}
                            {canAccessConsole && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setTerminalContainer(container) }}
                                    className="p-2.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400 hover:text-zinc-200 border border-zinc-500/20 hover:border-zinc-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-zinc-500/10"
                                    title="Console"
                                >
                                    <Terminal className="w-4 h-4" />
                                </button>
                            )}
                            {canReadDetails && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setDetailsContainer(container) }}
                                    className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 hover:text-blue-400 border border-blue-500/20 hover:border-blue-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-500/10"
                                    title="Configuration"
                                >
                                    <Box className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    ) : (
                        canManageContainers ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleAction(container.id, 'start') }}
                                disabled={!!actionLoading}
                                className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-emerald-500/10"
                                title="Démarrer"
                            >
                                {actionLoading === container.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>
                        ) : (
                            <span className="text-xs text-gray-500 italic px-2 font-medium">Arrêté</span>
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
          draggable={canManageGroups}
          onDragStart={(e) => handleDragStart(e, container.id)}
          onDragEnd={handleDragEnd}
          onClick={() => canReadStats && setStatsContainer(container)}
          className={clsx(
            "bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:bg-white/[0.03] hover:border-indigo-500/30 transition-all duration-300 group relative flex flex-col h-full shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 cursor-pointer cursor-grab active:cursor-grabbing hover:z-30",
            draggedContainerId === container.id && "opacity-50",
            !canReadStats && "cursor-default"
          )}
        >
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className={clsx(
                "absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-all duration-500 blur-2xl opacity-0 group-hover:opacity-100",
                container.state === 'RUNNING' ? "opacity-100 scale-110" : "opacity-0 scale-100"
              )} />
          </div>
          
          <div className="flex justify-between items-start mb-5 relative z-20">
            <div className="flex items-center gap-4">
                <div className={clsx(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-gray-950/50 p-2.5 transition-transform duration-300 group-hover:scale-105 border border-white/5",
                    container.state === 'RUNNING' ? "ring-1 ring-emerald-500/30 shadow-emerald-500/20" : "ring-1 ring-gray-700/30"
                )}>
                    {container.icon ? (
                        <img src={container.icon} alt={container.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                        <Container className={clsx("w-7 h-7", container.state === 'RUNNING' ? "text-emerald-400" : "text-gray-400")} />
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg leading-tight truncate max-w-[180px] group-hover:text-indigo-400 transition-colors" title={container.name}>
                        {container.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={clsx(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all duration-500",
                            container.state === 'RUNNING' 
                                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                                : "text-gray-400 border-gray-700 bg-gray-800/50"
                        )}>
                            {container.state}
                        </span>
                    </div>
                </div>
            </div>

            {/* Actions Menu */}
            {canManageContainers && (
                <div className="relative">
                     <button 
                        onClick={(e) => toggleMenu(e, container.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                    
                    {openMenuId === container.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-950 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                            <div className="p-1 space-y-0.5">
                                {container.state === 'RUNNING' ? (
                                    <>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAction(container.name, 'restart') }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-indigo-500/20 rounded-xl transition-colors"
                                        >
                                            <RotateCw className="w-4 h-4 text-indigo-400" /> Redémarrer
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAction(container.name, 'stop') }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors"
                                        >
                                            <Square className="w-4 h-4 text-red-400 fill-current" /> Arrêter
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleAction(container.name, 'start') }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-emerald-500/20 rounded-xl transition-colors"
                                    >
                                        <Play className="w-4 h-4 text-emerald-400 fill-current" /> Démarrer
                                    </button>
                                )}
                                
                                {(canReadLogs || canAccessConsole || canReadDetails) && <div className="h-px bg-white/5 my-1" />}
                                
                                {canReadLogs && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setShowLogsForContainer(container) }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-amber-500/20 rounded-xl transition-colors"
                                    >
                                        <FileText className="w-4 h-4 text-amber-400" /> Logs
                                    </button>
                                )}
                                {canAccessConsole && container.state === 'RUNNING' && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setTerminalContainer(container) }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-zinc-500/20 rounded-xl transition-colors"
                                    >
                                        <Terminal className="w-4 h-4 text-zinc-400" /> Console
                                    </button>
                                )}
                                {canReadDetails && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setDetailsContainer(container) }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-500/20 rounded-xl transition-colors"
                                    >
                                        <Box className="w-4 h-4 text-blue-400" /> Configuration
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
          </div>
          
          <div className="flex-1 space-y-3 relative z-10">
              <div className="p-3 rounded-xl bg-gray-950/30 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Image</span>
                      <span className="text-gray-300 font-mono truncate max-w-[150px]" title={container.image}>
                          {container.image.split(':')[0]}
                      </span>
                  </div>
                  {container.ports && (
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Ports</span>
                        <span className="text-gray-300 font-mono truncate max-w-[150px]" title={container.ports}>
                            {container.ports}
                        </span>
                    </div>
                  )}
              </div>
          </div>
          
          {/* Quick Actions (Hover) */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="flex items-center gap-2">
                    {container.state === 'RUNNING' && canReadLogs && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowLogsForContainer(container) }}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                            title="Logs Rapides"
                        >
                            <FileText className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {container.state === 'RUNNING' && canAccessConsole && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setTerminalContainer(container) }}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                            title="Console Rapide"
                        >
                            <Terminal className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                
                {container.state === 'RUNNING' ? (
                     <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Opérationnel
                     </span>
                ) : (
                    <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                        Stoppé
                     </span>
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
                <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]">
                  <Container className="w-7 h-7 text-indigo-400" />
                </div>
                Gestion Docker
              </h1>
              <p className="text-gray-400 mt-2 text-sm font-medium ml-1">Gérez et surveillez vos conteneurs Unraid en temps réel</p>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => fetchContainers(true)} 
                    disabled={refreshing}
                    className="p-3 bg-gray-900/50 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-white/5 hover:border-white/10 transition-all active:scale-95 disabled:opacity-50"
                    title="Rafraîchir"
                >
                    <RefreshCw className={clsx("w-5 h-5", refreshing && "animate-spin")} />
                </button>
                {canManageGroups && (
                    <button 
                        onClick={() => setShowGroupManager(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                    >
                        <Layers className="w-5 h-5" />
                        <span className="hidden sm:inline">Gérer les Groupes</span>
                    </button>
                )}
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex items-center gap-5 hover:bg-white/[0.03] transition-colors group hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="p-3.5 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-indigo-500/10 relative z-10 shadow-lg shadow-indigo-500/5">
                    <Container className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="relative z-10">
                    <div className="text-3xl font-black text-white tracking-tight group-hover:text-indigo-200 transition-colors">{stats.total}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Total</div>
                </div>
            </div>
            <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex items-center gap-5 hover:bg-white/[0.03] transition-colors group hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="p-3.5 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-emerald-500/10 relative z-10 shadow-lg shadow-emerald-500/5">
                    <Play className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="relative z-10">
                    <div className="text-3xl font-black text-white tracking-tight group-hover:text-emerald-200 transition-colors">{stats.running}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">En ligne</div>
                </div>
            </div>
            <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex items-center gap-5 hover:bg-white/[0.03] transition-colors group hover:shadow-2xl hover:shadow-rose-500/10 hover:-translate-y-1 duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="p-3.5 bg-rose-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-rose-500/10 relative z-10 shadow-lg shadow-rose-500/5">
                    <Square className="w-6 h-6 text-rose-400" />
                </div>
                <div className="relative z-10">
                    <div className="text-3xl font-black text-white tracking-tight group-hover:text-rose-200 transition-colors">{stats.stopped}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Arrêtés</div>
                </div>
            </div>
            <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex items-center gap-5 hover:bg-white/[0.03] transition-colors group hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1 duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="p-3.5 bg-violet-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-violet-500/10 relative z-10 shadow-lg shadow-violet-500/5">
                    <Layers className="w-6 h-6 text-violet-400" />
                </div>
                <div className="relative z-10">
                    <div className="text-3xl font-black text-white tracking-tight group-hover:text-violet-200 transition-colors">{stats.groups}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Groupes</div>
                </div>
            </div>
        </div>

        {/* Search & Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/20 backdrop-blur-md p-2 rounded-3xl border border-white/5 shadow-2xl shadow-black/20">
            <div className="relative flex-1 w-full sm:w-auto group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 rounded-xl border border-white/5 group-focus-within:border-indigo-500/30 group-focus-within:bg-indigo-500/10 transition-all duration-300">
                    <Search className="w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input 
                    type="text" 
                    placeholder="Rechercher un conteneur..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 rounded-2xl pl-14 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/20 transition-all font-medium"
                />
            </div>
            <div className="flex bg-black/20 rounded-2xl p-1.5 border border-white/5">
                <button
                    onClick={() => handleSetViewMode('grid')}
                    className={clsx(
                        "px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2.5 font-bold text-sm",
                        viewMode === 'grid' 
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10" 
                            : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                    )}
                    title="Vue Grille"
                >
                    <LayoutGrid className="w-4 h-4" />
                    {viewMode === 'grid' && <span className="pr-1">Grille</span>}
                </button>
                <button
                    onClick={() => handleSetViewMode('list')}
                    className={clsx(
                        "px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2.5 font-bold text-sm",
                        viewMode === 'list' 
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10" 
                            : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                    )}
                    title="Vue Liste"
                >
                    <ListIcon className="w-4 h-4" />
                    {viewMode === 'list' && <span className="pr-1">Liste</span>}
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
                <div 
                    key={group.id} 
                    className={clsx(
                        "space-y-4 p-4 -m-2 rounded-3xl transition-all duration-300 border",
                        draggedContainerId 
                            ? "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] scale-[1.01]" 
                            : "border-transparent hover:border-white/5 hover:bg-white/[0.02]"
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnGroup(e, group.id)}
                >
                    <button 
                        onClick={() => toggleGroupCollapse(group.id)}
                        className="w-full flex items-center justify-between group/header"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-black/40 border border-white/5 shadow-lg group-hover/header:border-indigo-500/30 group-hover/header:shadow-indigo-500/10 transition-all duration-300 backdrop-blur-md">
                                <ChevronRight className={clsx(
                                    "w-5 h-5 text-gray-500 group-hover/header:text-indigo-400 transition-all duration-300",
                                    !collapsedGroups.includes(group.id) && "rotate-90"
                                )} />
                            </div>
                            <div className="text-left">
                                <h2 className="text-xl font-black text-white group-hover/header:text-indigo-400 transition-colors flex items-center gap-3">
                                    {group.name}
                                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-gray-400 border border-white/5 font-bold backdrop-blur-md">
                                        {group.containers.length}
                                    </span>
                                </h2>
                                <p className="text-sm text-gray-500 font-medium mt-0.5">Conteneurs groupés</p>
                            </div>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent mx-8 hidden md:block opacity-30 group-hover/header:opacity-100 transition-opacity duration-500"></div>
                    </button>

                    {!collapsedGroups.includes(group.id) && (
                        <div className={clsx(
                            "animate-in fade-in slide-in-from-top-2 duration-300 pt-2",
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
                <div 
                    className={clsx(
                        "space-y-4 p-4 -m-2 rounded-3xl transition-all duration-300 border",
                        draggedContainerId
                            ? "border-gray-500/30 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-500/50 hover:shadow-[0_0_20px_rgba(107,114,128,0.1)] scale-[1.01]"
                            : "border-transparent hover:border-white/5 hover:bg-white/[0.02]"
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnGroup(e, 'ungrouped')}
                >
                    <div className="flex items-center gap-4 px-2">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-black/40 border border-white/5 shadow-lg backdrop-blur-md">
                            <Server className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl font-black text-gray-400">Autres Conteneurs</h2>
                            <p className="text-sm text-gray-600 font-medium mt-0.5">Conteneurs non groupés</p>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent mx-8 hidden md:block opacity-50"></div>
                    </div>
                    
                    <div className={clsx(
                        "pt-2",
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
            canReadDetails={canReadDetails}
        />
      )}

      {terminalContainer && (
        <TerminalViewer 
            containerId={terminalContainer.id}
            containerName={terminalContainer.name}
            onClose={() => setTerminalContainer(null)} 
            canManageContainers={canManageContainers}
        />
      )}

      {detailsContainer && (
        <ContainerDetails 
            containerId={detailsContainer.id} 
            containerName={detailsContainer.name}
            onClose={() => setDetailsContainer(null)} 
            canReadDetails={canReadDetails}
        />
      )}

      {showGroupManager && (
          <GroupManager 
              groups={groups} 
              onClose={() => setShowGroupManager(false)}
              onRefresh={() => {
                  fetchGroups()
              }}
              canManage={canManageGroups}
          />
      )}

      {statsContainer && (
          <ContainerStats 
              container={statsContainer} 
              onClose={() => setStatsContainer(null)} 
              canReadDetails={canReadDetails}
          />
      )}
    </div>
  )
}
