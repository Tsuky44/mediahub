'use client'

import { useState, useEffect } from 'react'
import { Filter, X, ChevronDown, ChevronUp, Check, SortDesc, Calendar, Globe, Monitor, RotateCcw } from 'lucide-react'
import { getFilterOptions, getWatchProviders } from '@/app/dashboard/requests/actions'
import clsx from 'clsx'

interface MediaFiltersProps {
    type: 'movie' | 'tv' | 'all'
    onFilterChange: (filters: any) => void
}

const REGIONS = [
    { value: 'FR', label: 'France' },
    { value: 'US', label: 'États-Unis' },
    { value: 'CA', label: 'Canada' },
    { value: 'GB', label: 'Royaume-Uni' },
    { value: 'DE', label: 'Allemagne' },
    { value: 'ES', label: 'Espagne' },
    { value: 'IT', label: 'Italie' },
    { value: 'BE', label: 'Belgique' },
    { value: 'CH', label: 'Suisse' },
    { value: 'AU', label: 'Australie' }
]

const LANGUAGES = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'Anglais' },
    { code: 'ja', name: 'Japonais' },
    { code: 'es', name: 'Espagnol' },
    { code: 'de', name: 'Allemand' },
    { code: 'it', name: 'Italien' },
    { code: 'ko', name: 'Coréen' },
    { code: 'zh', name: 'Chinois' }
]

