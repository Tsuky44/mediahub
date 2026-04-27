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
} from 'lucide-react'

import { Torrent } from '@/lib/services/qbittorrent'
import { formatDate, formatDateTime, getTrackerName } from '../../_utils/torrent-formatters'
import { VisibleColumns } from './TorrentRow'

interface TorrentRowHeaderProps {
    torrent: Torrent
    isSelected: boolean
    isPaused: boolean
    isError: boolean
    isUploading: boolean
    visibleColumns: VisibleColumns
    canManage: boolean
    onToggleSelect: (hash: string) => void
    onDelete: (torrent: { hash: string; name: string }) => void
    onPause: (hash: string) => void | Promise<void>
    onResume: (hash: string) => void | Promise<void>
}

export default function TorrentRowHeader({
    torrent,
    isSelected,
    isPaused,
    isError,
    isUploading,
    visibleColumns,
    canManage,
    onToggleSelect,
    onDelete,
    onPause,
    onResume,
}: TorrentRowHeaderProps) {
    return (
        <div className="flex justify-between items-center gap-4 w-full">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Checkbox */}
                <div className="shrink-0" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleSelect(torrent.hash) }}>
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
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <Info className="h-4 w-4" />
                    </Link>
                    {canManage && (
                        <>
                            {isPaused ? (
                                <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onResume(torrent.hash) }} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-emerald-500/10" title="Resume">
                                    <Play className="h-4 w-4 fill-current" />
                                </button>
                            ) : (
                                <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onPause(torrent.hash) }} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-amber-500/10" title="Pause">
                                    <Pause className="h-4 w-4 fill-current" />
                                </button>
                            )}
                            <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(torrent) }} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-lg shadow-red-500/10" title="Delete">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
