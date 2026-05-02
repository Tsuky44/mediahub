'use client'

import dynamic from 'next/dynamic'
import type { TorrentSortBy } from '../_hooks/useTorrentFilters'
import { AddTorrentModal } from './torrent/AddTorrentModal'
import { DeleteTorrentModal } from './torrent/DeleteTorrentModal'
import { SORT_OPTIONS } from '../_constants/torrent-options'

const FilterModal = dynamic(() => import('./torrent/FilterModal').then(m => m.FilterModal), { ssr: false })
const SearchModal = dynamic(() => import('./torrent/SearchModal').then(m => m.SearchModal), { ssr: false })
const ShareLimitModal = dynamic(() => import('./torrent/ShareLimitModal').then(m => m.ShareLimitModal), { ssr: false })

type ShareLimitUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
type ShareLimitType = 'global' | 'unlimited' | 'custom'

interface TorrentModalsProps {
  actions: {
    isAddModalOpen: boolean
    setIsAddModalOpen: (v: boolean) => void
    handleAddTorrent: (e: React.FormEvent) => Promise<void>
    addMode: 'url' | 'file'
    setAddMode: (v: 'url' | 'file') => void
    newTorrentUrl: string
    setNewTorrentUrl: (v: string) => void
    torrentFiles: FileList | null
    setTorrentFiles: (v: FileList | null) => void
    isDeleteModalOpen: boolean
    setIsDeleteModalOpen: (v: boolean) => void
    torrentToDelete: { hash: string; name: string } | null
    setTorrentToDelete: (v: { hash: string; name: string } | null) => void
    confirmDelete: (deleteFiles: boolean) => Promise<void>
    isFilterModalOpen: boolean
    setIsFilterModalOpen: (v: boolean) => void
    isSearchOpen: boolean
    setIsSearchOpen: (v: boolean) => void
    isShareLimitModalOpen: boolean
    setIsShareLimitModalOpen: (v: boolean) => void
    handleShareLimit: (selectedTorrents: string[]) => Promise<void>
    shareLimitTime: number
    setShareLimitTime: (v: number) => void
    shareLimitUnit: ShareLimitUnit
    setShareLimitUnit: (v: ShareLimitUnit) => void
    shareLimitType: ShareLimitType
    setShareLimitType: (v: ShareLimitType) => void
    handleBatchAction: (
      action: 'resume' | 'pause' | 'delete' | 'top' | 'up' | 'down' | 'bottom' | 'reannounce',
      selectedTorrents: string[]
    ) => Promise<void>
  }
  sortBy: TorrentSortBy
  setSortBy: (v: TorrentSortBy) => void
  trackers: string[]
  selectedTrackers: string[]
  setSelectedTrackers: (v: string[]) => void
  tags: string[]
  selectedTags: string[]
  setSelectedTags: (v: string[]) => void
  dateFrom: string
  setDateFrom: (v: string) => void
  resetFilters: () => void
  selectedTorrents: string[]
  clearSelection: () => void
}

export function TorrentModals({
  actions,
  sortBy,
  setSortBy,
  trackers,
  selectedTrackers,
  setSelectedTrackers,
  tags,
  selectedTags,
  setSelectedTags,
  dateFrom,
  setDateFrom,
  resetFilters,
  selectedTorrents,
  clearSelection,
}: TorrentModalsProps) {
  return (
    <>
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

      <DeleteTorrentModal
        isOpen={actions.isDeleteModalOpen}
        torrent={actions.torrentToDelete}
        onConfirm={actions.confirmDelete}
        onCancel={() => {
          actions.setIsDeleteModalOpen(false)
          actions.setTorrentToDelete(null)
        }}
      />

      <FilterModal
        isOpen={actions.isFilterModalOpen}
        onClose={() => actions.setIsFilterModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={(id) => setSortBy(id as TorrentSortBy)}
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

      <SearchModal
        isOpen={actions.isSearchOpen}
        onClose={() => actions.setIsSearchOpen(false)}
      />

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