export function MediaFilters({ type, onFilterChange }: MediaFiltersProps) {
    const [genres, setGenres] = useState<any[]>([])
    const [providers, setProviders] = useState<any[]>([])
    const [showAllProviders, setShowAllProviders] = useState(false)
    const [loadingProviders, setLoadingProviders] = useState(false)

    const [filters, setFilters] = useState({
        sort_by: 'popularity.desc',
        start_date: '',
        end_date: '',
        genres: [] as number[],
        language: 'all',
        min_duration: '',
        max_duration: '',
        watch_region: 'FR',
        watch_providers: [] as number[]
    })

    useEffect(() => {
        // Load genres
        getFilterOptions(type).then(data => {
            setGenres(data.genres)
        })

        // Load providers
        loadProviders()
    }, [type])

    useEffect(() => {
        loadProviders()
    }, [filters.watch_region, type])

    const loadProviders = async () => {
        setLoadingProviders(true)
        const data = await getWatchProviders(type, filters.watch_region)
        setProviders(data)
        setLoadingProviders(false)
    }

    const handleChange = (key: string, value: any) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    const toggleGenre = (id: number) => {
        const current = filters.genres
        const updated = current.includes(id) 
            ? current.filter(g => g !== id)
            : [...current, id]
        handleChange('genres', updated)
    }

    const toggleProvider = (id: number) => {
        const current = filters.watch_providers
        const updated = current.includes(id) 
            ? current.filter(p => p !== id)
            : [...current, id]
        handleChange('watch_providers', updated)
    }

    const resetFilters = () => {
        const reset = {
            sort_by: 'popularity.desc',
            start_date: '',
            end_date: '',
            genres: [],
            language: 'all',
            min_duration: '',
            max_duration: '',
            watch_region: 'FR',
            watch_providers: []
        }
        setFilters(reset)
        onFilterChange(reset)
    }

    if (type === 'all' && false) return null // Force enable

    return (
        <div className="space-y-8 pb-10">
            {/* Quick Reset & Header */}
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Configuration des filtres</h4>
                <button 
                    onClick={resetFilters}
                    className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-400/10 px-3 py-1.5 rounded-full"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Réinitialiser tout
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Column 1: Sort & Dates & Language */}
                <div className="space-y-8">
                    {/* Sort */}
                    <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-indigo-400">
                            <SortDesc className="h-4 w-4" />
                            <h4 className="font-bold text-white">Trier par</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { value: 'popularity.desc', label: 'Popularité (décr.)' },
                                { value: 'popularity.asc', label: 'Popularité (crois.)' },
                                { value: 'vote_average.desc', label: 'Note (décr.)' },
                                { value: 'vote_average.asc', label: 'Note (crois.)' },
                                { value: 'release_date.desc', label: 'Date (récent)' },
                                { value: 'release_date.asc', label: 'Date (ancien)' },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleChange('sort_by', opt.value)}
                                    className={clsx(
                                        "text-left px-4 py-2.5 rounded-xl text-sm transition-all border",
                                        filters.sort_by === opt.value
                                            ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 font-semibold shadow-sm"
                                            : "bg-transparent border-transparent text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-indigo-400">
                            <Calendar className="h-4 w-4" />
                            <h4 className="font-bold text-white">Période</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">De</label>
                                <input 
                                    type="date" 
                                    value={filters.start_date}
                                    onChange={(e) => handleChange('start_date', e.target.value)}
                                    className="w-full bg-gray-900 border-gray-700 rounded-xl text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">À</label>
                                <input 
                                    type="date" 
                                    value={filters.end_date}
                                    onChange={(e) => handleChange('end_date', e.target.value)}
                                    className="w-full bg-gray-900 border-gray-700 rounded-xl text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Language */}
                    <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-indigo-400">
                            <Globe className="h-4 w-4" />
                            <h4 className="font-bold text-white">Langue</h4>
                        </div>
                        <select 
                            value={filters.language}
                            onChange={(e) => handleChange('language', e.target.value)}
                            className="w-full bg-gray-900 border-gray-700 rounded-xl text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
                        >
                            <option value="all">Toutes les langues</option>
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Column 2: Genres */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-indigo-400">
                            <Filter className="h-4 w-4" />
                            <h4 className="font-bold text-white">Genres</h4>
                        </div>
                        <span className="text-[10px] bg-indigo-500/20 px-2.5 py-1 rounded-full text-indigo-400 font-bold border border-indigo-500/30">
                            {filters.genres.length} sélectionné{filters.genres.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-gray-800/20 p-2 rounded-2xl border border-gray-800/50">
                        {genres.map(genre => (
                            <button 
                                key={genre.id} 
                                onClick={() => toggleGenre(genre.id)}
                                className={clsx(
                                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all border group",
                                    filters.genres.includes(genre.id)
                                        ? "bg-indigo-500 border-indigo-400 text-white font-semibold shadow-md shadow-indigo-500/20"
                                        : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                                )}
                            >
                                <span className="truncate">{genre.name}</span>
                                {filters.genres.includes(genre.id) ? (
                                    <Check className="h-3.5 w-3.5 shrink-0 ml-1" />
                                ) : (
                                    <div className="h-3.5 w-3.5 rounded-full border border-gray-600 group-hover:border-gray-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Column 3: Streaming */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                        <Monitor className="h-4 w-4" />
                        <h4 className="font-bold text-white">Streaming</h4>
                    </div>
                    <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 shadow-sm space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Région</label>
                            <select 
                                value={filters.watch_region}
                                onChange={(e) => handleChange('watch_region', e.target.value)}
                                className="w-full bg-gray-900 border-gray-700 rounded-xl text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                            >
                                {REGIONS.map(region => (
                                    <option key={region.value} value={region.value}>{region.label}</option>
                                ))}
                            </select>
                        </div>

                        {loadingProviders ? (
                            <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                <p className="text-xs text-gray-500 animate-pulse">Chargement des services...</p>
                            </div>
                        ) : providers.length > 0 ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {(showAllProviders ? providers : providers.slice(0, 12)).map(provider => (
                                        <button
                                            key={provider.provider_id}
                                            onClick={() => toggleProvider(provider.provider_id)}
                                            className={clsx(
                                                "relative aspect-square rounded-2xl p-1.5 transition-all border group overflow-hidden",
                                                filters.watch_providers.includes(provider.provider_id)
                                                    ? "bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/50"
                                                    : "bg-gray-900 border-gray-700 hover:border-gray-500"
                                            )}
                                            title={provider.provider_name}
                                        >
                                            <img 
                                                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} 
                                                alt={provider.provider_name}
                                                className="w-full h-full object-contain rounded-xl"
                                            />
                                            {filters.watch_providers.includes(provider.provider_id) && (
                                                <div className="absolute top-1 right-1 bg-indigo-500 rounded-full p-1 shadow-lg border border-white/20">
                                                    <Check className="h-2.5 w-2.5 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {providers.length > 12 && (
                                    <button 
                                        onClick={() => setShowAllProviders(!showAllProviders)}
                                        className="w-full py-3 bg-gray-900/50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/5 flex items-center justify-center gap-2 transition-all border border-gray-800/50 hover:border-indigo-500/30"
                                    >
                                        {showAllProviders ? 'Voir moins' : `+ ${providers.length - 12} autres services`}
                                        {showAllProviders ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2 bg-gray-900/50 rounded-2xl border border-dashed border-gray-700">
                                <Monitor className="h-8 w-8 text-gray-700" />
                                <p className="text-xs text-gray-500 font-medium">
                                    Aucun service de streaming disponible pour cette région.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
