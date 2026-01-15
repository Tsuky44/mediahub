'use client'

import { useState, useEffect } from 'react'
import { getTorrents, addTorrent, deleteTorrents, pauseTorrents, resumeTorrents, getTags } from './actions'
import { Torrent } from '@/lib/services/qbittorrent'
import { Plus, Trash2, Pause, Play, Download, Upload, Clock, FileDown, HardDrive, Search, Users, ArrowUpDown, Tag, X, CheckCircle, Activity, Filter, RotateCcw, Calendar } from 'lucide-react'
import clsx from 'clsx'

export function TorrentManager() {
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
    const [selectedTorrents, setSelectedTorrents] = useState<string[]>([])
    const [refreshInterval, setRefreshInterval] = useState(2000)
    const [sortBy, setSortBy] = useState<'name' | 'ratio' | 'upspeed' | 'dlspeed' | 'global_speed' | 'added_on' | 'progress' | 'uploaded' | 'size' | 'amount_left' | 'eta' | 'num_seeds' | 'num_leechs' | 'last_activity' | 'completion_on' | 'availability' | 'downloaded' | 'category'>('added_on')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [isSortOpen, setIsSortOpen] = useState(false)

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

    const getProgressBarColor = (state: string) => {
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
            alert('Failed to add torrent')
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
        <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-white">Gestion des fichiers</h1>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all">
                        <Activity className="h-4 w-4" />
                        qBittorrent
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {/* Filters & Tools Row */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Status Categories - Horizontal Row */}
                    <div className="flex items-center gap-1 bg-[#111827]/40 border border-gray-800/60 rounded-xl p-1">
                        {filters.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={clsx(
                                    'px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                                    filter === f.id 
                                        ? 'bg-indigo-600 text-white shadow-lg' 
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher..."
                            className="w-full pl-10 pr-4 py-2 bg-[#111827]/40 border border-gray-800/60 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 outline-none transition-all"
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <div className="flex items-center gap-1 bg-[#111827]/40 border border-gray-800/60 rounded-xl px-2 py-1.5 h-full">
                            <button 
                                onClick={() => setIsSortOpen(!isSortOpen)}
                                className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors px-2"
                            >
                                <ArrowUpDown className="h-4 w-4 text-indigo-400" />
                                <span className="font-semibold">{sortOptions.find(o => o.id === sortBy)?.label}</span>
                            </button>
                            <div className="w-[1px] h-4 bg-gray-800/60 mx-1" />
                            <button 
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-1 hover:bg-gray-800/40 rounded-lg text-gray-400 hover:text-indigo-400 transition-all"
                            >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>

                        {isSortOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                                <div className="absolute top-full left-0 mt-2 w-52 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl z-20 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
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
                                                    : "text-gray-400 hover:bg-gray-800/40 hover:text-white"
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
                            "flex items-center gap-2 px-4 py-2 bg-[#111827]/40 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                            (selectedTags.length > 0 || dateFrom) 
                                ? "border-indigo-500/50 text-indigo-400 bg-indigo-500/5" 
                                : "border-gray-800/60 text-gray-400 hover:text-white"
                        )}
                    >
                        <Filter className="h-4 w-4" />
                        Filtres avancés
                        {(selectedTags.length > 0 || dateFrom) && (
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-[10px] text-white">
                                {(selectedTags.length > 0 ? 1 : 0) + (dateFrom ? 1 : 0)}
                            </span>
                        )}
                    </button>

                    <div className="flex-1" />

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Ajouter Torrent
                    </button>
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
                            const isDownloading = stateDisplay.includes('download') || stateDisplay.includes('meta')
                            
                            return (
                                <div key={torrent.hash} className="bg-[#111827]/80 rounded-xl p-3 border border-gray-800/40 shadow-sm hover:border-gray-700/60 transition-all group overflow-hidden w-full">
                                    <div className="flex flex-col gap-3 w-full">
                                        {/* Top Row: Tracker, Title & Actions/Date */}
                                        <div className="flex justify-between items-center gap-3 w-full">
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <div className="shrink-0">
                                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
                                                        [{getTrackerName(torrent.tracker)}]
                                                    </span>
                                                    {torrent.tags && torrent.tags.split(',').map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-md font-bold uppercase tracking-wider text-[9px] sm:text-[10px] flex items-center gap-1">
                                                            <Tag className="h-2.5 w-2.5" />
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                                <h3 className="font-semibold text-gray-100 truncate text-sm sm:text-[15px] leading-tight flex-1 min-w-0" title={torrent.name}>
                                                    {torrent.name}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-gray-500 text-[10px] whitespace-nowrap hidden lg:inline-block border-r border-gray-800 pr-2.5 mr-0.5">
                                                    Ajouté: <span className="text-gray-400 font-medium">{formatDate(torrent.added_on)}</span>
                                                </span>

                                                <span className={clsx(
                                                    'px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-colors hidden xs:inline-block',
                                                    isPaused ? 'bg-gray-800/50 text-gray-500 border-gray-700/50' :
                                                    isError ? 'bg-red-900/20 text-red-500 border-red-900/30' :
                                                    isUploading ? 'bg-green-900/20 text-green-500 border-green-900/30' :
                                                    'bg-blue-900/20 text-blue-500 border-blue-900/30'
                                                )}>
                                                    {isPaused ? 'PAUSED' : isError ? 'ERROR' : isUploading ? 'SEEDING' : 'DOWNLOADING'}
                                                </span>

                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    {isPaused ? (
                                                        <button onClick={() => handleResume(torrent.hash)} className="p-1.5 bg-gray-800/50 hover:bg-green-900/30 text-gray-400 hover:text-green-400 rounded-md transition-all" title="Resume">
                                                            <Play className="h-3.5 w-3.5" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handlePause(torrent.hash)} className="p-1.5 bg-gray-800/50 hover:bg-yellow-900/30 text-gray-400 hover:text-yellow-400 rounded-md transition-all" title="Pause">
                                                            <Pause className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteClick(torrent)} className="p-1.5 bg-gray-800/50 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-md transition-all" title="Delete">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Row: Stats & Progress Bar */}
                                        <div className="flex flex-col sm:flex-row items-center gap-3 text-[11px] text-gray-400 w-full">
                                            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto shrink-0">
                                                <div className="flex items-center gap-1.5">
                                                    <Download className="h-3.5 w-3.5 text-green-500/80" />
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-100 font-bold">{formatSize(torrent.downloaded)}</span> 
                                                        <span className="text-gray-500 text-[9px] font-medium">{formatSpeed(torrent.dlspeed)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Upload className="h-3.5 w-3.5 text-blue-500/80" />
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-100 font-bold">{formatSize(torrent.uploaded)}</span> 
                                                        <span className="text-gray-500 text-[9px] font-medium">{formatSpeed(torrent.upspeed)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 hidden lg:flex">
                                                    <Users className="h-3.5 w-3.5 text-gray-500" />
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-100 font-bold">{torrent.num_seeds} s</span>
                                                        <span className="text-gray-500 text-[9px] font-medium">{torrent.num_leechs} l</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col hidden md:flex">
                                                    <span className="text-gray-500 text-[9px] uppercase font-bold tracking-tighter">Ratio</span>
                                                    <span className={clsx(
                                                        "font-bold text-xs",
                                                        torrent.ratio >= 2 ? "text-green-500" : torrent.ratio >= 1 ? "text-blue-400" : "text-red-500"
                                                    )}>{torrent.ratio.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Progress Bar & Percentage */}
                                            <div className="flex items-center gap-3 flex-1 w-full min-w-0">
                                                <div className="flex-1 bg-gray-800/50 rounded-full h-1.5 overflow-hidden border border-white/5">
                                                    <div 
                                                        className={clsx(
                                                            "h-full transition-all duration-700 rounded-full",
                                                            isPaused ? 'bg-gray-600' : 
                                                            isUploading ? 'bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 
                                                            'bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                                                        )}
                                                        style={{ width: `${(torrent.progress * 100).toFixed(1)}%` }}
                                                    />
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="font-bold text-white text-xs">
                                                        {(torrent.progress * 100).toFixed(0)}%
                                                    </span>
                                                    <span className="text-[9px] text-gray-500 font-medium uppercase tracking-tighter">
                                                        {isCompleted ? 'OK' : formatEta(torrent.eta)}
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
        {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-4">Ajouter un Torrent</h2>
                        
                        {/* Tabs for URL/File */}
                        <div className="flex space-x-4 mb-4 border-b border-gray-700 pb-2">
                            <button
                                onClick={() => setAddMode('url')}
                                className={clsx(
                                    'text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors',
                                    addMode === 'url' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
                                )}
                            >
                                Lien Magnet / URL
                            </button>
                            <button
                                onClick={() => setAddMode('file')}
                                className={clsx(
                                    'text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors',
                                    addMode === 'file' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
                                )}
                            >
                                Fichier .torrent
                            </button>
                        </div>

                        <form onSubmit={handleAddTorrent} className="space-y-4">
                            {addMode === 'url' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Lien Magnet ou URL</label>
                                    <textarea
                                        value={newTorrentUrl}
                                        onChange={(e) => setNewTorrentUrl(e.target.value)}
                                        placeholder="magnet:?xt=urn:btih:..."
                                        className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                        required
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Fichier .torrent</label>
                                    <div className="flex items-center justify-center w-full">
                                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-750 transition-colors">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <FileDown className="w-8 h-8 mb-3 text-gray-400" />
                                                <p className="mb-2 text-sm text-gray-400">
                                                    <span className="font-semibold">Cliquez pour upload</span>
                                                </p>
                                                <p className="text-xs text-gray-500">.torrent uniquement</p>
                                                {torrentFiles && torrentFiles.length > 0 && (
                                                    <p className="mt-2 text-sm text-indigo-400 font-medium truncate max-w-[200px]">
                                                        {torrentFiles[0].name}
                                                    </p>
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
                                    className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg transition-colors"
                                >
                                    Ajouter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && torrentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-2">Supprimer le torrent</h2>
                        <p className="text-gray-400 mb-6">
                            Voulez-vous supprimer <span className="text-white font-medium">"{torrentToDelete.name}"</span> ?
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => confirmDelete(false)}
                                className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Supprimer le torrent uniquement
                            </button>
                            
                            <button
                                onClick={() => confirmDelete(true)}
                                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <HardDrive className="h-4 w-4" />
                                Supprimer torrent + fichiers
                            </button>
                            
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false)
                                    setTorrentToDelete(null)
                                }}
                                className="w-full px-4 py-2 text-gray-400 hover:text-white mt-2"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Advanced Filters Modal */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#0f172a] rounded-[24px] border border-gray-800/60 w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-800/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <Filter className="h-5 w-5 text-indigo-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Filtres avancés</h2>
                            </div>
                            <button 
                                onClick={() => setIsFilterModalOpen(false)}
                                className="p-2 hover:bg-gray-800/60 rounded-full text-gray-500 hover:text-white transition-all"
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
                                    className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
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
                                    <div className="bg-[#1e293b]/40 border border-gray-800/40 rounded-2xl p-2 h-[320px] overflow-y-auto scrollbar-none">
                                        {sortOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => setSortBy(option.id as any)}
                                                className={clsx(
                                                    "w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all mb-1",
                                                    sortBy === option.id 
                                                        ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" 
                                                        : "text-gray-400 hover:bg-gray-800/40 hover:text-gray-200 border border-transparent"
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
                                    <div className="bg-[#1e293b]/40 border border-gray-800/40 rounded-2xl p-4 h-[320px] overflow-y-auto scrollbar-none">
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
                                                        "flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-all border",
                                                        selectedTags.includes(tag)
                                                            ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20"
                                                            : "bg-transparent text-gray-400 border-gray-800/40 hover:border-gray-700"
                                                    )}
                                                >
                                                    <span className="truncate">{tag}</span>
                                                    <div className={clsx(
                                                        "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                        selectedTags.includes(tag)
                                                            ? "bg-indigo-500 border-indigo-500"
                                                            : "border-gray-600"
                                                    )}>
                                                        {selectedTags.includes(tag) && <CheckCircle className="h-3 w-3 text-white" />}
                                                    </div>
                                                </button>
                                            ))}
                                            {tags.length === 0 && (
                                                <div className="text-center py-12 text-gray-500 text-xs italic">
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
                                        <div className="bg-[#1e293b]/40 border border-gray-800/40 rounded-2xl p-6 space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">À partir de</label>
                                                <div className="relative">
                                                    <input 
                                                        type="date" 
                                                        value={dateFrom}
                                                        onChange={(e) => setDateFrom(e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all [color-scheme:dark]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-800/40 flex justify-end">
                            <button 
                                onClick={() => setIsFilterModalOpen(false)}
                                className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                Voir les résultats
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
