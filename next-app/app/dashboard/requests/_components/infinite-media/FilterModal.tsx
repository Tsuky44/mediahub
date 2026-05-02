'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { MediaFilters } from '@/components/global/MediaFilters'

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'all' | 'movie' | 'tv'
  onFilterChange: (filters: any) => void
  activeFilters?: any
}

export function FilterModal({ isOpen, onClose, type, onFilterChange, activeFilters }: FilterModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-white">Filtres avancés</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <MediaFilters type={type} onFilterChange={onFilterChange} initialFilters={activeFilters} />
        </div>

        <div className="p-6 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105"
          >
            Voir les résultats
          </button>
        </div>
      </div>
    </div>
  )
}
