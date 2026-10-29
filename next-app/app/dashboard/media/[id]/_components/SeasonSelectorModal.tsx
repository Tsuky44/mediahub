'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { requestSelectedSeasons } from '@/app/dashboard/media/[id]/actions'
import clsx from 'clsx'
import { OnyxTrack, useOnyxPhase } from '@/components/ui/onyx'

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
    status: 'unknown' | 'available' | 'partial' | 'pending' | 'processing' | 'unreleased'
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
    const { phase, error, run } = useOnyxPhase()
    const busy = phase === 'sending' || phase === 'done'

    if (!isOpen) return null

    // Filter out seasons that are already available or pending
    const isSeasonAvailableOrPending = (seasonNumber: number) => {
        const status = seasonStatuses.find(s => s.seasonNumber === seasonNumber)?.status
        return status === 'available' || status === 'partial' || status === 'processing' || status === 'pending' || status === 'unreleased'
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

    const handleSubmit = () => {
        if (selectedSeasons.length === 0) return
        run(async () => {
            const result = await requestSelectedSeasons(tmdbId, title, selectedSeasons)
            // Échec partiel : les saisons acceptées apparaissent quand même
            if (!result.success) onSuccess()
            return { ok: result.success, message: result.message }
        }, () => {
            onSuccess()
            onClose()
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div
                className="onyx-glass-2 w-full max-w-lg overflow-hidden rounded-3xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                    <h3 className="text-lg font-semibold text-white">Sélectionner les saisons</h3>
                    <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1 hover:bg-white/10 text-gray-400 hover:text-white">
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
                                            "flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-colors duration-200 ease-onyx",
                                            selectedSeasons.includes(season.season_number)
                                                ? "bg-white/10 border-white/25"
                                                : "bg-white/[0.03] border-white/10 hover:border-white/20"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "flex h-5 w-5 items-center justify-center rounded-md border transition-colors duration-200 ease-onyx",
                                                selectedSeasons.includes(season.season_number)
                                                    ? "bg-onyx-ink border-onyx-ink"
                                                    : "border-white/25 bg-transparent"
                                            )}>
                                                {selectedSeasons.includes(season.season_number) && <Check className="h-3.5 w-3.5 text-onyx-bg animate-pop-in" />}
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

                <div className="border-t border-white/10 p-4 flex flex-wrap items-center justify-end gap-3">
                    {phase === 'error' && (
                        <p role="alert" className="mr-auto text-sm leading-snug animate-fade-in">
                            <span className="font-semibold text-red-300">Demande non envoyée.</span>{' '}
                            <span className="text-gray-400">{error ? `${error}. ` : ''}Vous pouvez réessayer.</span>
                        </p>
                    )}
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={busy || selectedSeasons.length === 0}
                        aria-busy={phase === 'sending'}
                        className={clsx(
                            "relative overflow-hidden flex min-w-[9.5rem] items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-full border border-white/20 bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:bg-white/20 transition-[background-color,scale] duration-300 ease-onyx disabled:cursor-not-allowed disabled:hover:bg-white/15",
                            phase === 'idle' && selectedSeasons.length === 0 && "opacity-50"
                        )}
                    >
                        {phase === 'done' && <span aria-hidden className="absolute inset-0 origin-left bg-onyx-ink animate-onyx-fill" />}
                        <span aria-live="polite" className={clsx("relative inline-flex items-center gap-2", phase === 'done' && "mix-blend-difference")}>
                            {phase === 'done' && <Check className="h-4 w-4 animate-pop-in" />}
                            {phase === 'sending' ? 'Envoi' : phase === 'done' ? 'Demande envoyée' : 'Demander'}
                        </span>
                        {phase === 'sending' && <OnyxTrack className="absolute inset-x-5 bottom-1" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
