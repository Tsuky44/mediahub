'use client'

import { useState } from 'react'
import { useVisibleColumns } from '../_hooks/useVisibleColumns'
import { useTorrents } from '../_hooks/useTorrents'
import { useTorrentFilters } from '../_hooks/useTorrentFilters'
import { useTorrentSelection } from '../_hooks/useTorrentSelection'
import { SORT_OPTIONS } from '../_constants/torrent-options'
import { AddTorrentModal } from './torrent/AddTorrentModal'
import { DeleteTorrentModal } from './torrent/DeleteTorrentModal'
import { FilterModal } from './torrent/FilterModal'
import { SearchModal } from './torrent/SearchModal'
import { BatchActionsBar } from './torrent/BatchActionsBar'
import { ShareLimitModal } from './torrent/ShareLimitModal'
import { TorrentRow } from './torrent/TorrentRow'
import { TorrentFiltersBar } from './torrent/TorrentFiltersBar'

export function TorrentManager({ canAdd, canManage, canSearch }: { canAdd: boolean, canManage: boolean, canSearch: boolean }) {
    const [filter, setFilter] = useState('all')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [torrentToDelete, setTorrentToDelete] = useState<{hash: string, name: string} | null>(null)
    const [addMode, setAddMode] = useState<'url' | 'file'>('url')
    const [newTorrentUrl, setNewTorrentUrl] = useState('')
    const [torrentFiles, setTorrentFiles] = useState<FileList | null>(null)
    // Prowlarr Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    // Share Limit State
    const [isShareLimitModalOpen, setIsShareLimitModalOpen] = useState(false)
    const [shareLimitTime, setShareLimitTime] = useState<number>(60)
    const [shareLimitUnit, setShareLimitUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('days')
    const [shareLimitType, setShareLimitType] = useState<'global' | 'unlimited' | 'custom'>('custom')

    // Column Visibility (persisted via localStorage in the hook)
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

    return (
        <>
        <div className="w-full space-y-6">
            <div className="flex flex-col gap-6">
                <TorrentFiltersBar
                    filter={filter}
                    onFilterChange={setFilter}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    sortBy={sortBy}
                    onSortByChange={(id) => setSortBy(id as any)}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    visibleColumns={visibleColumns}
                    onToggleColumn={toggleColumn}
                    selectedCount={selectedTorrents.length}
                    filteredCount={filteredTorrents.length}
                    onSelectAll={handleSelectAll}
                    selectedTagsCount={selectedTags.length}
                    selectedTrackersCount={selectedTrackers.length}
                    dateFrom={dateFrom}
                    onOpenFilterModal={() => setIsFilterModalOpen(true)}
                    canAdd={canAdd}
                    onOpenAddModal={() => setIsAddModalOpen(true)}
                />

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
                sortOptions={SORT_OPTIONS}
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
