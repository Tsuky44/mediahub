'use client'

import Link from 'next/link'
import clsx from 'clsx'
import {
    CheckCircle,
    Tag,
    Info,
    Play,
    Pause,
    Trash2,
    Download,
    Upload,
    Users,
    Signal,
} from 'lucide-react'
import { Torrent } from '@/lib/services/qbittorrent'
import {
    formatSpeed,
    formatSize,
    formatDate,
    formatDateTime,
    formatEta,
    getTrackerName,
} from '../../_utils/torrent-formatters'

export interface VisibleColumns {
    [key: string]: boolean
}

interface TorrentRowProps {
    torrent: Torrent
    isSelected: boolean
    visibleColumns: VisibleColumns
    canManage: boolean
    onToggleSelect: (hash: string) => void
    onDelete: (torrent: { hash: string; name: string }) => void
    onPause: (hash: string) => void | Promise<void>
    onResume: (hash: string) => void | Promise<void>
}

export function TorrentRow({
    torrent,
    isSelected,
    visibleColumns,
    canManage,
    onToggleSelect,
    onDelete,
    onPause,
    onResume,
}: TorrentRowProps) {
    const stateDisplay = torrent.state.toLowerCase()
    const isPaused = stateDisplay.includes('pause')
    const isError = stateDisplay.includes('error')
    const isCompleted = torrent.progress === 1
    const isUploading = stateDisplay.includes('upload') || (isCompleted && !isPaused)

    return (
        <div
            onClick={() => onToggleSelect(torrent.hash)}
            className={clsx(
                'backdrop-blur-md rounded-2xl p-3 border shadow-sm transition-all duration-300 group overflow-hidden w-full relative cursor-pointer',
                isSelected
                    ? 'bg-indigo-900/20 border-indigo-500/50 shadow-indigo-500/10'
                    : 'bg-black/40 border-white/5 hover:bg-black/60 hover:border-indigo-500/30'
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex flex-col gap-2 w-full relative z-10">
                {/* Top Row: Tracker, Title & Actions/Date */}
                <div className="flex justify-between items-center gap-4 w-full">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Checkbox */}
                        <div className="shrink-0" onClick={(e) => { e.stopPropagation(); onToggleSelect(torrent.hash) }}>
                            <div className={clsx(
                                'w-5 h-5 rounded-lg border flex items-center justify-center transition-all',
                                isSelected
                                    ? 'bg-indigo-600 border-indigo-500 text-white scale-110'
                                    : 'bg-white/5 border-white/10 group-hover:border-white/30 text-transparent'
                            )}>
                                <CheckCircle className="w-3.5 h-3.5 fill-current" />
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                            {visibleColumns.tracker && (
                                <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg font-bold uppercase tracking-wider text-[10px] shadow-sm shadow-indigo-500/5">
                                    [{getTrackerName(torrent.tracker)}]
                                </span>
                            )}
                            {visibleColumns.category && torrent.category && (
                                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg font-bold uppercase tracking-wider text-[10px] shadow-sm shadow-blue-500/5">
                                    {torrent.category}
                                </span>
                            )}
                            {visibleColumns.tags && torrent.tags && torrent.tags.split(',').map(tag => (
                                <span key={tag} className="px-2.5 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-lg font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 hover:bg-white/10 transition-colors">
                                    <Tag className="h-3 w-3" />
                                    {tag.trim()}
                                </span>
                            ))}
                        </div>
                        <Link
                            href={`/dashboard/downloads/${torrent.hash}`}
                            className="font-bold text-gray-100 truncate text-sm leading-tight flex-1 min-w-0 group-hover:text-indigo-300 transition-colors hover:underline"
                            title={torrent.name}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {torrent.name}
                        </Link>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        {visibleColumns.added_on && (
                            <span className="text-gray-500 text-[11px] whitespace-nowrap hidden lg:inline-block border-r border-white/10 pr-4 mr-1 font-medium">
                                Ajouté: <span className="text-gray-300 ml-1">{formatDate(torrent.added_on)}</span>
                            </span>
                        )}

                        {visibleColumns.completion_on && torrent.completion_on > 0 && (
                            <span className="text-gray-500 text-[11px] whitespace-nowrap hidden lg:inline-block border-r border-white/10 pr-4 mr-1 font-medium">
                                Fini: <span className="text-gray-300 ml-1">{formatDate(torrent.completion_on)}</span>
                            </span>
                        )}

                        {visibleColumns.last_activity && torrent.last_activity > 0 && (
                            <span className="text-gray-500 text-[11px] whitespace-nowrap hidden lg:inline-block border-r border-white/10 pr-4 mr-1 font-medium">
                                Actif: <span className="text-gray-300 ml-1">{formatDateTime(torrent.last_activity)}</span>
                            </span>
                        )}

                        {visibleColumns.status && (
                            <span className={clsx(
                                'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all duration-300 shadow-lg hidden xs:inline-block',
                                isPaused ? 'bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-gray-500/5' :
                                isError ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5' :
                                isUploading ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' :
                                'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5'
                            )}>
                                {isPaused ? 'PAUSED' : isError ? 'ERROR' : isUploading ? 'SEEDING' : 'DOWNLOADING'}
                            </span>
                        )}

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <Link
                                href={`/dashboard/downloads/${torrent.hash}`}
                                className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-blue-500/10"
                                title="Voir les détails"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Info className="h-4 w-4" />
                            </Link>
                            {canManage && (
                                <>
                                    {isPaused ? (
                                        <button onClick={(e) => { e.stopPropagation(); onResume(torrent.hash) }} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-emerald-500/10" title="Resume">
                                            <Play className="h-4 w-4 fill-current" />
                                        </button>
                                    ) : (
                                        <button onClick={(e) => { e.stopPropagation(); onPause(torrent.hash) }} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-amber-500/10" title="Pause">
                                            <Pause className="h-4 w-4 fill-current" />
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(torrent) }} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-red-500/10" title="Delete">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Stats & Progress Bar */}
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
                                            isUploading ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                                            'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
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
            </div>
        </div>
    )
}
