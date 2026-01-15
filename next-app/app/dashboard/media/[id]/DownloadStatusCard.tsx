'use client'

import { useState, useEffect } from 'react'
import { Clock, Database, ArrowDownCircle, CheckCircle } from 'lucide-react'
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

    if (status.status === 'Downloaded' || status.status === 'Partial') {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">
                            {status.status === 'Partial' ? 'Partiellement disponible' : 'Disponible'}
                        </h3>
                        <p className="text-xs text-emerald-300 truncate">
                            {status.title}
                        </p>
                    </div>
                </div>

                {status.seasons && status.seasons.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {status.seasons.filter(s => s.status !== 'Missing').map((season) => (
                            <div key={season.seasonNumber} className="bg-white/5 p-2 rounded text-[10px] space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-white">Saison {season.seasonNumber}</span>
                                    {season.status === 'Downloading' ? (
                                        <span className="text-indigo-400 font-medium flex items-center gap-1">
                                            <ArrowDownCircle className="h-3 w-3" />
                                            {season.progress}%
                                        </span>
                                    ) : (
                                        <span className="text-emerald-400 font-medium">{season.size}</span>
                                    )}
                                </div>
                                {season.status === 'Downloading' ? (
                                     <div className="h-1 w-full bg-gray-700/50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                                            style={{ width: `${season.progress}%` }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-400">
                                            <div className="truncate" title={season.quality}>{season.quality}</div>
                                            <div className="text-right truncate" title={season.dateAdded}>{season.dateAdded}</div>
                                            <div className="col-span-2 truncate text-gray-500" title={season.language}>{season.language}</div>
                                        </div>
                                        {season.releaseTitle && season.isSeasonPack && (
                                            <div className="mt-2 p-2 bg-black/20 rounded border border-emerald-500/10">
                                                <p className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">Release Pack</p>
                                                <p className="truncate text-emerald-400 font-mono text-[10px]" title={season.releaseTitle}>
                                                    {season.releaseTitle}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {status.releaseTitle && (
                            <div className="mb-3 px-3 py-2 bg-black/20 rounded-lg border border-white/5">
                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Release</p>
                                <p className="text-xs text-emerald-100 font-mono truncate" title={status.releaseTitle}>
                                    {status.releaseTitle}
                                </p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                            <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
                                <span className="text-gray-500 uppercase font-bold text-[9px]">Qualité</span>
                                <span className="text-white font-medium truncate" title={status.quality}>{status.quality}</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
                                <span className="text-gray-500 uppercase font-bold text-[9px]">Taille</span>
                                <span className="text-white font-medium">{status.size}</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
                                <span className="text-gray-500 uppercase font-bold text-[9px]">Langue</span>
                                <span className="text-white font-medium truncate" title={status.language}>{status.language}</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
                                <span className="text-gray-500 uppercase font-bold text-[9px]">Ajouté le</span>
                                <span className="text-white font-medium">{status.dateAdded}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg animate-pulse">
                    <ArrowDownCircle className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                        Téléchargement en cours
                    </h3>
                    <p className="text-xs text-indigo-300 truncate">
                        {status.title}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-sm font-bold text-white">{status.progress}%</span>
                </div>
            </div>

            <div className="space-y-2">
                {/* Progress Bar */}
                <div className="h-2 w-full bg-gray-700/50 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                        style={{ width: `${status.progress}%` }}
                    />
                </div>

                {/* Details */}
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
                        <span className={`px-2 py-0.5 rounded uppercase ${
                            status.status === 'Downloading' ? 'bg-green-500/10 text-green-400' :
                            status.status === 'Paused' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-gray-500/10 text-gray-400'
                        }`}>
                            {status.status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
