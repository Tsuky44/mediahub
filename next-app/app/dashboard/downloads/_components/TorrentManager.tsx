'use client'

import { useState } from 'react'
import { useVisibleColumns } from '../_hooks/useVisibleColumns'
import { useTorrents } from '../_hooks/useTorrents'
import { useTorrentFilters, TorrentSortBy } from '../_hooks/useTorrentFilters'
import { useTorrentSelection } from '../_hooks/useTorrentSelection'
import { useTorrentManagerActions } from '../_hooks/useTorrentManagerActions'
import { BatchActionsBar } from './torrent/BatchActionsBar'
import { TorrentList } from './torrent/TorrentList'
import { TorrentFiltersBar } from './torrent/TorrentFiltersBar'
import { TorrentModals } from './TorrentModals'

export function TorrentManager({ canAdd, canManage }: { canAdd: boolean, canManage: boolean }) {
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
                    onSortByChange={(id) => setSortBy(id as TorrentSortBy)}
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

                <TorrentList
                    torrents={torrents}
                    filteredTorrents={filteredTorrents}
                    loading={loading}
                    searchQuery={searchQuery}
                    selectedTorrents={selectedTorrents}
                    visibleColumns={visibleColumns}
                    canManage={canManage}
                    onToggleSelect={handleSelect}
                    onDelete={actions.handleDeleteClick}
                    onPause={actions.handlePause}
                    onResume={actions.handleResume}
                />
            </div>

            <BatchActionsBar
                selectedCount={selectedTorrents.length}
                onBatchAction={(action) => actions.handleBatchAction(action, selectedTorrents)}
                onShareLimitClick={() => actions.setIsShareLimitModalOpen(true)}
                onClearSelection={clearSelection}
            />
        </div>

        <TorrentModals
            actions={actions}
            sortBy={sortBy}
            setSortBy={setSortBy}
            trackers={trackers}
            selectedTrackers={selectedTrackers}
            setSelectedTrackers={setSelectedTrackers}
            tags={tags}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            resetFilters={resetFilters}
            selectedTorrents={selectedTorrents}
            clearSelection={clearSelection}
        />
        </>
    )
}
