'use client'

import { useState } from 'react'
import { useVisibleColumns } from '../_hooks/useVisibleColumns'
import { useTorrents } from '../_hooks/useTorrents'
import { useTorrentFilters } from '../_hooks/useTorrentFilters'
import { useTorrentSelection } from '../_hooks/useTorrentSelection'
import { useTorrentManagerActions } from '../_hooks/useTorrentManagerActions'
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

    // Modals + action handlers extracted into dedicated hook
    const actions = useTorrentManagerActions({
        addTorrent,
        deleteTorrents,
        pauseTorrents,
        resumeTorrents,
        reannounceTorrents,
        setPriority,
        setShareLimits,
        clearSelection,
    })

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
                    onOpenFilterModal={() => actions.setIsFilterModalOpen(true)}
                    canAdd={canAdd}
                    onOpenAddModal={() => actions.setIsAddModalOpen(true)}
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
                                    onDelete={actions.handleDeleteClick}
                                    onPause={actions.handlePause}
                                    onResume={actions.handleResume}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Torrent Modal */}
            <AddTorrentModal
                isOpen={actions.isAddModalOpen}
                onClose={() => actions.setIsAddModalOpen(false)}
                onSubmit={actions.handleAddTorrent}
                addMode={actions.addMode}
                onAddModeChange={actions.setAddMode}
                newTorrentUrl={actions.newTorrentUrl}
                onNewTorrentUrlChange={actions.setNewTorrentUrl}
                torrentFiles={actions.torrentFiles}
                onTorrentFilesChange={actions.setTorrentFiles}
            />

            {/* Delete Confirmation Modal */}
            <DeleteTorrentModal
                isOpen={actions.isDeleteModalOpen}
                torrent={actions.torrentToDelete}
                onConfirm={actions.confirmDelete}
                onCancel={() => {
                    actions.setIsDeleteModalOpen(false)
                    actions.setTorrentToDelete(null)
                }}
            />

            {/* Advanced Filters Modal */}
            <FilterModal
                isOpen={actions.isFilterModalOpen}
                onClose={() => actions.setIsFilterModalOpen(false)}
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
                isOpen={actions.isSearchOpen}
                onClose={() => actions.setIsSearchOpen(false)}
            />
            {/* Batch Actions Floating Bar */}
            <BatchActionsBar
                selectedCount={selectedTorrents.length}
                onBatchAction={(action) => actions.handleBatchAction(action, selectedTorrents)}
                onShareLimitClick={() => actions.setIsShareLimitModalOpen(true)}
                onClearSelection={clearSelection}
            />
        </div>

            {/* Share Limit Modal */}
            <ShareLimitModal
                isOpen={actions.isShareLimitModalOpen}
                onClose={() => actions.setIsShareLimitModalOpen(false)}
                onApply={() => actions.handleShareLimit(selectedTorrents)}
                shareLimitTime={actions.shareLimitTime}
                onShareLimitTimeChange={actions.setShareLimitTime}
                shareLimitUnit={actions.shareLimitUnit}
                onShareLimitUnitChange={actions.setShareLimitUnit}
                shareLimitType={actions.shareLimitType}
                onShareLimitTypeChange={actions.setShareLimitType}
            />
        </>
    )
}
