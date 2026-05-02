'use client'

import { Search, Loader2 } from 'lucide-react'

interface SearchControlsProps {
  mediaType: 'movie' | 'tv'
  searchMode: 'episode' | 'season'
  onSetSearchMode: (mode: 'episode' | 'season') => void
  episodes: { id: number; seasonNumber: number; episodeNumber: number; title: string }[]
  seasons: number[]
  selectedEpisode: number | null
  selectedSeason: number | null
  onSelectEpisode: (id: number) => void
  onSelectSeason: (season: number) => void
  loadingEpisodes: boolean
  loading: boolean
  canSearch: boolean
  onSearch: () => void
}

export function SearchControls({
  mediaType,
  searchMode,
  onSetSearchMode,
  episodes,
  seasons,
  selectedEpisode,
  selectedSeason,
  onSelectEpisode,
  onSelectSeason,
  loadingEpisodes,
  loading,
  canSearch,
  onSearch,
}: SearchControlsProps) {
  return (
    <div className="flex flex-col gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
      {mediaType === 'tv' && (
        <div className="space-y-4">
          <div className="flex bg-gray-800/50 p-1 rounded-lg w-fit border border-white/5">
            <button
              onClick={() => onSetSearchMode('episode')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                searchMode === 'episode'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Par Épisode
            </button>
            <button
              onClick={() => onSetSearchMode('season')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                searchMode === 'season'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Par Saison
            </button>
          </div>

          {loadingEpisodes ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement des données...
            </div>
          ) : (
            <>
              {searchMode === 'episode' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Sélectionner l&apos;épisode
                  </label>
                  <select
                    className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:bg-gray-900 transition-colors"
                    value={selectedEpisode || ''}
                    onChange={e => onSelectEpisode(Number(e.target.value))}
                  >
                    <option value="">Choisir un épisode...</option>
                    {episodes.map(ep => (
                      <option key={ep.id} value={ep.id}>
                        S{ep.seasonNumber.toString().padStart(2, '0')}E
                        {ep.episodeNumber.toString().padStart(2, '0')} - {ep.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Sélectionner la saison
                  </label>
                  <select
                    className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:bg-gray-900 transition-colors"
                    value={selectedSeason === null ? '' : selectedSeason}
                    onChange={e => onSelectSeason(Number(e.target.value))}
                  >
                    <option value="">Choisir une saison...</option>
                    {seasons.map(s => (
                      <option key={s} value={s}>
                        Saison {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        onClick={onSearch}
        disabled={!canSearch}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-[0.98]"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        {loading
          ? 'Recherche en cours...'
          : searchMode === 'season'
          ? 'Rechercher la saison'
          : 'Rechercher les releases'}
      </button>
    </div>
  )
}
