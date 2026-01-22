'use client'

import { useState, useEffect } from 'react'
import { Clock, Database, ArrowDownCircle } from 'lucide-react'
import { checkDownloadStatus, DownloadStatus } from './download-status-actions'

interface DownloadStatusCardProps {
    tmdbId: number
    mediaType: 'movie' | 'tv'
    tvdbId?: number
    title?: string
}

export function DownloadStatusCard({ tmdbId, mediaType, tvdbId, title }: DownloadStatusCardProps) {
    const [status, setStatus] = useState<DownloadStatus | null>(null)
    const [loading, setLoading] = useState(true)

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

        // Poll every 3 seconds
        const interval = setInterval(fetchStatus, 3000)

        return () => clearInterval(interval)
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
    const visibleSeasons = isTv && status.seasons ? status.seasons.filter(s => s.status !== 'Missing') : []

    return (
        <div className={`bg-${color}-500/10 border border-${color}-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 bg-${color}-500/20 rounded-lg animate-pulse`}>
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

            <div className="space-y-2">
                {/* Progress Bar (Only if downloading) */}
                {status.isDownloading && (
                    <div className="h-2 w-full bg-gray-700/50 rounded-full overflow-hidden">
                        <div 
                            className={`h-full bg-${color}-500 transition-all duration-500 ease-out`}
                            style={{ width: `${status.progress}%` }}
                        />
                    </div>
                )}

                {/* Details (Only if downloading) */}
                {status.isDownloading && (
                    <div className="flex items-center justify-between text-[10px] font-medium text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="bg-white/5 px-2 py-0.5 rounded flex items-center gap-1">
                                <Database className="h-3 w-3" />
                                {status.sizeLeft} / {status.size}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-white/5 px-2 py-0.5 rounded flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {status.timeleft}
                            </span>
                            <span className={`px-2 py-0.5 rounded uppercase bg-${color}-500/10 text-${color}-400`}>
                                {status.status}
                            </span>
                        </div>
                    </div>
                )}

                {/* TV Seasons List (If available) */}
                {visibleSeasons.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
                        {visibleSeasons.map((season) => (
                            <div key={season.seasonNumber} className="grid grid-cols-12 gap-2 items-center p-2 rounded hover:bg-white/5 transition text-xs">
                                <div className="col-span-3 font-bold text-white">Saison {season.seasonNumber}</div>
                                <div className="col-span-3 text-gray-400 truncate">{season.quality}</div>
                                <div className="col-span-2 text-gray-500 truncate">{season.language}</div>
                                <div className="col-span-2 text-right text-indigo-300">{season.size}</div>
                                <div className="col-span-2 text-right text-gray-500 text-[10px]">{season.dateAdded}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
