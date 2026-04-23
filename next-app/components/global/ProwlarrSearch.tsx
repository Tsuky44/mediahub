'use client'

import { useState, useEffect } from 'react'
import { Search, Download, Loader2, Database, AlertCircle, CheckCircle2, Filter, Music, Film, Tv, Gamepad, Book, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { searchProwlarr, downloadTorrent, getProwlarrIndexers, searchMediaReleases, downloadMediaRelease, getSonarrEpisodes } from '@/app/dashboard/media/[id]/prowlarr-actions'
import { getSeasonDetails } from '@/app/dashboard/media/[id]/actions'

interface ProwlarrSearchProps {
  title: string
  canManage?: boolean
  mediaType?: 'movie' | 'tv'
  tmdbId?: number
  tvdbId?: number
  seasons?: any[]
  initialSeason?: number | null
  initialEpisode?: number | null
}

const CATEGORIES = [
    { id: 2000, name: 'Films', icon: Film },
    { id: 5000, name: 'Séries', icon: Tv },
    { id: 3000, name: 'Musique', icon: Music },
    { id: 4000, name: 'PC / Jeux', icon: Gamepad },
    { id: 7000, name: 'Livres', icon: Book },
]

const RESULTS_PER_PAGE = 200

export function ProwlarrSearch({ title, canManage = true, mediaType, tmdbId, tvdbId, seasons, initialSeason = null, initialEpisode = null }: ProwlarrSearchProps) {
  const [query, setQuery] = useState(title || '')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null) // guid of downloading item
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null) // guid of success item
  const [selectedSeason, setSelectedSeason] = useState<number | null>(initialSeason)
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(initialEpisode)
  const [episodeList, setEpisodeList] = useState<any[]>([])
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [searchSource, setSearchSource] = useState<'smart' | 'raw'>('raw')

  // Pagination state
  const [indexers, setIndexers] = useState<any[]>([])
  const [selectedIndexers, setSelectedIndexers] = useState<number[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showRecent, setShowRecent] = useState(false)

  // Selection state
  const [selectedGuids, setSelectedGuids] = useState<Set<string>>(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)

  // Pagination state
  const [page, setPage] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Sorting state
  const [sortBy, setSortBy] = useState<'seeders' | 'publishDate' | 'size'>('seeders')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Effect to sort results when sortBy or sortOrder changes
  useEffect(() => {
    if (results.length === 0) return

    const sorted = [...results].sort((a, b) => {
      let valA: any, valB: any

      if (sortBy === 'seeders') {
        valA = a.seeders ?? 0
        valB = b.seeders ?? 0
      } else if (sortBy === 'publishDate') {
        valA = new Date(a.publishDate).getTime()
        valB = new Date(b.publishDate).getTime()
      } else if (sortBy === 'size') {
        valA = a.size ?? 0
        valB = b.size ?? 0
      }

      if (sortOrder === 'desc') return valB - valA
      return valA - valB
    })

    // Check if order actually changed to avoid infinite loop
    const changed = sorted.some((val, idx) => val.guid !== results[idx].guid)
    if (changed) {
        setResults(sorted)
    }
  }, [sortBy, sortOrder, results])

  const handleSearch = async (newOffset: number = 0, append: boolean = false) => {
    const hasQuery = (query || '').trim().length > 0
    const hasFilters = selectedCategories.length > 0 || selectedIndexers.length > 0
    
    // Allow search if we have specific media context even without query
    const hasContext = !!(mediaType && tmdbId)
    
    if (!hasQuery && !hasFilters && !showRecent && !hasContext) return
    
    // If TV and using context search, require season
    if (searchSource === 'smart' && mediaType === 'tv' && tmdbId && selectedSeason === null && !hasQuery) {
        if (newOffset === 0) setError('Veuillez sélectionner une saison')
        return
    }
    
    setLoading(true)
    setError(null)
    if (!append && newOffset === 0) {
        setResults([])
        setPage(0)
        setOffset(0)
        setSelectedGuids(new Set())
    }
    
    try {
      let res;
      // Use Sonarr/Radarr search if context is available and (for TV) season is selected
      // We prioritize this over Prowlarr raw search if we are in media context
      if (searchSource === 'smart' && mediaType && tmdbId && (mediaType === 'movie' || (mediaType === 'tv' && selectedSeason !== null))) {
          res = await searchMediaReleases(mediaType, tmdbId, tvdbId, selectedSeason ?? undefined, selectedEpisode ?? undefined)
      } else {
          res = await searchProwlarr(
              (showRecent && !hasQuery) ? '' : query, 
              selectedIndexers.length > 0 ? selectedIndexers : undefined,
              selectedCategories.length > 0 ? selectedCategories : undefined,
              RESULTS_PER_PAGE,
              newOffset
          )
      }

      const anyRes = res as any
      if (anyRes.error) {
        setError(anyRes.error)
      } else {
        const newResults = res.results || []
        if (append) {
            setResults(prev => [...prev, ...newResults])
            setOffset(prev => prev + newResults.length)
        } else {
            setResults(newResults)
            setOffset(newOffset + newResults.length)
        }
        
        setHasMore(newResults.length >= 40) // Heuristic
        
        if (!append) {
            setPage(Math.floor(newOffset / RESULTS_PER_PAGE))
        } else {
            setPage(prev => prev + 1)
        }
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la recherche')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    const loadIndexers = async () => {
        const res = await getProwlarrIndexers()
        if (res.indexers) {
            setIndexers(res.indexers.filter((i: any) => i.enable))
        }
    }
    loadIndexers()
    // Don't auto-search if TV and no season selected
    if (!(mediaType === 'tv' && selectedSeason === null)) {
        handleSearch(0)
    }
  }, [])

  // Effect to re-search when season or episode changes
  useEffect(() => {
    if (mediaType === 'tv' && selectedSeason !== null) {
        // Update query for raw search fallback
        const seasonStr = selectedSeason < 10 ? `0${selectedSeason}` : selectedSeason
        let newQuery = `${title} S${seasonStr}`
        if (selectedEpisode) {
            const episodeStr = selectedEpisode < 10 ? `0${selectedEpisode}` : selectedEpisode
            newQuery += `E${episodeStr}`
        }
        setQuery(newQuery)

        // Always trigger search when season/episode changes
        handleSearch(0)
    }
  }, [selectedSeason, selectedEpisode])

  // Effect to fetch episodes when season changes
  useEffect(() => {
    if (mediaType === 'tv' && tmdbId && selectedSeason !== null) {
        setLoadingEpisodes(true)
        // Prefer Sonarr episodes if available for better consistency with search
        getSonarrEpisodes(tmdbId)
            .then(res => {
                if (res.episodes) {
                    // Filter episodes by season
                    const seasonEpisodes = res.episodes
                        .filter((e: any) => e.seasonNumber === selectedSeason)
                        .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)
                    
                    if (seasonEpisodes.length > 0) {
                        setEpisodeList(seasonEpisodes.map((e: any) => ({
                            id: e.id,
                            episode_number: e.episodeNumber,
                            name: e.title,
                            overview: e.overview,
                            hasFile: e.hasFile
                        })))
                        return
                    }
                }
                
                // Fallback to TMDB if Sonarr fails or returns no episodes for this season
                // This handles cases where the series might not be in Sonarr yet or fully synced
                return getSeasonDetails(tmdbId, selectedSeason)
                    .then(data => {
                        if (data && data.episodes) {
                            setEpisodeList(data.episodes)
                        } else {
                            setEpisodeList([])
                        }
                    })
            })
            .catch(err => {
                console.error('Error fetching episodes:', err)
                setEpisodeList([])
            })
            .finally(() => setLoadingEpisodes(false))
    } else {
        setEpisodeList([])
    }
  }, [mediaType, tmdbId, selectedSeason])

  const handleDownload = async (guid: string, url: string, indexerId?: number) => {
    // If using Sonarr/Radarr search, url might be null/empty, we use guid and indexerId
    if (!url && (!mediaType || !tmdbId)) return
    
    setDownloading(guid)
    try {
      let res;
      if (mediaType && tmdbId && indexerId) {
         const result = results.find(r => r.guid === guid)
         const releaseInfo = result ? {
             title: result.title,
             downloadUrl: result.downloadUrl || result.magnetUrl,
             protocol: result.protocol,
             publishDate: result.publishDate,
             indexer: result.indexer,
             size: result.size,
             guid: result.guid
         } : undefined

         res = await downloadMediaRelease(guid, indexerId, mediaType, tmdbId, tvdbId, selectedSeason ?? undefined, selectedEpisode ?? undefined, releaseInfo)
      } else {
         if (!url) {
             alert('URL de téléchargement manquante')
             setDownloading(null)
             return
         }
         res = await downloadTorrent(url)
      }

      const anyRes = res as any
      const errorMsg = anyRes.error || (anyRes.success === false ? anyRes.message : null)
      if (errorMsg) {
        alert(`Erreur: ${errorMsg}`)
      } else {
        setDownloadSuccess(guid)
        setTimeout(() => setDownloadSuccess(null), 3000)
      }
    } catch (err) {
      alert('Erreur lors du téléchargement')
    } finally {
      setDownloading(null)
    }
  }
  
  const handleBulkDownload = async () => {
    if (selectedGuids.size === 0) return
    setBulkDownloading(true)
    
    const selectedResults = results.filter(r => selectedGuids.has(r.guid))
    let successCount = 0
    let failCount = 0

    for (const result of selectedResults) {
      try {
        let res;
        if (mediaType && tmdbId && result.indexerId) {
            const releaseInfo = {
                title: result.title,
                downloadUrl: result.downloadUrl || result.magnetUrl,
                protocol: result.protocol,
                publishDate: result.publishDate,
                indexer: result.indexer,
                size: result.size,
                guid: result.guid
            }
            res = await downloadMediaRelease(result.guid, result.indexerId, mediaType as any, tmdbId as any, tvdbId, selectedSeason ?? undefined, selectedEpisode ?? undefined, releaseInfo)
        } else {
            const url = result.downloadUrl || result.magnetUrl
            if (!url) {
                failCount++
                continue
            }
            res = await downloadTorrent(url)
        }

        const anyRes = res as any
        const errorMsg = anyRes.error || (anyRes.success === false ? anyRes.message : null)
        if (errorMsg) {
          failCount++
        } else {
          successCount++
          setDownloadSuccess(result.guid)
        }
      } catch (err) {
        failCount++
      }
    }

    setBulkDownloading(false)
    setSelectedGuids(new Set())
    
    if (failCount > 0) {
      alert(`${successCount} torrents ajoutés, ${failCount} échecs.`)
    } else {
      // Clear success indicators after a delay
      setTimeout(() => setDownloadSuccess(null), 3000)
    }
  }

  const toggleSelectAll = () => {
    if (selectedGuids.size === results.length) {
      setSelectedGuids(new Set())
    } else {
      setSelectedGuids(new Set(results.map(r => r.guid)))
    }
  }

  const toggleSelect = (guid: string) => {
    const newSelected = new Set(selectedGuids)
    if (newSelected.has(guid)) {
      newSelected.delete(guid)
    } else {
      newSelected.add(guid)
    }
    setSelectedGuids(newSelected)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getAge = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
    if (diffDays < 1) return 'Aujourd\'hui'
    return `${diffDays}j`
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
        {/* Search Bar */}
        <div className="flex flex-col gap-3">

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input 
                        type="text" 
                        name="search-prowlarr"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck="false"
                        data-1p-ignore="true"
                        data-lpignore="true"
                        data-form-type="other"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
                        placeholder="Rechercher un torrent..."
                        className="w-full bg-gray-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                </div>
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                        showFilters || selectedCategories.length > 0 || selectedIndexers.length > 0
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                        : 'bg-gray-900/50 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                >
                    <Filter className="h-5 w-5" />
                    <span className="hidden sm:inline">Filtres</span>
                    {(selectedCategories.length > 0 || selectedIndexers.length > 0) && (
                        <span className="flex items-center justify-center bg-indigo-500 text-white text-[10px] font-bold h-4 w-4 rounded-full">
                            {selectedCategories.length + selectedIndexers.length}
                        </span>
                    )}
                </button>
                <button 
                    onClick={() => handleSearch(0)}
                    disabled={loading || (!(query || '').trim() && !showRecent && selectedCategories.length === 0 && selectedIndexers.length === 0 && !(mediaType && tmdbId && (mediaType === 'movie' || selectedSeason !== null)))}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {loading && results.length === 0 ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    Rechercher
                </button>
            </div>

            {/* Season & Episode Selector for TV */}
            {mediaType === 'tv' && seasons && seasons.length > 0 && (
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
                        {/* Season Selector */}
                        <div className="flex-1 flex flex-col gap-1">
                            <label className="text-xs text-indigo-300/70 font-medium ml-1">Saison</label>
                            <select 
                                value={selectedSeason ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value ? parseInt(e.target.value) : null
                                    setSelectedSeason(val)
                                    // Reset episode when season changes, unless it's the same season (unlikely here)
                                    if (val !== selectedSeason) setSelectedEpisode(null)
                                }}
                                className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-gray-900/80"
                            >
                                <option value="">-- Sélectionner une saison --</option>
                                {seasons.filter((s: any) => s.season_number > 0).map((season: any) => (
                                    <option key={season.season_number} value={season.season_number}>
                                        {season.name} (Saison {season.season_number}) - {season.episode_count} épisodes
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Episode Selector */}
                        <div className="flex-1 flex flex-col gap-1">
                            <label className="text-xs text-indigo-300/70 font-medium ml-1">Épisode</label>
                            <select 
                                value={selectedEpisode ?? ''}
                                onChange={(e) => setSelectedEpisode(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={selectedSeason === null || loadingEpisodes}
                                className="w-full bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-gray-900/80 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Toute la saison (Pack)</option>
                                {loadingEpisodes ? (
                                    <option disabled>Chargement des épisodes...</option>
                                ) : (
                                    episodeList.map((episode: any) => (
                                        <option key={episode.id} value={episode.episode_number}>
                                            E{episode.episode_number} - {episode.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Filters */}
            {showFilters && (
                <div className="space-y-4 p-4 bg-gray-900/40 border border-white/5 rounded-xl animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Filter className="h-4 w-4 text-indigo-400" />
                                Options de filtrage
                            </h3>
                            <button
                                onClick={() => setShowRecent(!showRecent)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                    showRecent 
                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                                    : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <Clock className="h-3 w-3" />
                                Nouveautés (RSS)
                            </button>
                        </div>
                        {(selectedCategories.length > 0 || selectedIndexers.length > 0 || showRecent) && (
                            <button 
                                onClick={() => {
                                    setSelectedCategories([])
                                    setSelectedIndexers([])
                                    setShowRecent(false)
                                }}
                                className="text-[10px] text-gray-500 hover:text-indigo-400 font-bold uppercase tracking-wider transition-colors"
                            >
                                Réinitialiser
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Categories */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <Film className="h-3 w-3" />
                                Catégories
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon
                                    const isSelected = selectedCategories.includes(cat.id)
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedCategories(prev => 
                                                    prev.includes(cat.id) 
                                                    ? prev.filter(id => id !== cat.id)
                                                    : [...prev, cat.id]
                                                )
                                            }}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                                isSelected 
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                                : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                                            }`}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            {cat.name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Indexers */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <Database className="h-3 w-3" />
                                Indexeurs
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                {indexers.length === 0 ? (
                                    <p className="text-xs text-gray-600 italic">Chargement des indexeurs...</p>
                                ) : (
                                    indexers.map((indexer) => {
                                        const isSelected = selectedIndexers.includes(indexer.id)
                                        return (
                                            <button
                                                key={indexer.id}
                                                onClick={() => {
                                                    setSelectedIndexers(prev => 
                                                        prev.includes(indexer.id) 
                                                        ? prev.filter(id => id !== indexer.id)
                                                        : [...prev, indexer.id]
                                                    )
                                                }}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                                    isSelected 
                                                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                                                }`}
                                            >
                                                {indexer.name}
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Results */}
        {error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                {error}
            </div>
        ) : (
            <div className="space-y-4">
                {selectedGuids.size > 0 && (
                    <div className="flex items-center justify-between p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-3 text-indigo-300 font-medium text-sm">
                            <CheckCircle2 className="h-5 w-5" />
                            {selectedGuids.size} torrent{selectedGuids.size > 1 ? 's' : ''} sélectionné{selectedGuids.size > 1 ? 's' : ''}
                        </div>
                        <button
                            onClick={handleBulkDownload}
                            disabled={bulkDownloading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {bulkDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            Télécharger la sélection
                        </button>
                    </div>
                )}
                <div className="bg-gray-900/30 rounded-xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-gray-400 font-medium uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={results.length > 0 && selectedGuids.size === results.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/50 h-4 w-4 transition-all"
                                        />
                                    </th>
                                    <th className="px-4 py-3">Titre</th>
                                    <th 
                                        className="px-4 py-3 w-24 cursor-pointer hover:text-white transition-colors"
                                        onClick={() => {
                                            if (sortBy === 'publishDate') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
                                            else { setSortBy('publishDate'); setSortOrder('desc'); }
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            Age
                                            {sortBy === 'publishDate' && (sortOrder === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronDown className="h-3 w-3 rotate-180" />)}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 w-28 cursor-pointer hover:text-white transition-colors"
                                        onClick={() => {
                                            if (sortBy === 'size') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
                                            else { setSortBy('size'); setSortOrder('desc'); }
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            Taille
                                            {sortBy === 'size' && (sortOrder === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronDown className="h-3 w-3 rotate-180" />)}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 w-24 text-center cursor-pointer hover:text-white transition-colors"
                                        onClick={() => {
                                            if (sortBy === 'seeders') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
                                            else { setSortBy('seeders'); setSortOrder('desc'); }
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            S/L
                                            {sortBy === 'seeders' && (sortOrder === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronDown className="h-3 w-3 rotate-180" />)}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 w-32">Indexeur</th>
                                    <th className="px-4 py-3 w-16">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {results.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500 italic">
                                            <div className="flex flex-col items-center justify-center">
                                                <Search className="h-12 w-12 mb-4 opacity-20" />
                                                <p>Aucun résultat trouvé</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    results.map((result, i) => (
                                        <tr 
                                            key={result.guid + i} 
                                            className={`hover:bg-white/10 transition-colors group ${selectedGuids.has(result.guid) ? 'bg-indigo-500/5' : ''}`}
                                        >
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedGuids.has(result.guid)}
                                                    onChange={() => toggleSelect(result.guid)}
                                                    className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/50 h-4 w-4 transition-all"
                                                />
                                            </td>
                                            <td className="px-4 py-3 cursor-pointer" onClick={() => toggleSelect(result.guid)}>
                                                <div className="font-medium text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight" title={result.title}>
                                                    {result.title}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {result.indexerFlags?.map((flag: string) => (
                                                        <span key={flag} className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
                                                            {flag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                                                {getAge(result.publishDate)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 font-medium whitespace-nowrap text-xs">
                                                {formatSize(result.size)}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-green-500 font-bold text-sm">{result.seeders}</span>
                                                    <span className="text-red-500/70 text-[10px]">{result.leechers} leech</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg w-fit border border-white/5">
                                                    <Database className="h-3 w-3 text-indigo-400" />
                                                    <span className="text-[11px] font-medium truncate max-w-[100px]">{result.indexer}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {canManage && (
                                                <button
                                                    onClick={() => handleDownload(result.guid, result.downloadUrl || result.magnetUrl, result.indexerId)}
                                                    disabled={downloading === result.guid || downloadSuccess === result.guid}
                                                    className={`p-2.5 rounded-lg transition-all active:scale-95 ${
                                                        downloadSuccess === result.guid
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                                    }`}
                                                    title="Télécharger"
                                                >
                                                    {downloading === result.guid ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : downloadSuccess === result.guid ? (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    ) : (
                                                        <Download className="h-4 w-4" />
                                                    )}
                                                </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Controls */}
                {(results.length > 0 || loading) && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
                        <div className="text-xs text-gray-500 font-medium">
                            Affichage de <span className="text-gray-300">{results.length}</span> résultats
                            {page > 0 && <span> (Page {page + 1})</span>}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleSearch((page - 1) * RESULTS_PER_PAGE)}
                                disabled={loading || page === 0}
                                className="p-2 bg-gray-900/50 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                                title="Page précédente"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            
                            <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-xs font-bold min-w-[80px] text-center">
                                Page {page + 1}
                            </div>

                            <button
                                onClick={() => handleSearch((page + 1) * RESULTS_PER_PAGE)}
                                disabled={loading || !hasMore}
                                className="p-2 bg-gray-900/50 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                                title="Page suivante"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                            
                            <button
                                onClick={() => handleSearch((page + 1) * RESULTS_PER_PAGE, true)}
                                disabled={loading || !hasMore}
                                className="ml-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-30"
                            >
                                {loading && results.length > 0 ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                Charger plus
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  )
}
