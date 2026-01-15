'use client'

import { useState, useEffect } from 'react'
import { getTorrents, addTorrent, deleteTorrents, pauseTorrents, resumeTorrents } from './actions'
import { Torrent } from '@/lib/services/qbittorrent'
import { Plus, Trash2, Pause, Play, Download, Upload, Clock, FileDown, HardDrive, Search, Users, ArrowUpDown } from 'lucide-react'
import clsx from 'clsx'

export function TorrentManager() {
    const [torrents, setTorrents] = useState<Torrent[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [torrentToDelete, setTorrentToDelete] = useState<{hash: string, name: string} | null>(null)
    const [addMode, setAddMode] = useState<'url' | 'file'>('url')
    const [newTorrentUrl, setNewTorrentUrl] = useState('')
    const [torrentFiles, setTorrentFiles] = useState<FileList | null>(null)
    const [selectedTorrents, setSelectedTorrents] = useState<string[]>([])
    const [refreshInterval, setRefreshInterval] = useState(2000)
    const [sortBy, setSortBy] = useState<'name' | 'ratio' | 'upspeed' | 'dlspeed' | 'added_on' | 'progress' | 'uploaded'>('added_on')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const fetchTorrents = async () => {
        const data = await getTorrents(filter)
        setTorrents(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchTorrents()
        const interval = setInterval(fetchTorrents, refreshInterval)
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
            .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
                let comparison = 0
                if (sortBy === 'name') comparison = a.name.localeCompare(b.name)
                else if (sortBy === 'ratio') comparison = a.ratio - b.ratio
                else if (sortBy === 'upspeed') comparison = a.upspeed - b.upspeed
                else if (sortBy === 'dlspeed') comparison = a.dlspeed - b.dlspeed
                else if (sortBy === 'added_on') comparison = a.added_on - b.added_on
                else if (sortBy === 'progress') comparison = a.progress - b.progress
                else if (sortBy === 'uploaded') comparison = a.uploaded - b.uploaded
                
                return sortOrder === 'asc' ? comparison : -comparison
            })
        : []

    return (
        <div className="space-y-4">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto items-start lg:items-center">
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {['all', 'downloading', 'completed', 'paused', 'active'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={clsx(
                                    'px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap',
                                    filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                                )}
                            >
                                {f === 'all' ? 'Tous' : f === 'downloading' ? 'En cours' : f === 'completed' ? 'Terminés' : f === 'paused' ? 'En pause' : 'Actifs'}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 sm:w-60">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full pl-8 pr-3 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-md px-2 py-0.5">
                            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-transparent text-xs text-gray-300 outline-none border-none cursor-pointer focus:ring-0"
                            >
                                <option value="added_on">Date d'ajout</option>
                                <option value="ratio">Ratio</option>
                                <option value="upspeed">Vitesse Upload</option>
                                <option value="dlspeed">Vitesse Download</option>
                                <option value="progress">Progression</option>
                                <option value="uploaded">Total Uploadé</option>
                                <option value="name">Nom</option>
                            </select>
                            <button 
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-0.5 hover:bg-gray-700 rounded text-gray-400"
                            >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-lg transition-all w-full sm:w-auto justify-center"
                >
                    <Plus className="h-4 w-4" />
                    Ajouter Torrent
                </button>
            </div>

            {/* Torrent List - Compact Row Layout */}
            <div className="flex flex-col gap-3 w-full">
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
        </div>
    )
}
