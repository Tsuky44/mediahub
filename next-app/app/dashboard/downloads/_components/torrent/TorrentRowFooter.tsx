'use client'

import clsx from 'clsx'
import { Download, Upload, Users, Signal } from 'lucide-react'

import { Torrent } from '@/lib/services/qbittorrent'
import { formatSize, formatSpeed, formatEta } from '../../_utils/torrent-formatters'
import { VisibleColumns } from './TorrentRow'

interface TorrentRowFooterProps {
    torrent: Torrent
    isPaused: boolean
    isUploading: boolean
    isCompleted: boolean
    visibleColumns: VisibleColumns
}

export default function TorrentRowFooter({
    torrent,
    isPaused,
    isUploading,
    isCompleted,
    visibleColumns,
}: TorrentRowFooterProps) {
    return (
        <div className="flex flex-col sm:flex-row items-center gap-3 text-xs text-gray-400 w-full px-1">
            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto shrink-0">
                {visibleColumns.download_info && (
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                            <Download className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold tracking-tight">{formatSize(torrent.downloaded)}</span>
                            <span className="text-emerald-400 text-[10px] font-bold">{formatSpeed(torrent.dlspeed)}</span>
                        </div>
                    </div>
                )}

                {visibleColumns.download_info && visibleColumns.upload_info && <div className="w-px h-8 bg-white/5" />}

                {visibleColumns.upload_info && (
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                            <Upload className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold tracking-tight">{formatSize(torrent.uploaded)}</span>
                            <span className="text-blue-400 text-[10px] font-bold">{formatSpeed(torrent.upspeed)}</span>
                        </div>
                    </div>
                )}

                {visibleColumns.upload_info && visibleColumns.peers && <div className="w-px h-8 bg-white/5 hidden lg:block" />}

                {visibleColumns.peers && (
                    <div className="flex items-center gap-2 hidden lg:flex">
                        <div className="p-1.5 bg-purple-500/10 rounded-lg">
                            <Users className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold tracking-tight">{torrent.num_seeds} <span className="text-gray-500 text-[10px]">seeders</span></span>
                            <span className="text-purple-400 text-[10px] font-bold">{torrent.num_leechs} <span className="text-purple-400/60">leechers</span></span>
                        </div>
                    </div>
                )}

                {visibleColumns.peers && visibleColumns.availability && <div className="w-px h-8 bg-white/5 hidden lg:block" />}

                {visibleColumns.availability && (
                    <div className="flex items-center gap-2 hidden lg:flex">
                        <div className="p-1.5 bg-amber-500/10 rounded-lg">
                            <Signal className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold tracking-tight">{torrent.availability === -1 ? '∞' : torrent.availability.toFixed(2)}</span>
                            <span className="text-amber-400 text-[10px] font-bold">Dispo.</span>
                        </div>
                    </div>
                )}

                {(visibleColumns.peers || visibleColumns.availability) && visibleColumns.ratio && <div className="w-px h-8 bg-white/5 hidden md:block" />}

                {visibleColumns.ratio && (
                    <div className="flex flex-col hidden md:flex min-w-[60px]">
                        <span className="text-gray-500 text-[10px] uppercase font-black tracking-wider">Ratio</span>
                        <span className={clsx(
                            'font-black text-sm',
                            torrent.ratio >= 2 ? 'text-emerald-400' : torrent.ratio >= 1 ? 'text-blue-400' : 'text-red-400'
                        )}>{torrent.ratio.toFixed(2)}</span>
                    </div>
                )}
            </div>

            {/* Progress Bar & Percentage */}
            {(visibleColumns.progress_bar || visibleColumns.eta || visibleColumns.progress_text) && (
                <div className="flex items-center gap-4 flex-1 w-full min-w-0 pl-2 sm:pl-4 border-l border-white/5">
                    {visibleColumns.progress_bar && (
                        <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden relative shadow-inner">
                            <div
                                className={clsx(
                                    'h-full transition-all duration-1000 rounded-full relative overflow-hidden',
                                    isPaused ? 'bg-gray-600' :
                                    isUploading ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(119,153,109,0.3)]' :
                                    'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(232,230,228,0.12)]'
                                )}
                                style={{ width: `${(torrent.progress * 100).toFixed(1)}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                            </div>
                        </div>
                    )}

                    <div className={clsx(
                        'flex items-center gap-4 shrink-0',
                        !visibleColumns.progress_bar && 'ml-auto'
                    )}>
                        {visibleColumns.progress_text && (
                            <div className="flex flex-col items-end min-w-[50px]">
                                <span className="font-black text-white text-sm tracking-tight">
                                    {(torrent.progress * 100).toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                    Progression
                                </span>
                            </div>
                        )}

                        {visibleColumns.eta && (
                            <div className="flex flex-col items-end min-w-[50px]">
                                <span className="font-black text-white text-sm tracking-tight">
                                    {isCompleted
                                        ? (torrent.max_seeding_time === -1 || torrent.max_seeding_time === -2
                                            ? '∞'
                                            : formatEta(Math.max(0, (torrent.max_seeding_time * 60) - torrent.seeding_time)))
                                        : formatEta(torrent.eta)
                                    }
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                    {isCompleted ? 'Restant' : 'ETA'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
