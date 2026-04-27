'use client'

import { Tv } from 'lucide-react'
import type { ProwlarrEpisode, ProwlarrSeason } from './prowlarr-types'

interface ProwlarrSeasonEpisodeSelectorProps {
    seasons: ProwlarrSeason[]
    selectedSeason: number | null
    onSeasonChange: (season: number | null) => void
    selectedEpisode: number | null
    onEpisodeChange: (episode: number | null) => void
    episodes: ProwlarrEpisode[]
    loadingEpisodes: boolean
}

/** Selecteurs Saison/Episode pour series TV. */
export function ProwlarrSeasonEpisodeSelector({
    seasons,
    selectedSeason,
    onSeasonChange,
    selectedEpisode,
    onEpisodeChange,
    episodes,
    loadingEpisodes,
}: ProwlarrSeasonEpisodeSelectorProps) {
    return (
        <div className="flex flex-col gap-2 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                    <Tv className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <span className="text-sm font-medium text-indigo-300">
                    Configuration de la recherche
                </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs text-indigo-300/70 font-medium ml-1">Saison</label>
                    <select
                        value={selectedSeason ?? ''}
                        onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : null
                            onSeasonChange(val)
                            if (val !== selectedSeason) onEpisodeChange(null)
                        }}
                        className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-gray-900/80"
                    >
                        <option value="">-- Sélectionner une saison --</option>
                        {seasons.filter(s => s.season_number > 0).map(season => (
                            <option key={season.season_number} value={season.season_number}>
                                {season.name} (Saison {season.season_number}) - {season.episode_count} épisodes
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs text-indigo-300/70 font-medium ml-1">Épisode</label>
                    <select
                        value={selectedEpisode ?? ''}
                        onChange={(e) => onEpisodeChange(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={selectedSeason === null || loadingEpisodes}
                        className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-gray-900/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Toute la saison (Pack)</option>
                        {loadingEpisodes ? (
                            <option disabled>Chargement des épisodes...</option>
                        ) : (
                            episodes.map(episode => (
                                <option key={episode.id} value={episode.episode_number}>
                                    E{episode.episode_number} - {episode.name}
                                </option>
                            ))
                        )}
                    </select>
                </div>
            </div>
        </div>
    )
}
