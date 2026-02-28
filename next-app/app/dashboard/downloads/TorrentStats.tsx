'use client'

import { useState, useEffect } from 'react'
import { getGlobalStats } from './actions'
import { ArrowDown, ArrowUp, HardDrive, Activity, Clock, Database } from 'lucide-react'

export function TorrentStats() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            const data = await getGlobalStats()
            if (data) setStats(data)
            setLoading(false)
        }

        fetchStats()
        const interval = setInterval(fetchStats, 2000)
        return () => clearInterval(interval)
    }, [])

    if (loading || !stats) return null

    const formatSpeed = (bytes: number) => {
        if (bytes === 0) return '0 o/s'
        const k = 1024
        const sizes = ['o/s', 'Ko/s', 'Mo/s', 'Go/s']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 o'
        const k = 1024
        const sizes = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Speed */}
            <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vitesse Actuelle</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] text-gray-500 font-medium mb-0.5">Téléchargement</p>
                        <p className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                            {formatSpeed(stats.dl_info_speed)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-medium mb-0.5">Émission</p>
                        <p className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                            <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                            {formatSpeed(stats.up_info_speed)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Session */}
            <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Session</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] text-gray-500 font-medium mb-0.5">Téléchargé</p>
                        <p className="text-sm font-bold text-white font-mono">{formatSize(stats.dl_info_data)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-medium mb-0.5">Envoyé</p>
                        <p className="text-sm font-bold text-white font-mono">{formatSize(stats.up_info_data)}</p>
                    </div>
                </div>
            </div>

            {/* All Time */}
            <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-2 mb-3">
                    <Database className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Global</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <p className="text-[10px] text-gray-500 font-medium mb-0.5">Total DL</p>
                        <p className="text-xs font-bold text-white font-mono">{formatSize(stats.alltime_dl)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-medium mb-0.5">Total UP</p>
                        <p className="text-xs font-bold text-white font-mono">{formatSize(stats.alltime_ul)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-medium mb-0.5">Ratio</p>
                        <p className={`text-xs font-bold font-mono ${stats.global_ratio < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {Number(stats.global_ratio || 0).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Storage */}
            <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-2 mb-3">
                    <HardDrive className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stockage</span>
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 font-medium mb-0.5">Espace Libre</p>
                    <p className="text-lg font-bold text-white font-mono">{formatSize(stats.free_space_on_disk)}</p>
                </div>
            </div>
        </div>
    )
}
