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
