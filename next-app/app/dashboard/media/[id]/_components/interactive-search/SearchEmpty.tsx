'use client'

import { Search } from 'lucide-react'

interface SearchEmptyProps {
  mediaType: 'movie' | 'tv'
  hasSelection: boolean
}

export function SearchEmpty({ mediaType, hasSelection }: SearchEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500 border border-dashed border-white/10 rounded-xl bg-white/5">
      <Search className="w-12 h-12 mb-4 opacity-20" />
      <p className="font-medium">
        {mediaType === 'tv' && !hasSelection
          ? "Sélectionnez un épisode ou une saison pour commencer."
          : "Aucun résultat pour le moment."}
      </p>
      <p className="text-xs opacity-50 mt-1">Lancez une recherche pour voir les releases disponibles</p>
    </div>
  )
}
