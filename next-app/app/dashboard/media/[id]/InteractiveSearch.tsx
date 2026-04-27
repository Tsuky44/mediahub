'use client'

import { Search, Download, Loader2, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useInteractiveSearch } from './_hooks/useInteractiveSearch'

interface InteractiveSearchProps {
    tmdbId: number
    mediaType: 'movie' | 'tv'
    title: string
}

function formatSize(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
            <div className="flex flex-col gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                {mediaType === 'tv' && (
                    <div className="space-y-4">
                        {/* Search Mode Toggle */}
                        <div className="flex bg-gray-800/50 p-1 rounded-lg w-fit border border-white/5">
                            <button
                                onClick={() => setSearchMode('episode')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    searchMode === 'episode' 
                                        ? 'bg-indigo-600 text-white shadow-lg' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                Par Épisode
                            </button>
                            <button
                                onClick={() => setSearchMode('season')}
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
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sélectionner l'épisode</label>
                                        <select 
                                            className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:bg-gray-900 transition-colors"
                                            value={selectedEpisode || ''}
                                            onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                                        >
                                            <option value="">Choisir un épisode...</option>
                                            {episodes.map((ep) => (
                                                <option key={ep.id} value={ep.id}>
                                                    S{ep.seasonNumber.toString().padStart(2, '0')}E{ep.episodeNumber.toString().padStart(2, '0')} - {ep.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sélectionner la saison</label>
                                        <select 
                                            className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:bg-gray-900 transition-colors"
                                            value={selectedSeason === null ? '' : selectedSeason}
                                            onChange={(e) => setSelectedSeason(Number(e.target.value))}
                                        >
                                            <option value="">Choisir une saison...</option>
                                            {seasons.map((s) => (
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
                    onClick={handleSearch}
                    disabled={!canSearch()}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-[0.98]"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    {loading ? 'Recherche en cours...' : searchMode === 'season' ? 'Rechercher la saison' : 'Rechercher les releases'}
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {releases.length > 0 && (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0f172a]/50">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
                            <thead className="text-xs uppercase bg-white/5 text-gray-300 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 w-[120px]">Indexer</th>
                                    <th className="px-6 py-4 w-[120px]">Âge</th>
                                    <th className="px-6 py-4 min-w-[300px]">Titre</th>
                                    <th className="px-6 py-4 w-[100px]">Taille</th>
                                    <th className="px-6 py-4 w-[100px]">S / L</th>
                                    <th className="px-6 py-4 w-[100px]">Langue</th>
                                    <th className="px-6 py-4 w-[120px]">Qualité</th>
                                    <th className="px-6 py-4 w-[80px] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {releases.map((release) => (
                                    <tr key={release.guid} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-indigo-300 truncate max-w-[120px]" title={release.indexer}>
                                            {release.indexer}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {formatDistanceToNow(new Date(release.publishDate), { addSuffix: true, locale: fr })}
                                        </td>
                                        <td className="px-6 py-4 text-white font-medium max-w-[400px] truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:z-10 relative" title={release.title}>
                                            {release.title}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-300">
                                            {formatSize(release.size)}
                                        </td>
                                        <td className="px-6 py-4 font-mono">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-green-400 font-bold">{release.seeders}</span>
                                                <span className="text-gray-600">/</span>
                                                <span className="text-red-400">{release.leechers}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {release.languages?.map((l: any) => l.name).join(', ') || 'Inconnu'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-white/10 text-gray-300 border border-white/10 whitespace-nowrap">
                                                {release.quality.quality.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right sticky right-0 bg-[#0f172a] group-hover:bg-[#162032] transition-colors shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.5)]">
                                            <button
                                                onClick={() => handleDownload(release.guid, release.indexerId)}
                                                disabled={!!downloading && downloading === release.guid}
                                                className="p-2 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-all disabled:opacity-50 active:scale-90"
                                                title="Télécharger"
                                            >
                                                {downloading === release.guid ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Download className="w-5 h-5" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {!loading && releases.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500 border border-dashed border-white/10 rounded-xl bg-white/5">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium">
                        {mediaType === 'tv' && !selectedEpisode && !selectedSeason
                            ? "Sélectionnez un épisode ou une saison pour commencer." 
                            : "Aucun résultat pour le moment."}
                    </p>
                    <p className="text-xs opacity-50 mt-1">Lancez une recherche pour voir les releases disponibles</p>
                </div>
            )}
        </div>
    )
}
