'use client'

import { Activity, ArrowDown, ArrowUp, Users, Clock, Globe, HardDrive } from 'lucide-react'
import { formatStatsSize, formatStatsSpeed, formatRatio } from '../../_utils/stats-formatters'
import type { GlobalStats } from '../../_hooks/useGlobalStats'

interface TorrentStatsBarProps {
    stats: GlobalStats
}

/** Barre horizontale des stats globales : vitesse/connexions, session, global. */
export function TorrentStatsBar({ stats }: TorrentStatsBarProps) {
    const globalRatio = stats.alltime_dl > 0 ? stats.alltime_ul / stats.alltime_dl : 0
    const dlSpeed = formatStatsSpeed(stats.dl_info_speed).split(' ')
    const upSpeed = formatStatsSpeed(stats.up_info_speed).split(' ')
    const freeSpace = formatStatsSize(stats.free_space_on_disk).split(' ')

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="md:col-span-2 bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vitesse & Connexions</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">DL</p>
                        <p className="text-xs font-bold text-white font-mono flex items-center gap-1">
                            <ArrowDown className="w-3 h-3 text-emerald-500" />
                            {dlSpeed[0]} <span className="text-[9px] text-gray-500">{dlSpeed[1]}</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">UP</p>
                        <p className="text-xs font-bold text-white font-mono flex items-center gap-1">
                            <ArrowUp className="w-3 h-3 text-blue-500" />
                            {upSpeed[0]} <span className="text-[9px] text-gray-500">{upSpeed[1]}</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Seeds</p>
                        <p className="text-xs font-bold text-white font-mono flex items-center gap-1">
                            <Users className="w-3 h-3 text-emerald-500" />
                            {stats.global_seeds || 0}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Leechs</p>
                        <p className="text-xs font-bold text-white font-mono flex items-center gap-1">
                            <Users className="w-3 h-3 text-blue-500" />
                            {stats.global_leechs || 0}
                        </p>
                    </div>
                </div>
            </div>

            <div className="md:col-span-1 bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Session</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Téléchargé</p>
                        <p className="text-xs font-bold text-white font-mono">{formatStatsSize(stats.dl_info_data)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Envoyé</p>
                        <p className="text-xs font-bold text-white font-mono">{formatStatsSize(stats.up_info_data)}</p>
                    </div>
                </div>
            </div>

            <div className="md:col-span-2 bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Global</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Total DL</p>
                        <p className="text-xs font-bold text-white font-mono truncate">{formatStatsSize(stats.alltime_dl)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Total UP</p>
                        <p className="text-xs font-bold text-white font-mono truncate">{formatStatsSize(stats.alltime_ul)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Ratio</p>
                        <p className={`text-xs font-bold font-mono ${globalRatio < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatRatio(globalRatio)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Libre</p>
                        <p className="text-xs font-bold text-white font-mono flex items-center gap-1 truncate">
                            <HardDrive className="w-3 h-3 text-gray-400" />
                            {freeSpace[0]}
                            <span className="text-[9px] text-gray-500">{freeSpace[1]}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
