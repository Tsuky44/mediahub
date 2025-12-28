'use client'

import { useState, useEffect } from 'react'
import { Filter, X, ChevronDown, ChevronUp, Check } from 'lucide-react'
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
    const [isOpen, setIsOpen] = useState(false)
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
        <>
            {/* Mobile Toggle */}
            <button 
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 z-40 bg-indigo-600 p-4 rounded-full shadow-lg text-white"
            >
                <Filter className="h-6 w-6" />
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={clsx(
                "fixed inset-y-0 right-0 z-50 w-80 bg-gray-900 border-l border-gray-800 transform transition-transform duration-300 ease-in-out overflow-y-auto p-6",
                "lg:relative lg:translate-x-0 lg:w-72 lg:border-none lg:bg-transparent lg:p-0",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="flex items-center justify-between mb-6 lg:hidden">
                    <h3 className="text-xl font-bold text-white">Filtres</h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Sort */}
                    <div>
                        <h4 className="font-semibold text-white mb-3">Trier par</h4>
                        <select 
                            value={filters.sort_by}
                            onChange={(e) => handleChange('sort_by', e.target.value)}
                            className="w-full bg-gray-800 border-gray-700 rounded-md text-white px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="popularity.desc">Popularité (décroissante)</option>
                            <option value="popularity.asc">Popularité (croissante)</option>
                            <option value="vote_average.desc">Note (décroissante)</option>
                            <option value="vote_average.asc">Note (croissante)</option>
                            <option value="release_date.desc">Date (récent)</option>
                            <option value="release_date.asc">Date (ancien)</option>
                        </select>
                    </div>

                    {/* Dates */}
                    <div>
                        <h4 className="font-semibold text-white mb-3">Date de sortie</h4>
                        <div className="space-y-2">
                            <div>
                                <label className="text-xs text-gray-400">De</label>
                                <input 
                                    type="date" 
                                    value={filters.start_date}
                                    onChange={(e) => handleChange('start_date', e.target.value)}
                                    className="w-full bg-gray-800 border-gray-700 rounded-md text-white px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">À</label>
                                <input 
                                    type="date" 
                                    value={filters.end_date}
                                    onChange={(e) => handleChange('end_date', e.target.value)}
                                    className="w-full bg-gray-800 border-gray-700 rounded-md text-white px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Genres */}
                    <div>
                        <h4 className="font-semibold text-white mb-3">Genres</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {genres.map(genre => (
                                <label key={genre.id} className="flex items-center space-x-2 cursor-pointer group">
                                    <div className={clsx(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                        filters.genres.includes(genre.id) 
                                            ? "bg-indigo-600 border-indigo-600" 
                                            : "border-gray-600 group-hover:border-gray-500"
                                    )}>
                                        {filters.genres.includes(genre.id) && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="text-sm text-gray-300 group-hover:text-white">{genre.name}</span>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={filters.genres.includes(genre.id)}
                                        onChange={() => toggleGenre(genre.id)}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Language */}
                    <div>
                        <h4 className="font-semibold text-white mb-3">Langue</h4>
                        <select 
                            value={filters.language}
                            onChange={(e) => handleChange('language', e.target.value)}
                            className="w-full bg-gray-800 border-gray-700 rounded-md text-white px-3 py-2 text-sm"
                        >
                            <option value="all">Toutes les langues</option>
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Watch Providers */}
                    <div>
                        <h4 className="font-semibold text-white mb-3">Streaming</h4>
                        <select 
                            value={filters.watch_region}
                            onChange={(e) => handleChange('watch_region', e.target.value)}
                            className="w-full bg-gray-800 border-gray-700 rounded-md text-white px-3 py-2 text-sm mb-3"
                        >
                            {REGIONS.map(region => (
                                <option key={region.value} value={region.value}>{region.label}</option>
                            ))}
                        </select>

                        {loadingProviders ? (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : providers.length > 0 ? (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {(showAllProviders ? providers : providers.slice(0, 12)).map(provider => (
                                        <button
                                            key={provider.provider_id}
                                            onClick={() => toggleProvider(provider.provider_id)}
                                            className={clsx(
                                                "relative rounded-lg p-1 transition-all",
                                                filters.watch_providers.includes(provider.provider_id)
                                                    ? "bg-gray-600 ring-2 ring-indigo-500"
                                                    : "bg-gray-800 hover:bg-gray-700"
                                            )}
                                            title={provider.provider_name}
                                        >
                                            <img 
                                                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} 
                                                alt={provider.provider_name}
                                                className="w-10 h-10 object-contain rounded"
                                            />
                                            {filters.watch_providers.includes(provider.provider_id) && (
                                                <div className="absolute -top-1 -right-1 bg-indigo-600 rounded-full p-0.5">
                                                    <Check className="h-3 w-3 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {providers.length > 12 && (
                                    <button 
                                        onClick={() => setShowAllProviders(!showAllProviders)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                    >
                                        {showAllProviders ? 'Voir moins' : 'Voir plus'}
                                        {showAllProviders ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500">Aucun service disponible</p>
                        )}
                    </div>

                    {/* Reset */}
                    <button 
                        onClick={resetFilters}
                        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                        Réinitialiser
                    </button>
                </div>
            </div>
        </>
    )
}
