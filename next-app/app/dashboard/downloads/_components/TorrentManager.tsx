'use client'

import { useState } from 'react'
import { Plus, Pause, Download, HardDrive, Search, ArrowUpDown, CheckCircle, Activity, Filter, LayoutTemplate } from 'lucide-react'
import clsx from 'clsx'
import { useVisibleColumns } from '../_hooks/useVisibleColumns'
import { useTorrents } from '../_hooks/useTorrents'
import { useTorrentFilters } from '../_hooks/useTorrentFilters'
import { useTorrentSelection } from '../_hooks/useTorrentSelection'
import { AddTorrentModal } from './torrent/AddTorrentModal'
import { DeleteTorrentModal } from './torrent/DeleteTorrentModal'
import { FilterModal } from './torrent/FilterModal'
import { SearchModal } from './torrent/SearchModal'
import { BatchActionsBar } from './torrent/BatchActionsBar'
import { ShareLimitModal } from './torrent/ShareLimitModal'
import { TorrentRow } from './torrent/TorrentRow'

export function TorrentManager({ canAdd, canManage, canSearch }: { canAdd: boolean, canManage: boolean, canSearch: boolean }) {
    const [filter, setFilter] = useState('all')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [torrentToDelete, setTorrentToDelete] = useState<{hash: string, name: string} | null>(null)
    const [addMode, setAddMode] = useState<'url' | 'file'>('url')
    const [newTorrentUrl, setNewTorrentUrl] = useState('')
    const [torrentFiles, setTorrentFiles] = useState<FileList | null>(null)
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

    // Filters / sort (search, tags, trackers, date, sortBy, sortOrder) + derived list
    const {
        searchQuery, setSearchQuery,
        selectedTags, setSelectedTags,
        selectedTrackers, setSelectedTrackers,
        dateFrom, setDateFrom,
        sortBy, setSortBy,
        sortOrder, setSortOrder,
        trackers,
        filteredTorrents,
        resetFilters,
    } = useTorrentFilters(torrents)

    // Multi-selection (toggle individuel + select all + clear)
    const {
        selectedTorrents,
        toggleSelect: handleSelect,
        toggleSelectAll: handleSelectAll,
        clearSelection,
    } = useTorrentSelection(filteredTorrents)

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

    const handleBatchAction = async (action: 'resume' | 'pause' | 'delete' | 'top' | 'up' | 'down' | 'bottom' | 'reannounce') => {
        if (selectedTorrents.length === 0) return

        if (action === 'delete') {
            if (confirm(`Voulez-vous vraiment supprimer ${selectedTorrents.length} torrents ?`)) {
                await deleteTorrents(selectedTorrents, true)
                clearSelection()
            }
            return
        }

        if (action === 'resume') await resumeTorrents(selectedTorrents)
        else if (action === 'pause') await pauseTorrents(selectedTorrents)
        else if (action === 'reannounce') await reannounceTorrents(selectedTorrents)
        else await setPriority(selectedTorrents, action)
        
        clearSelection()
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
        clearSelection()
    }

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
                            {filteredTorrents.map((torrent) => (
                                <TorrentRow
                                    key={torrent.hash}
                                    torrent={torrent}
                                    isSelected={selectedTorrents.includes(torrent.hash)}
                                    visibleColumns={visibleColumns}
                                    canManage={canManage}
                                    onToggleSelect={handleSelect}
                                    onDelete={handleDeleteClick}
                                    onPause={handlePause}
                                    onResume={handleResume}
                                />
                            ))}
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
                onReset={resetFilters}
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
                onClearSelection={clearSelection}
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
