'use client'

import { useState } from 'react'
import { Plus, Trash2, Pause, Play, Download, Upload, HardDrive, Search, Users, ArrowUpDown, Tag, X, CheckCircle, Activity, Filter, Signal, LayoutTemplate, Info } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { formatSpeed, formatSize, formatDate, formatDateTime, formatEta, getTrackerName } from '../_utils/torrent-formatters'
import { useVisibleColumns } from '../_hooks/useVisibleColumns'
import { useTorrents } from '../_hooks/useTorrents'
import { AddTorrentModal } from './torrent/AddTorrentModal'
import { DeleteTorrentModal } from './torrent/DeleteTorrentModal'
import { FilterModal } from './torrent/FilterModal'
import { SearchModal } from './torrent/SearchModal'
import { BatchActionsBar } from './torrent/BatchActionsBar'
import { ShareLimitModal } from './torrent/ShareLimitModal'

export function TorrentManager({ canAdd, canManage, canSearch }: { canAdd: boolean, canManage: boolean, canSearch: boolean }) {
    const [filter, setFilter] = useState('all')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [selectedTrackers, setSelectedTrackers] = useState<string[]>([])
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
    const [sortBy, setSortBy] = useState<'name' | 'ratio' | 'upspeed' | 'dlspeed' | 'global_speed' | 'added_on' | 'progress' | 'uploaded' | 'size' | 'amount_left' | 'eta' | 'num_seeds' | 'num_leechs' | 'last_activity' | 'completion_on' | 'availability' | 'downloaded' | 'category'>('added_on')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [isSortOpen, setIsSortOpen] = useState(false)
    // Prowlarr Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    // Share Limit State
    const [isShareLimitModalOpen, setIsShareLimitModalOpen] = useState(false)
    const [shareLimitTime, setShareLimitTime] = useState<number>(60)
    const [shareLimitUnit, setShareLimitUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('days')
    const [shareLimitType, setShareLimitType] = useState<'global' | 'unlimited' | 'custom'>('custom')

    // Column Visibility State
    const [isColumnsOpen, setIsColumnsOpen] = useState(false)
    const { visibleColumns, toggleColumn } = useVisibleColumns()

    // Data + CRUD actions (fetching + polling encapsulated in hook)
    const {
        torrents,
        loading,
        tags,
        addTorrent,
        deleteTorrents,
        pauseTorrents,
        resumeTorrents,
        reannounceTorrents,
        setPriority,
        setShareLimits,
    } = useTorrents(filter)

    const trackers = Array.from(new Set(torrents.map(t => getTrackerName(t.tracker)))).sort()

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
            setIsDeleteModalOpen(false)
            setTorrentToDelete(null)
        }
    }

    const handlePause = async (hash: string) => {
        await pauseTorrents([hash])
    }

    const handleResume = async (hash: string) => {
        await resumeTorrents([hash])
    }

    const handleSelect = (hash: string) => {
        if (selectedTorrents.includes(hash)) {
            setSelectedTorrents(selectedTorrents.filter(h => h !== hash))
        } else {
            setSelectedTorrents([...selectedTorrents, hash])
        }
    }

    const handleSelectAll = () => {
        if (selectedTorrents.length === filteredTorrents.length) {
            setSelectedTorrents([])
        } else {
            setSelectedTorrents(filteredTorrents.map(t => t.hash))
        }
    }

    const handleBatchAction = async (action: 'resume' | 'pause' | 'delete' | 'top' | 'up' | 'down' | 'bottom' | 'reannounce') => {
        if (selectedTorrents.length === 0) return

        if (action === 'delete') {
            if (confirm(`Voulez-vous vraiment supprimer ${selectedTorrents.length} torrents ?`)) {
                await deleteTorrents(selectedTorrents, true)
                setSelectedTorrents([])
            }
            return
        }

        if (action === 'resume') await resumeTorrents(selectedTorrents)
        else if (action === 'pause') await pauseTorrents(selectedTorrents)
        else if (action === 'reannounce') await reannounceTorrents(selectedTorrents)
        else await setPriority(selectedTorrents, action)
        
        setSelectedTorrents([])
    }

    const handleShareLimit = async () => {
        // Default values
        let minutes = -2 // Global
        let ratio = -2 // Global
        let inactive = -2 // Global
        
        if (shareLimitType === 'unlimited') {
            // Unlimited values (-1 means No Limit in qBittorrent API)
            minutes = -1
            ratio = -1
            inactive = -1
        } else if (shareLimitType === 'custom') {
            minutes = shareLimitTime
            if (shareLimitUnit === 'hours') minutes *= 60
            if (shareLimitUnit === 'days') minutes *= 60 * 24
            if (shareLimitUnit === 'weeks') minutes *= 60 * 24 * 7
            if (shareLimitUnit === 'months') minutes *= 60 * 24 * 30
            
            // Keep others as Global defaults when setting custom time
            ratio = -2 
            inactive = -2
        } else if (shareLimitType === 'global') {
            // Explicit Global
            minutes = -2
            ratio = -2
            inactive = -2
        }

        await setShareLimits(selectedTorrents, ratio, minutes, inactive)
        
        setIsShareLimitModalOpen(false)
        setSelectedTorrents([])
    }

    const filteredTorrents = Array.isArray(torrents) 
        ? torrents
            .filter(t => {
                const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesTags = selectedTags.length === 0 || 
                    (t.tags && selectedTags.every(tag => t.tags.split(',').map(st => st.trim()).includes(tag)))
                const matchesTrackers = selectedTrackers.length === 0 || selectedTrackers.includes(getTrackerName(t.tracker))
                const matchesDate = !dateFrom || (t.added_on * 1000 >= new Date(dateFrom).getTime())
                return matchesSearch && matchesTags && matchesTrackers && matchesDate
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
                                name="search-torrent"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck="false"
                                data-1p-ignore="true"
                                data-lpignore="true"
                                data-form-type="other"
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

                            {/* Columns Button */}
                            <div className="relative flex-1 md:flex-none z-30">
                                <button 
                                    onClick={() => setIsColumnsOpen(!isColumnsOpen)}
                                    className={clsx(
                                        "w-full md:w-auto flex items-center justify-center gap-2 px-3 h-11 bg-white/5 backdrop-blur-md border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                        isColumnsOpen
                                            ? "border-indigo-500/50 text-indigo-400 bg-indigo-500/10" 
                                            : "border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                                    )}
                                    title="Choisir les colonnes"
                                >
                                    <LayoutTemplate className="h-4 w-4" />
                                </button>

                                {isColumnsOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsColumnsOpen(false)} />
                                        <div className="absolute top-full right-0 md:left-0 mt-2 w-56 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                                            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
                                                Affichage
                                            </div>
                                            {[
                                                { id: 'tracker', label: 'Tracker' },
                                                { id: 'tags', label: 'Tags' },
                                                { id: 'category', label: 'Catégorie' },
                                                { id: 'added_on', label: 'Date d\'ajout' },
                                                { id: 'completion_on', label: 'Date de fin' },
                                                { id: 'last_activity', label: 'Dernière activité' },
                                                { id: 'status', label: 'Statut' },
                                                { id: 'download_info', label: 'Téléchargement' },
                                                { id: 'upload_info', label: 'Envoi' },
                                                { id: 'peers', label: 'Peers (Seeds/Leechs)' },
                                                { id: 'availability', label: 'Disponibilité' },
                                                { id: 'ratio', label: 'Ratio' },
                                                { id: 'progress_bar', label: 'Barre de progression' },
                                                { id: 'progress_text', label: 'Pourcentage' },
                                                { id: 'eta', label: 'ETA' },
                                            ].map((col) => (
                                                <button
                                                    key={col.id}
                                                    onClick={() => toggleColumn(col.id)}
                                                    className="w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-3 hover:bg-white/5 text-gray-300 hover:text-white"
                                                >
                                                    <div className={clsx(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                        visibleColumns[col.id]
                                                            ? "bg-indigo-600 border-indigo-500 text-white"
                                                            : "bg-white/5 border-white/20"
                                                    )}>
                                                        {visibleColumns[col.id] && <CheckCircle className="w-3 h-3 fill-current" />}
                                                    </div>
                                                    {col.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Select All Button */}
                            <button 
                                onClick={handleSelectAll}
                                className={clsx(
                                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-3 h-11 bg-white/5 backdrop-blur-md border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                    (selectedTorrents.length > 0 && selectedTorrents.length === filteredTorrents.length)
                                        ? "border-indigo-500/50 text-indigo-400 bg-indigo-500/10" 
                                        : "border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                                title={selectedTorrents.length === filteredTorrents.length ? "Tout désélectionner" : "Tout sélectionner"}
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span className="hidden sm:inline">Tout</span>
                            </button>

                            {/* Advanced Filters Button */}
                            <button 
                                onClick={() => setIsFilterModalOpen(true)}
                                className={clsx(
                                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-11 bg-white/5 backdrop-blur-md border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                    (selectedTags.length > 0 || selectedTrackers.length > 0 || dateFrom) 
                                        ? "border-indigo-500/50 text-indigo-400 bg-indigo-500/10" 
                                        : "border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Filter className="h-4 w-4" />
                                <span className="hidden sm:inline">Filtres avancés</span>
                                <span className="sm:hidden">Filtres</span>
                                {(selectedTags.length > 0 || selectedTrackers.length > 0 || dateFrom) && (
                                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-[10px] text-white">
                                        {(selectedTags.length > 0 ? 1 : 0) + (selectedTrackers.length > 0 ? 1 : 0) + (dateFrom ? 1 : 0)}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Actions Row */}
                        <div className="flex gap-2 order-3 md:order-3 w-full md:w-auto">
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
                                <div key={torrent.hash} 
                                    onClick={() => handleSelect(torrent.hash)}
                                    className={clsx(
                                        "backdrop-blur-md rounded-2xl p-3 border shadow-sm transition-all duration-300 group overflow-hidden w-full relative cursor-pointer",
                                        selectedTorrents.includes(torrent.hash) 
                                            ? "bg-indigo-900/20 border-indigo-500/50 shadow-indigo-500/10" 
                                            : "bg-black/40 border-white/5 hover:bg-black/60 hover:border-indigo-500/30"
                                    )}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="flex flex-col gap-2 w-full relative z-10">
                                        {/* Top Row: Tracker, Title & Actions/Date */}
                                        <div className="flex justify-between items-center gap-4 w-full">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {/* Checkbox */}
                                                <div className="shrink-0" onClick={(e) => { e.stopPropagation(); handleSelect(torrent.hash); }}>
                                                    <div className={clsx(
                                                        "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                                                        selectedTorrents.includes(torrent.hash)
                                                            ? "bg-indigo-600 border-indigo-500 text-white scale-110"
                                                            : "bg-white/5 border-white/10 group-hover:border-white/30 text-transparent"
                                                    )}>
                                                        <CheckCircle className="w-3.5 h-3.5 fill-current" />
                                                    </div>
                                                </div>

                                                <div className="shrink-0 flex items-center gap-2">
                                                    {visibleColumns.tracker && (
                                                        <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg font-bold uppercase tracking-wider text-[10px] shadow-sm shadow-indigo-500/5">
                                                            [{getTrackerName(torrent.tracker)}]
                                                        </span>
                                                    )}
                                                    {visibleColumns.category && torrent.category && (
                                                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg font-bold uppercase tracking-wider text-[10px] shadow-sm shadow-blue-500/5">
                                                            {torrent.category}
                                                        </span>
                                                    )}
                                                    {visibleColumns.tags && torrent.tags && torrent.tags.split(',').map(tag => (
                                                        <span key={tag} className="px-2.5 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-lg font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 hover:bg-white/10 transition-colors">
                                                            <Tag className="h-3 w-3" />
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                                <Link 
                                                    href={`/dashboard/downloads/${torrent.hash}`}
                                                    className="font-bold text-gray-100 truncate text-sm leading-tight flex-1 min-w-0 group-hover:text-indigo-300 transition-colors hover:underline"
                                                    title={torrent.name}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {torrent.name}
                                                </Link>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0">
                                                {visibleColumns.added_on && (
                                                    <span className="text-gray-500 text-[11px] whitespace-nowrap hidden lg:inline-block border-r border-white/10 pr-4 mr-1 font-medium">
                                                        Ajouté: <span className="text-gray-300 ml-1">{formatDate(torrent.added_on)}</span>
                                                    </span>
                                                )}

                                                {visibleColumns.completion_on && torrent.completion_on > 0 && (
                                                    <span className="text-gray-500 text-[11px] whitespace-nowrap hidden lg:inline-block border-r border-white/10 pr-4 mr-1 font-medium">
                                                        Fini: <span className="text-gray-300 ml-1">{formatDate(torrent.completion_on)}</span>
                                                    </span>
                                                )}

                                                {visibleColumns.last_activity && torrent.last_activity > 0 && (
                                                    <span className="text-gray-500 text-[11px] whitespace-nowrap hidden lg:inline-block border-r border-white/10 pr-4 mr-1 font-medium">
                                                        Actif: <span className="text-gray-300 ml-1">{formatDateTime(torrent.last_activity)}</span>
                                                    </span>
                                                )}

                                                {visibleColumns.status && (
                                                    <span className={clsx(
                                                        'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all duration-300 shadow-lg hidden xs:inline-block',
                                                        isPaused ? 'bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-gray-500/5' :
                                                        isError ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5' :
                                                        isUploading ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5'
                                                    )}>
                                                        {isPaused ? 'PAUSED' : isError ? 'ERROR' : isUploading ? 'SEEDING' : 'DOWNLOADING'}
                                                    </span>
                                                )}

                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                    <Link 
                                                        href={`/dashboard/downloads/${torrent.hash}`}
                                                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-blue-500/10"
                                                        title="Voir les détails"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Info className="h-4 w-4" />
                                                    </Link>
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
                                                {visibleColumns.download_info && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                                            <Download className="h-3.5 w-3.5 text-emerald-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold tracking-tight">{formatSize(torrent.downloaded)}</span> 
                                                            <span className="text-emerald-400 text-[10px] font-bold">{formatSpeed(torrent.dlspeed)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {visibleColumns.download_info && visibleColumns.upload_info && <div className="w-px h-8 bg-white/5" />}
                                                
                                                {visibleColumns.upload_info && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                                            <Upload className="h-3.5 w-3.5 text-blue-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold tracking-tight">{formatSize(torrent.uploaded)}</span> 
                                                            <span className="text-blue-400 text-[10px] font-bold">{formatSpeed(torrent.upspeed)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {visibleColumns.upload_info && visibleColumns.peers && <div className="w-px h-8 bg-white/5 hidden lg:block" />}

                                                {visibleColumns.peers && (
                                                    <div className="flex items-center gap-2 hidden lg:flex">
                                                        <div className="p-1.5 bg-purple-500/10 rounded-lg">
                                                            <Users className="h-3.5 w-3.5 text-purple-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold tracking-tight">{torrent.num_seeds} <span className="text-gray-500 text-[10px]">seeders</span></span>
                                                            <span className="text-purple-400 text-[10px] font-bold">{torrent.num_leechs} <span className="text-purple-400/60">leechers</span></span>
                                                        </div>
                                                    </div>
                                                )}

                                                {visibleColumns.peers && visibleColumns.availability && <div className="w-px h-8 bg-white/5 hidden lg:block" />}

                                                {visibleColumns.availability && (
                                                    <div className="flex items-center gap-2 hidden lg:flex">
                                                        <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                                            <Signal className="h-3.5 w-3.5 text-amber-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold tracking-tight">{torrent.availability === -1 ? '∞' : torrent.availability.toFixed(2)}</span>
                                                            <span className="text-amber-400 text-[10px] font-bold">Dispo.</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {(visibleColumns.peers || visibleColumns.availability) && visibleColumns.ratio && <div className="w-px h-8 bg-white/5 hidden md:block" />}

                                                {visibleColumns.ratio && (
                                                    <div className="flex flex-col hidden md:flex min-w-[60px]">
                                                        <span className="text-gray-500 text-[10px] uppercase font-black tracking-wider">Ratio</span>
                                                        <span className={clsx(
                                                            "font-black text-sm",
                                                            torrent.ratio >= 2 ? "text-emerald-400" : torrent.ratio >= 1 ? "text-blue-400" : "text-red-400"
                                                        )}>{torrent.ratio.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Progress Bar & Percentage */}
                                            {(visibleColumns.progress_bar || visibleColumns.eta || visibleColumns.progress_text) && (
                                                <div className="flex items-center gap-4 flex-1 w-full min-w-0 pl-2 sm:pl-4 border-l border-white/5">
                                                    {visibleColumns.progress_bar && (
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
                                                    )}
                                                    
                                                    <div className={clsx(
                                                        "flex items-center gap-4 shrink-0",
                                                        !visibleColumns.progress_bar && "ml-auto"
                                                    )}>
                                                        {visibleColumns.progress_text && (
                                                            <div className="flex flex-col items-end min-w-[50px]">
                                                                <span className="font-black text-white text-sm tracking-tight">
                                                                    {(torrent.progress * 100).toFixed(1)}%
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                                    Progression
                                                                </span>
                                                            </div>
                                                        )}

                                                        {visibleColumns.eta && (
                                                            <div className="flex flex-col items-end min-w-[50px]">
                                                                <span className="font-black text-white text-sm tracking-tight">
                                                                    {isCompleted 
                                                                        ? (torrent.max_seeding_time === -1 || torrent.max_seeding_time === -2 
                                                                            ? '∞' 
                                                                            : formatEta(Math.max(0, (torrent.max_seeding_time * 60) - torrent.seeding_time)))
                                                                        : formatEta(torrent.eta)
                                                                    }
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                                    {isCompleted ? 'Restant' : 'ETA'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
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
            <AddTorrentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddTorrent}
                addMode={addMode}
                onAddModeChange={setAddMode}
                newTorrentUrl={newTorrentUrl}
                onNewTorrentUrlChange={setNewTorrentUrl}
                torrentFiles={torrentFiles}
                onTorrentFilesChange={setTorrentFiles}
            />

            {/* Delete Confirmation Modal */}
            <DeleteTorrentModal
                isOpen={isDeleteModalOpen}
                torrent={torrentToDelete}
                onConfirm={confirmDelete}
                onCancel={() => {
                    setIsDeleteModalOpen(false)
                    setTorrentToDelete(null)
                }}
            />

            {/* Advanced Filters Modal */}
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                sortBy={sortBy}
                onSortByChange={(id) => setSortBy(id as any)}
                sortOptions={sortOptions}
                trackers={trackers}
                selectedTrackers={selectedTrackers}
                onSelectedTrackersChange={setSelectedTrackers}
                tags={tags}
                selectedTags={selectedTags}
                onSelectedTagsChange={setSelectedTags}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                onReset={() => {
                    setSelectedTags([])
                    setSelectedTrackers([])
                    setDateFrom('')
                    setSortBy('added_on')
                }}
            />
            {/* Search Modal */}
            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
            {/* Batch Actions Floating Bar */}
            <BatchActionsBar
                selectedCount={selectedTorrents.length}
                onBatchAction={handleBatchAction}
                onShareLimitClick={() => setIsShareLimitModalOpen(true)}
                onClearSelection={() => setSelectedTorrents([])}
            />
        </div>
            {/* Share Limit Modal */}
            <ShareLimitModal
                isOpen={isShareLimitModalOpen}
                onClose={() => setIsShareLimitModalOpen(false)}
                onApply={handleShareLimit}
                shareLimitTime={shareLimitTime}
                onShareLimitTimeChange={setShareLimitTime}
                shareLimitUnit={shareLimitUnit}
                onShareLimitUnitChange={setShareLimitUnit}
                shareLimitType={shareLimitType}
                onShareLimitTypeChange={setShareLimitType}
            />
        </>
    )
}
