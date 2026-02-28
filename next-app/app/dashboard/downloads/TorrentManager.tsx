'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getTorrents, addTorrent, deleteTorrents, pauseTorrents, resumeTorrents, getTags } from './actions'
import { Torrent } from '@/lib/services/qbittorrent'
import { Plus, Trash2, Pause, Play, Download, Upload, FileDown, HardDrive, Search, Users, ArrowUpDown, Tag, X, CheckCircle, Activity, Filter, RotateCcw, Calendar, ChevronRight, SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { ProwlarrSearch } from '@/components/ProwlarrSearch'

export function TorrentManager({ canAdd, canManage, canSearch }: { canAdd: boolean, canManage: boolean, canSearch: boolean }) {
    const [torrents, setTorrents] = useState<Torrent[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [tags, setTags] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [dateFrom, setDateFrom] = useState('')
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [torrentToDelete, setTorrentToDelete] = useState<{hash: string, name: string} | null>(null)
    const [addMode, setAddMode] = useState<'url' | 'file'>('url')
    const [newTorrentUrl, setNewTorrentUrl] = useState('')
    const [torrentFiles, setTorrentFiles] = useState<FileList | null>(null)
    const [selectedTorrents, _setSelectedTorrents] = useState<string[]>([])
    const [refreshInterval, _setRefreshInterval] = useState(2000)
    const [sortBy, setSortBy] = useState<'name' | 'ratio' | 'upspeed' | 'dlspeed' | 'global_speed' | 'added_on' | 'progress' | 'uploaded' | 'size' | 'amount_left' | 'eta' | 'num_seeds' | 'num_leechs' | 'last_activity' | 'completion_on' | 'availability' | 'downloaded' | 'category'>('added_on')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [isSortOpen, setIsSortOpen] = useState(false)
    // Prowlarr Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const fetchTorrents = async () => {
        const data = await getTorrents(filter)
        setTorrents(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchTorrents()
        const interval = setInterval(fetchTorrents, refreshInterval)
        
        // Fetch tags
        const fetchMetadata = async () => {
            const tgs = await getTags()
            setTags(tgs)
        }
        fetchMetadata()

        return () => clearInterval(interval)
    }, [filter, refreshInterval])

    const formatSpeed = (bytes: number) => {
        if (bytes === 0) return '0 Ko/s'
        const k = 1024
        const sizes = ['o/s', 'Ko/s', 'Mo/s', 'Go/s']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Go'
        const k = 1024
        const sizes = ['o', 'Ko', 'Mo', 'Go', 'To']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000)
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: '2-digit'
        })
    }

    const getTrackerName = (tracker: string) => {
        if (!tracker) return 'TORRENT'
        try {
            const url = new URL(tracker)
            const hostname = url.hostname.toLowerCase()
            if (hostname.includes('yggtorrent') || hostname.includes('ygg')) return 'YGG'
            if (hostname.includes('shareisland') || hostname.includes('share')) return 'SHARE'
            if (hostname.includes('torrent-syndikat') || hostname.includes('tos')) return 'TOS'
            if (hostname.includes('ethor')) return 'ETHOR'
            
            // Fallback to domain name without TLD
            const parts = hostname.split('.')
            return parts.length > 1 ? parts[parts.length - 2].toUpperCase() : hostname.toUpperCase()
        } catch (e) {
            return 'TORRENT'
        }
    }

    const formatEta = (seconds: number) => {
        if (seconds === 8640000) return '∞' // qBittorrent returns this for unknown
        if (seconds <= 0) return 'Done'
        
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        
        if (h > 24) return '> 1d'
        if (h > 0) return `${h}h ${m}m`
        return `${m}m ${seconds % 60}s`
    }

    const _getProgressBarColor = (state: string) => {
        const s = state.toLowerCase()
        if (s.includes('error')) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
        if (s.includes('pause')) return 'bg-gray-600'
        if (s.includes('upload') || s.includes('stalledup')) return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
        if (s.includes('download') || s.includes('stalleddl')) return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
        if (s.includes('meta')) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
        return 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
    }

    const handleAddTorrent = async (e: React.FormEvent) => {
        e.preventDefault()
        
        const formData = new FormData()
        
        if (addMode === 'url' && newTorrentUrl) {
            formData.append('urls', newTorrentUrl)
        } else if (addMode === 'file' && torrentFiles && torrentFiles.length > 0) {
            for (let i = 0; i < torrentFiles.length; i++) {
                formData.append('torrents', torrentFiles[i])
            }
        } else {
            return
        }
        
        const res = await addTorrent(formData)
        if (res.success) {
            setNewTorrentUrl('')
            setTorrentFiles(null)
            setIsAddModalOpen(false)
            fetchTorrents()
        } else {
            alert(res.error || 'Failed to add torrent')
        }
    }

    const handleDeleteClick = (torrent: {hash: string, name: string}) => {
        setTorrentToDelete(torrent)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async (deleteFiles: boolean) => {
        if (!torrentToDelete) return
        
        const res = await deleteTorrents([torrentToDelete.hash], deleteFiles)
        if (res.success) {
            fetchTorrents()
            setIsDeleteModalOpen(false)
            setTorrentToDelete(null)
        }
    }

    const handlePause = async (hash: string) => {
        await pauseTorrents([hash])
        fetchTorrents()
    }

    const handleResume = async (hash: string) => {
        await resumeTorrents([hash])
        fetchTorrents()
    }

    const filteredTorrents = Array.isArray(torrents) 
        ? torrents
            .filter(t => {
                const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesTags = selectedTags.length === 0 || 
                    (t.tags && selectedTags.every(tag => t.tags.split(',').map(st => st.trim()).includes(tag)))
                const matchesDate = !dateFrom || (t.added_on * 1000 >= new Date(dateFrom).getTime())
                return matchesSearch && matchesTags && matchesDate
            })
            .sort((a, b) => {
                let comparison = 0
                if (sortBy === 'name') comparison = a.name.localeCompare(b.name)
                else if (sortBy === 'ratio') comparison = a.ratio - b.ratio
                else if (sortBy === 'upspeed') comparison = a.upspeed - b.upspeed
                else if (sortBy === 'dlspeed') comparison = a.dlspeed - b.dlspeed
                else if (sortBy === 'global_speed') comparison = (a.upspeed + a.dlspeed) - (b.upspeed + b.dlspeed)
                else if (sortBy === 'added_on') comparison = a.added_on - b.added_on
                else if (sortBy === 'progress') comparison = a.progress - b.progress
                else if (sortBy === 'uploaded') comparison = a.uploaded - b.uploaded
                else if (sortBy === 'size') comparison = a.size - b.size
                else if (sortBy === 'amount_left') comparison = (a.size - a.downloaded) - (b.size - b.downloaded)
                else if (sortBy === 'eta') comparison = a.eta - b.eta
                else if (sortBy === 'num_seeds') comparison = a.num_seeds - b.num_seeds
                else if (sortBy === 'num_leechs') comparison = a.num_leechs - b.num_leechs
                else if (sortBy === 'last_activity') comparison = a.last_activity - b.last_activity
                else if (sortBy === 'completion_on') comparison = a.completion_on - b.completion_on
                else if (sortBy === 'availability') comparison = a.availability - b.availability
                else if (sortBy === 'downloaded') comparison = a.downloaded - b.downloaded
                else if (sortBy === 'category') comparison = (a.category || '').localeCompare(b.category || '')
                
                return sortOrder === 'asc' ? comparison : -comparison
            })
        : []

    const filters = [
        { id: 'all', label: 'Tous', icon: HardDrive },
        { id: 'downloading', label: 'En cours', icon: Download },
        { id: 'completed', label: 'Terminés', icon: CheckCircle },
        { id: 'paused', label: 'En pause', icon: Pause },
        { id: 'active', label: 'Actifs', icon: Activity },
    ]

    const sortOptions = [
        { id: 'added_on', label: 'Date d\'ajout' },
        { id: 'name', label: 'Nom' },
        { id: 'size', label: 'Taille' },
        { id: 'progress', label: 'Progression' },
        { id: 'amount_left', label: 'Restant' },
        { id: 'eta', label: 'ETA' },
        { id: 'global_speed', label: 'Vitesse globale' },
        { id: 'dlspeed', label: 'Vitesse Down' },
        { id: 'upspeed', label: 'Vitesse Up' },
        { id: 'ratio', label: 'Ratio' },
        { id: 'downloaded', label: 'Total Downloadé' },
        { id: 'uploaded', label: 'Total Uploadé' },
        { id: 'num_seeds', label: 'Seeds' },
        { id: 'num_leechs', label: 'Peers' },
        { id: 'availability', label: 'Disponibilité' },
        { id: 'last_activity', label: 'Dernière activité' },
        { id: 'completion_on', label: 'Date de fin' },
        { id: 'category', label: 'Catégorie' },
    ]

    return (
        <>
        <div className="w-full space-y-6">
            <div className="flex flex-col gap-6">
                {/* Filters & Tools Row */}
                <div className="flex flex-col gap-4 w-full">
                    {/* Status Categories - Scrollable Row */}
                    <div className="w-full overflow-x-auto pb-1 no-scrollbar [&::-webkit-scrollbar]:hidden">
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5 backdrop-blur-md shadow-inner w-max min-w-full sm:min-w-0 sm:w-auto">
                            {filters.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={clsx(
                                        'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2',
                                        filter === f.id 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    )}
                                >
                                    <f.icon className={clsx("w-3.5 h-3.5", filter === f.id ? "text-white" : "text-gray-500 group-hover:text-white")} />
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 w-full">
                        {/* Search */}
                        <div className="relative flex-1 group order-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full pl-11 pr-4 h-11 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all focus:bg-white/10 backdrop-blur-sm"
                            />
                        </div>

                        {/* Controls Row (Sort + Filter) */}
                        <div className="flex gap-2 order-2 md:order-2 w-full md:w-auto">
                            {/* Sort Dropdown */}
                            <div className="relative flex-1 md:flex-none z-30">
                                <div className="flex items-center justify-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 h-11 w-full backdrop-blur-md">
                                    <button 
                                        onClick={() => setIsSortOpen(!isSortOpen)}
                                        className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors px-2"
                                    >
                                        <ArrowUpDown className="h-4 w-4 text-indigo-400" />
                                        <span className="font-semibold truncate max-w-[80px] md:max-w-none">{sortOptions.find(o => o.id === sortBy)?.label}</span>
                                    </button>
                                    <div className="w-[1px] h-4 bg-white/10 mx-1" />
                                    <button 
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-indigo-400 transition-all"
                                    >
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </button>
                                </div>

                                {isSortOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                                        <div className="absolute top-full left-0 mt-2 w-52 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                                            {sortOptions.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => {
                                                        setSortBy(option.id as any)
                                                        setIsSortOpen(false)
                                                    }}
                                                    className={clsx(
                                                        "w-full text-left px-4 py-2.5 text-xs transition-colors",
                                                        sortBy === option.id 
                                                            ? "bg-indigo-600 text-white font-bold" 
                                                            : "text-gray-400 hover:bg-white/10 hover:text-white"
                                                    )}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Advanced Filters Button */}
                            <button 
                                onClick={() => setIsFilterModalOpen(true)}
                                className={clsx(
                                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-11 bg-white/5 backdrop-blur-md border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                    (selectedTags.length > 0 || dateFrom) 
                                        ? "border-indigo-500/50 text-indigo-400 bg-indigo-500/10" 
                                        : "border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Filter className="h-4 w-4" />
                                <span className="hidden sm:inline">Filtres avancés</span>
                                <span className="sm:hidden">Filtres</span>
                                {(selectedTags.length > 0 || dateFrom) && (
                                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-[10px] text-white">
                                        {(selectedTags.length > 0 ? 1 : 0) + (dateFrom ? 1 : 0)}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Actions Row */}
                        <div className="flex gap-2 order-3 md:order-3 w-full md:w-auto">
                            {canSearch && (
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 h-11 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all hover:scale-105 whitespace-nowrap"
                                >
                                    <Search className="h-4 w-4" />
                                    Recherche
                                </button>
                            )}

                            {canAdd && (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 whitespace-nowrap"
                                >
                                    <Plus className="h-4 w-4" />
                                    Ajouter
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Torrent List */}
                <div className="w-full">
                    {loading && torrents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">Chargement...</div>
                    ) : filteredTorrents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            {searchQuery ? 'Aucun torrent trouvé pour cette recherche' : 'Aucun torrent trouvé'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredTorrents.map((torrent) => {
                            const stateDisplay = torrent.state.toLowerCase()
                            const isPaused = stateDisplay.includes('pause')
                            const isError = stateDisplay.includes('error')
                            const isCompleted = torrent.progress === 1
                            const isUploading = stateDisplay.includes('upload') || (isCompleted && !isPaused)
                            
                            return (
                                <div key={torrent.hash} className="bg-black/40 backdrop-blur-md rounded-2xl p-3 border border-white/5 shadow-sm hover:bg-black/60 hover:border-indigo-500/30 transition-all duration-300 group overflow-hidden w-full relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="flex flex-col gap-2 w-full relative z-10">
                                        {/* Top Row: Tracker, Title & Actions/Date */}
                                        <div className="flex justify-between items-center gap-4 w-full">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="shrink-0 flex items-center gap-2">
                                                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg font-bold uppercase tracking-wider text-[10px] shadow-sm shadow-indigo-500/5">
                                                        [{getTrackerName(torrent.tracker)}]
                                                    </span>
                                                    {torrent.tags && torrent.tags.split(',').map(tag => (
                                                        <span key={tag} className="px-2.5 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-lg font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 hover:bg-white/10 transition-colors">
                                                            <Tag className="h-3 w-3" />
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                                <h3 className="font-bold text-gray-100 truncate text-sm leading-tight flex-1 min-w-0 group-hover:text-indigo-300 transition-colors" title={torrent.name}>
                                                    {torrent.name}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className="text-gray-500 text-[11px] whitespace-nowrap hidden lg:inline-block border-r border-white/10 pr-4 mr-1 font-medium">
                                                    Ajouté: <span className="text-gray-300 ml-1">{formatDate(torrent.added_on)}</span>
                                                </span>

                                                <span className={clsx(
                                                    'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all duration-300 shadow-lg hidden xs:inline-block',
                                                    isPaused ? 'bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-gray-500/5' :
                                                    isError ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5' :
                                                    isUploading ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5'
                                                )}>
                                                    {isPaused ? 'PAUSED' : isError ? 'ERROR' : isUploading ? 'SEEDING' : 'DOWNLOADING'}
                                                </span>

                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                    {canManage && (
                                                        <>
                                                            {isPaused ? (
                                                                <button onClick={() => handleResume(torrent.hash)} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-emerald-500/10" title="Resume">
                                                                    <Play className="h-4 w-4 fill-current" />
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handlePause(torrent.hash)} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-amber-500/10" title="Pause">
                                                                    <Pause className="h-4 w-4 fill-current" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => handleDeleteClick(torrent)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-red-500/10" title="Delete">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Row: Stats & Progress Bar */}
                                        <div className="flex flex-col sm:flex-row items-center gap-3 text-xs text-gray-400 w-full px-1">
                                            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold tracking-tight">{formatSize(torrent.downloaded)}</span> 
                                                        <span className="text-emerald-400 text-[10px] font-bold">{formatSpeed(torrent.dlspeed)}</span>
                                                    </div>
                                                </div>
                                                <div className="w-px h-8 bg-white/5" />
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                                        <Upload className="h-3.5 w-3.5 text-blue-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold tracking-tight">{formatSize(torrent.uploaded)}</span> 
                                                        <span className="text-blue-400 text-[10px] font-bold">{formatSpeed(torrent.upspeed)}</span>
                                                    </div>
                                                </div>
                                                <div className="w-px h-8 bg-white/5 hidden lg:block" />
                                                <div className="flex items-center gap-2 hidden lg:flex">
                                                    <div className="p-1.5 bg-purple-500/10 rounded-lg">
                                                        <Users className="h-3.5 w-3.5 text-purple-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold tracking-tight">{torrent.num_seeds} <span className="text-gray-500 text-[10px]">seeders</span></span>
                                                        <span className="text-purple-400 text-[10px] font-bold">{torrent.num_leechs} <span className="text-purple-400/60">leechers</span></span>
                                                    </div>
                                                </div>
                                                <div className="w-px h-8 bg-white/5 hidden md:block" />
                                                <div className="flex flex-col hidden md:flex min-w-[60px]">
                                                    <span className="text-gray-500 text-[10px] uppercase font-black tracking-wider">Ratio</span>
                                                    <span className={clsx(
                                                        "font-black text-sm",
                                                        torrent.ratio >= 2 ? "text-emerald-400" : torrent.ratio >= 1 ? "text-blue-400" : "text-red-400"
                                                    )}>{torrent.ratio.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Progress Bar & Percentage */}
                                            <div className="flex items-center gap-4 flex-1 w-full min-w-0 pl-2 sm:pl-4 border-l border-white/5">
                                                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden relative shadow-inner">
                                                    <div 
                                                        className={clsx(
                                                            "h-full transition-all duration-1000 rounded-full relative overflow-hidden",
                                                            isPaused ? 'bg-gray-600' : 
                                                            isUploading ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 
                                                            'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                                        )}
                                                        style={{ width: `${(torrent.progress * 100).toFixed(1)}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 min-w-[50px]">
                                                    <span className="font-black text-white text-sm tracking-tight">
                                                        {(torrent.progress * 100).toFixed(0)}%
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                        {isCompleted ? 'Terminé' : formatEta(torrent.eta)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>

            {/* Add Torrent Modal */}
        {mounted && isAddModalOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0A0A0A]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in-95 ring-1 ring-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                    <Plus className="w-5 h-5 text-indigo-400" />
                                </div>
                                Ajouter un Torrent
                            </h2>
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Tabs for URL/File */}
                        <div className="flex p-1 bg-black/20 rounded-xl border border-white/5 mb-6">
                            <button
                                onClick={() => setAddMode('url')}
                                className={clsx(
                                    'flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all',
                                    addMode === 'url' 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                )}
                            >
                                Lien Magnet / URL
                            </button>
                            <button
                                onClick={() => setAddMode('file')}
                                className={clsx(
                                    'flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all',
                                    addMode === 'file' 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                )}
                            >
                                Fichier .torrent
                            </button>
                        </div>

                        <form onSubmit={handleAddTorrent} className="space-y-6">
                            {addMode === 'url' ? (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Lien Magnet ou URL</label>
                                    <textarea
                                        value={newTorrentUrl}
                                        onChange={(e) => setNewTorrentUrl(e.target.value)}
                                        placeholder="magnet:?xt=urn:btih:..."
                                        className="w-full h-32 bg-black/20 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all focus:bg-black/40 outline-none text-sm font-mono leading-relaxed"
                                        required
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Fichier .torrent</label>
                                    <div className="flex items-center justify-center w-full">
                                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-white/10 border-dashed rounded-2xl cursor-pointer bg-black/20 hover:bg-white/5 hover:border-indigo-500/30 transition-all group">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:scale-110 transition-transform duration-300">
                                                    <FileDown className="w-6 h-6 text-indigo-400" />
                                                </div>
                                                <p className="mb-2 text-sm text-gray-400">
                                                    <span className="font-bold text-white">Cliquez pour upload</span> ou glissez-déposez
                                                </p>
                                                <p className="text-xs text-gray-500 font-medium">.torrent uniquement</p>
                                                {torrentFiles && torrentFiles.length > 0 && (
                                                    <div className="mt-4 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                                        <p className="text-xs text-indigo-400 font-bold truncate max-w-[200px] flex items-center gap-2">
                                                            <CheckCircle className="w-3 h-3" />
                                                            {torrentFiles[0].name}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <input 
                                                id="dropzone-file" 
                                                type="file" 
                                                className="hidden" 
                                                accept=".torrent"
                                                onChange={(e) => setTorrentFiles(e.target.files)}
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Ajouter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {mounted && isDeleteModalOpen && torrentToDelete && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#0A0A0A]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-md p-8 shadow-2xl ring-1 ring-white/5 space-y-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10 mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            
                            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                                Supprimer le torrent
                            </h3>
                            
                            <p className="text-gray-400 font-medium leading-relaxed">
                                Voulez-vous vraiment supprimer <br/>
                                <span className="text-white font-bold text-base bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 inline-block mt-1">"{torrentToDelete.name}"</span> ?
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => confirmDelete(false)}
                                className="w-full px-4 py-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white rounded-2xl font-bold transition-all flex items-center justify-between group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-xl bg-gray-500/20 text-gray-400 group-hover:text-white group-hover:scale-110 transition-all">
                                        <Trash2 className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold">Torrent uniquement</div>
                                        <div className="text-xs text-gray-500 font-medium">Conserver les fichiers</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                            </button>

                            <button
                                onClick={() => confirmDelete(true)}
                                className="w-full px-4 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-300 rounded-2xl font-bold transition-all flex items-center justify-between group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-xl bg-red-500/20 text-red-500 group-hover:scale-110 transition-all shadow-lg shadow-red-500/10">
                                        <Trash2 className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold">Tout supprimer</div>
                                        <div className="text-xs text-red-500/60 font-medium">Torrent + Fichiers</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-red-500/50 group-hover:text-red-500 transition-colors" />
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setIsDeleteModalOpen(false)
                                setTorrentToDelete(null)
                            }}
                            className="w-full py-3 text-sm font-bold text-gray-500 hover:text-white transition-colors"
                        >
                            Annuler
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Advanced Filters Modal */}
            {mounted && isFilterModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#0A0A0A]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-white/10">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                    <Filter className="h-5 w-5 text-indigo-400" />
                                </div>
                                <h2 className="text-xl font-black text-white tracking-tight">Filtres avancés</h2>
                            </div>
                            <button 
                                onClick={() => setIsFilterModalOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-[2px] text-gray-500">Configuration des filtres</span>
                                <button 
                                    onClick={() => {
                                        setSelectedTags([]);
                                        setDateFrom('');
                                        setSortBy('added_on');
                                    }}
                                    className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Réinitialiser tout
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Sort Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
                                        <ArrowUpDown className="h-4 w-4 text-indigo-400" />
                                        Trier par
                                    </div>
                                    <div className="bg-black/20 border border-white/5 rounded-2xl p-2 h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        {sortOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => setSortBy(option.id as any)}
                                                className={clsx(
                                                    "w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all mb-1",
                                                    sortBy === option.id 
                                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tags Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
                                            <Tag className="h-4 w-4 text-indigo-400" />
                                            Tags
                                        </div>
                                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                                            {selectedTags.length} sélectionné
                                        </span>
                                    </div>
                                    <div className="bg-black/20 border border-white/5 rounded-2xl p-4 h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        <div className="grid grid-cols-1 gap-2">
                                            {tags.map((tag) => (
                                                <button
                                                    key={tag}
                                                    onClick={() => {
                                                        setSelectedTags(prev => 
                                                            prev.includes(tag) 
                                                                ? prev.filter(t => t !== tag) 
                                                                : [...prev, tag]
                                                        )
                                                    }}
                                                    className={clsx(
                                                        "flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all border",
                                                        selectedTags.includes(tag)
                                                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-sm shadow-indigo-500/5"
                                                            : "bg-transparent text-gray-400 border-white/5 hover:border-white/10 hover:bg-white/5 hover:text-white"
                                                    )}
                                                >
                                                    <span className="truncate">{tag}</span>
                                                    <div className={clsx(
                                                        "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                        selectedTags.includes(tag)
                                                            ? "bg-indigo-500 border-indigo-500"
                                                            : "border-white/20"
                                                    )}>
                                                        {selectedTags.includes(tag) && <CheckCircle className="h-3 w-3 text-white" />}
                                                    </div>
                                                </button>
                                            ))}
                                            {tags.length === 0 && (
                                                <div className="text-center py-12 text-gray-500 text-xs italic flex flex-col items-center gap-2">
                                                    <Tag className="w-8 h-8 opacity-20" />
                                                    Aucun tag disponible
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Period Section */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
                                            <Calendar className="h-4 w-4 text-indigo-400" />
                                            Période
                                        </div>
                                        <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">À partir de</label>
                                                <div className="relative">
                                                    <input 
                                                        type="date" 
                                                        value={dateFrom}
                                                        onChange={(e) => setDateFrom(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all [color-scheme:dark]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 flex justify-end bg-white/5">
                            <button 
                                onClick={() => setIsFilterModalOpen(false)}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                            >
                                Voir les résultats
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Search Modal */}
            {mounted && isSearchOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-[#0A0A0A]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 ring-1 ring-white/10">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-xl z-10 rounded-t-3xl">
                            <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                                <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                    <Search className="w-5 h-5 text-purple-400" />
                                </div>
                                Recherche Interactive
                            </h2>
                            <button 
                                onClick={() => setIsSearchOpen(false)}
                                className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            <ProwlarrSearch title="" canManage={true} />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
        </>
    )
}
