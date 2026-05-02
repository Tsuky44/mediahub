'use client'

import { AlertTriangle } from 'lucide-react'
import { useInteractiveSearch } from './_hooks/useInteractiveSearch'
import { SearchControls } from './_components/interactive-search/SearchControls'
import { ReleasesTable } from './_components/interactive-search/ReleasesTable'
import { SearchEmpty } from './_components/interactive-search/SearchEmpty'

interface InteractiveSearchProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
}

export function InteractiveSearch({ tmdbId, mediaType, title }: InteractiveSearchProps) {
  const {
    episodes,
    seasons,
    searchMode,
    setSearchMode,
    selectedEpisode,
    setSelectedEpisode,
    selectedSeason,
    setSelectedSeason,
    releases,
    loading,
    loadingEpisodes,
    downloading,
    error,
    handleSearch,
    handleDownload,
    canSearch,
  } = useInteractiveSearch(tmdbId, mediaType)

  return (
    <div className="space-y-6">
      <SearchControls
        mediaType={mediaType}
        searchMode={searchMode}
        onSetSearchMode={setSearchMode}
        episodes={episodes}
        seasons={seasons}
        selectedEpisode={selectedEpisode}
        selectedSeason={selectedSeason}
        onSelectEpisode={setSelectedEpisode}
        onSelectSeason={setSelectedSeason}
        loadingEpisodes={loadingEpisodes}
        loading={loading}
        canSearch={canSearch()}
        onSearch={handleSearch}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {releases.length > 0 && (
        <ReleasesTable releases={releases} downloading={downloading} onDownload={handleDownload} />
      )}

      {!loading && releases.length === 0 && !error && (
        <SearchEmpty
          mediaType={mediaType}
          hasSelection={!!selectedEpisode || selectedSeason !== null}
        />
      )}
    </div>
  )
}
