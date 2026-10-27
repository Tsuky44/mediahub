'use client'

import { createPortal } from 'react-dom'
import { useFilterModal } from './filter-modal/useFilterModal'
import { FilterModalHeader } from './filter-modal/FilterModalHeader'
import { FilterConfigBar } from './filter-modal/FilterConfigBar'
import { SortSection } from './filter-modal/SortSection'
import { TrackersSection } from './filter-modal/TrackersSection'
import { TagsSection } from './filter-modal/TagsSection'
import { PeriodSection } from './filter-modal/PeriodSection'
import { FilterModalFooter } from './filter-modal/FilterModalFooter'

interface SortOption {
  id: string
  label: string
}

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  sortBy: string
  onSortByChange: (id: string) => void
  sortOptions: SortOption[]
  trackers: string[]
  selectedTrackers: string[]
  onSelectedTrackersChange: (next: string[]) => void
  tags: string[]
  selectedTags: string[]
  onSelectedTagsChange: (next: string[]) => void
  dateFrom: string
  onDateFromChange: (value: string) => void
  onReset: () => void
}

export function FilterModal({
  isOpen,
  onClose,
  sortBy,
  onSortByChange,
  sortOptions,
  trackers,
  selectedTrackers,
  onSelectedTrackersChange,
  tags,
  selectedTags,
  onSelectedTagsChange,
  dateFrom,
  onDateFromChange,
  onReset,
}: FilterModalProps) {
  const { mounted } = useFilterModal(isOpen)

  if (!mounted) return null

  const toggleTracker = (tracker: string) => {
    onSelectedTrackersChange(
      selectedTrackers.includes(tracker)
        ? selectedTrackers.filter(t => t !== tracker)
        : [...selectedTrackers, tracker]
    )
  }

  const toggleTag = (tag: string) => {
    onSelectedTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag]
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#0e1010]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-white/10">
        <FilterModalHeader onClose={onClose} />
        <div className="p-8 space-y-8">
          <FilterConfigBar onReset={onReset} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <SortSection options={sortOptions} sortBy={sortBy} onChange={onSortByChange} />
            <TrackersSection
              trackers={trackers}
              selected={selectedTrackers}
              onToggle={toggleTracker}
            />
            <TagsSection tags={tags} selected={selectedTags} onToggle={toggleTag} />
            <PeriodSection dateFrom={dateFrom} onChange={onDateFromChange} />
          </div>
        </div>
        <FilterModalFooter onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}
