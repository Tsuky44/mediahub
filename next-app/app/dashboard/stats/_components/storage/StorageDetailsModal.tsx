'use client'

import { RefreshCw } from 'lucide-react'
import type { StorageItem, ItemDetails, SeasonDetail } from '../../_types/storage'
import { StorageDetailsHeader } from './details/StorageDetailsHeader'
import { UserActivitySection } from './details/UserActivitySection'
import { SeasonsSection } from './details/SeasonsSection'
import { StorageDetailsFooter } from './details/StorageDetailsFooter'

interface StorageDetailsModalProps {
  item: StorageItem
  details: ItemDetails | null
  loading: boolean
  canDelete: boolean
  onClose: () => void
  onDeleteItem: () => void
  onDeleteSeason: (season: SeasonDetail) => void
}

export function StorageDetailsModal({
  item,
  details,
  loading,
  canDelete,
  onClose,
  onDeleteItem,
  onDeleteSeason,
}: StorageDetailsModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <StorageDetailsHeader item={item} onClose={onClose} />

        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : details ? (
            <>
              <UserActivitySection details={details} />
              {item.type === 'Series' && details.seasons.length > 0 && (
                <SeasonsSection
                  seasons={details.seasons}
                  canDelete={canDelete}
                  onDeleteSeason={onDeleteSeason}
                />
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-12">Détails indisponibles</div>
          )}
        </div>

        <StorageDetailsFooter type={item.type} onDelete={onDeleteItem} />
      </div>
    </div>
  )
}
