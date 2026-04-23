'use client'

import { useState, useEffect } from 'react'
import { ArrowDownCircle, ChevronDown, ChevronUp, FolderOpen, Download } from 'lucide-react'
import { checkDownloadStatus, DownloadStatus } from './download-status-actions'

// Interface locale pour éviter les problèmes d'import depuis le fichier server
interface SeasonInfo {
    seasonNumber: number
    status: 'Downloaded' | 'Downloading' | 'Missing' | 'Partial'
    progress?: number
    quality?: string
    size?: string
    language?: string
    dateAdded?: string
    timeleft?: string
    releaseTitle?: string
    isSeasonPack?: boolean
}

interface DownloadStatusCardProps {
    tmdbId: number
    mediaType: 'movie' | 'tv'
    tvdbId?: number
    title?: string
}

export function DownloadStatusCard({ tmdbId, mediaType, tvdbId, title }: DownloadStatusCardProps) {
    const [status, setStatus] = useState<DownloadStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [isSeasonsOpen, setIsSeasonsOpen] = useState(false)

    const fetchStatus = async () => {
        try {
            const result = await checkDownloadStatus(tmdbId, mediaType, tvdbId, title)
            setStatus(result)
        } catch (e) {
            console.error('Failed to fetch download status', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Initial fetch
        fetchStatus()

        // Patch 8: Polling toutes les 10s (au lieu de 3s) + pause si onglet caché
        const interval = setInterval(() => {
            if (!document.hidden) fetchStatus()
        }, 10000)

        const onVisibilityChange = () => {
            if (!document.hidden) fetchStatus()
        }
        document.addEventListener('visibilitychange', onVisibilityChange)

        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, [tmdbId, mediaType, tvdbId, title])

    if (!status && !loading) return null
    if (!status) return null // Don't show anything while loading initially to avoid flicker if no download
    
    // Show card if downloading OR if we have status info (Downloaded/Partial)
    // But hide if Missing/unknown and not downloading
    if (!status.isDownloading && status.status === 'Missing') return null

    const getStatusText = (s: string) => {
        switch (s) {
            case 'Downloading': return 'Téléchargement en cours'
            case 'Paused': return 'En pause'
            case 'Queued': return 'En file d\'attente'
            case 'Downloaded': return 'Disponible'
            case 'Partial': return 'Partiellement disponible'
            case 'Missing': return 'Manquant'
            default: return 'Téléchargement en cours'
        }
    }

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'Downloading': return 'indigo'
            case 'Paused': return 'amber'
            case 'Queued': return 'slate'
            case 'Downloaded': return 'green'
            case 'Partial': return 'purple'
            case 'Missing': return 'red'
            default: return 'indigo'
        }
    }

    const color = getStatusColor(status.status)
    const isTv = mediaType === 'tv'
    
    // Séparer les saisons en téléchargement des saisons disponibles
    const downloadingSeasons = isTv && status.seasons 
        ? status.seasons.filter(s => s.status === 'Downloading') 
        : []
    const availableSeasons = isTv && status.seasons 
        ? status.seasons.filter(s => s.status !== 'Missing' && s.status !== 'Downloading') 
        : []
    const hasDownloadingSeasons = downloadingSeasons.length > 0
    const hasAvailableSeasons = availableSeasons.length > 0

    return (
        <div className={`bg-${color}-500/10 border border-${color}-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 bg-${color}-500/20 rounded-lg ${status.isDownloading ? 'animate-pulse' : ''}`}>
                    <ArrowDownCircle className={`h-5 w-5 text-${color}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                        {getStatusText(status.status)}
                    </h3>
                    <p className={`text-xs text-${color}-300 truncate`}>
                        {status.title}
                    </p>
                </div>
                {status.isDownloading && (
                    <div className="text-right">
                        <span className="text-sm font-bold text-white">{status.progress}%</span>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {/* Movie Download Progress (no seasons) */}
                {!isTv && status.isDownloading && (
                    <div className="px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex-1">
                                <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full bg-${color}-500 transition-all duration-500 ease-out`}
                                        style={{ width: `${status.progress}%` }}
                                    />
                                </div>
                            </div>
                            <span className="text-sm font-bold text-white shrink-0">{status.progress}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span className="truncate text-gray-500">{status.releaseTitle || status.title}</span>
                            <div className="flex items-center gap-2 shrink-0">
                                <span>{status.sizeLeft} / {status.size}</span>
                                {status.timeleft && <span className="text-indigo-400">{status.timeleft}</span>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Downloads Section - TV Seasons only */}
                {hasDownloadingSeasons && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                            <Download className="h-3.5 w-3.5 text-indigo-400" />
                            <span>En cours ({downloadingSeasons.length})</span>
                        </div>
                        <div className="space-y-2">
                            {downloadingSeasons.map((season) => (
                                <SeasonDownloadRow key={season.seasonNumber} season={season} color={color} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Available Seasons - Menu déroulant */}
                {hasAvailableSeasons && (
                    <div className="border-t border-white/5 pt-2">
                        <button
                            onClick={() => setIsSeasonsOpen(!isSeasonsOpen)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition text-xs font-semibold text-gray-300 hover:text-white"
                        >
                            <div className="flex items-center gap-2">
                                <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
                                <span>Saisons disponibles ({availableSeasons.length})</span>
                            </div>
                            {isSeasonsOpen ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                        </button>
                        
                        {isSeasonsOpen && (
                            <div className="mt-1 space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                                {availableSeasons.map((season) => (
                                    <div 
                                        key={season.seasonNumber} 
                                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-white w-10 shrink-0">S{season.seasonNumber}</span>
                                            <div className="flex-1 flex items-center gap-2 text-gray-400 min-w-0">
                                                <span className="truncate text-gray-300">{season.quality || '-'}</span>
                                                <span className="text-gray-600">•</span>
                                                <span className="text-indigo-300 shrink-0">{season.size}</span>
                                            </div>
                                            <StatusBadge status={season.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// Composant pour une saison en téléchargement avec barre de progression
function SeasonDownloadRow({ season, color }: { season: SeasonInfo; color: string }) {
    return (
        <div className="px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-white w-10 shrink-0 text-sm">S{season.seasonNumber}</span>
                <div className="flex-1">
                    <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden">
                        <div 
                            className={`h-full bg-${color}-500 transition-all duration-500 ease-out`}
                            style={{ width: `${season.progress || 0}%` }}
                        />
                    </div>
                </div>
                <span className="text-sm font-bold text-white shrink-0">{season.progress || 0}%</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400">
                <div className="flex items-center gap-2 overflow-hidden">
                    {season.releaseTitle && (
                        <span className="truncate text-gray-500">{season.releaseTitle}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span>{season.size}</span>
                    {season.timeleft && <span className="text-indigo-400">{season.timeleft}</span>}
                </div>
            </div>
        </div>
    )
}

// Badge de statut pour les saisons disponibles
function StatusBadge({ status }: { status: string }) {
    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'Downloaded': return { color: 'green', text: 'OK' }
            case 'Partial': return { color: 'purple', text: 'Partiel' }
            default: return { color: 'gray', text: s }
        }
    }
    
    const config = getStatusConfig(status)
    
    return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium bg-${config.color}-500/20 text-${config.color}-400`}>
            {config.text}
        </span>
    )
}
