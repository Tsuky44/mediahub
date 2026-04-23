'use client'

import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { requestSeason } from '@/app/dashboard/media/[id]/actions'
import clsx from 'clsx'

interface Season {
    id: number
    name: string
    season_number: number
    episode_count: number
    air_date: string
    poster_path: string | null
}

interface SeasonStatus {
    seasonNumber: number
    status: 'unknown' | 'available' | 'partial' | 'pending' | 'processing'
}

interface SeasonSelectorModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    tmdbId: number
    seasons: Season[]
    seasonStatuses: SeasonStatus[]
    onSuccess: () => void
}

export function SeasonSelectorModal({ isOpen, onClose, title, tmdbId, seasons, seasonStatuses, onSuccess }: SeasonSelectorModalProps) {
    const [selectedSeasons, setSelectedSeasons] = useState<number[]>([])
    const [requesting, setRequesting] = useState(false)

    if (!isOpen) return null

    // Filter out seasons that are already available or pending
    const isSeasonAvailableOrPending = (seasonNumber: number) => {
        const status = seasonStatuses.find(s => s.seasonNumber === seasonNumber)?.status
        return status === 'available' || status === 'partial' || status === 'processing' || status === 'pending'
    }

    const availableSeasonsToRequest = seasons.filter(s => s.season_number > 0 && !isSeasonAvailableOrPending(s.season_number))
    const sortedSeasons = [...availableSeasonsToRequest].sort((a, b) => a.season_number - b.season_number)

    const toggleSeason = (seasonNumber: number) => {
        setSelectedSeasons(prev => 
            prev.includes(seasonNumber) 
                ? prev.filter(n => n !== seasonNumber)
                : [...prev, seasonNumber]
        )
    }

    const handleSelectAll = () => {
        if (selectedSeasons.length === sortedSeasons.length) {
            setSelectedSeasons([])
        } else {
            setSelectedSeasons(sortedSeasons.map(s => s.season_number))
        }
    }

    const handleSubmit = async () => {
        if (selectedSeasons.length === 0) return

        setRequesting(true)
        try {
            // Request each selected season
            // Jellyseerr API supports array of seasons in one request usually?
            // Our action wrapper supports single season currently or we need to update it.
            // Let's update action to support multiple seasons or loop here.
            // Jellyseerr API takes `seasons: [1, 2]` array.
            // We should update `requestSeason` action to accept array.
            
            // For now, let's loop or update the action. Ideally update action.
            // Let's loop for safety if action signature is fixed, but I'll update action below.
            // Wait, I can't update action here. I'll update the action file in next step.
            // Assuming I will update it, let's send array.
            
            // Actually, let's call the action multiple times for now to be safe without changing backend signature yet,
            // OR better: create a new action `requestSeasons`?
            // Or just loop.
            
            const results = await Promise.all(selectedSeasons.map(num => requestSeason(tmdbId, num, title)))
            
            const allSuccess = results.every(r => r.success)
            if (allSuccess) {
                onSuccess()
                onClose()
            } else {
                alert('Certaines demandes ont échoué.')
                onSuccess() // Close anyway to refresh status
                onClose()
            }
        } catch (e) {
            console.error(e)
            alert('Erreur lors de la demande')
        }
        setRequesting(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-800 p-4">
                    <h3 className="text-lg font-semibold text-white">Sélectionner les saisons</h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-800 text-gray-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {sortedSeasons.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Toutes les saisons sont déjà disponibles ou demandées.</p>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex justify-end mb-4">
                                <button 
                                    onClick={handleSelectAll}
                                    className="text-sm text-indigo-400 hover:text-indigo-300"
                                >
                                    {selectedSeasons.length === sortedSeasons.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {sortedSeasons.map((season) => (
                                    <div 
                                        key={season.id}
                                        onClick={() => toggleSeason(season.season_number)}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                                            selectedSeasons.includes(season.season_number)
                                                ? "bg-indigo-900/30 border-indigo-500/50"
                                                : "bg-gray-800 border-gray-700 hover:border-gray-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "flex h-5 w-5 items-center justify-center rounded border",
                                                selectedSeasons.includes(season.season_number)
                                                    ? "bg-indigo-600 border-indigo-600"
                                                    : "border-gray-600 bg-transparent"
                                            )}>
                                                {selectedSeasons.includes(season.season_number) && <Check className="h-3.5 w-3.5 text-white" />}
                                            </div>
                                            <div>
                                                <span className="font-medium text-white">{season.name}</span>
                                                <span className="ml-2 text-sm text-gray-500">({season.episode_count} épisodes)</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-800 p-4 bg-gray-900 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={requesting || selectedSeasons.length === 0}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {requesting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {requesting ? 'Envoi...' : 'Demander'}
                    </button>
                </div>
            </div>
        </div>
    )
}
