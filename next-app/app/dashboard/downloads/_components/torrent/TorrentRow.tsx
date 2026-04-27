'use client'

import React from 'react'
import clsx from 'clsx'
import { Torrent } from '@/lib/services/qbittorrent'
import TorrentRowHeader from './TorrentRowHeader'
import TorrentRowFooter from './TorrentRowFooter'

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

function TorrentRowComponent({
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
                <TorrentRowHeader
                    torrent={torrent}
                    isSelected={isSelected}
                    isPaused={isPaused}
                    isError={isError}
                    isUploading={isUploading}
                    visibleColumns={visibleColumns}
                    canManage={canManage}
                    onToggleSelect={onToggleSelect}
                    onDelete={onDelete}
                    onPause={onPause}
                    onResume={onResume}
                />
                <TorrentRowFooter
                    torrent={torrent}
                    isPaused={isPaused}
                    isUploading={isUploading}
                    isCompleted={isCompleted}
                    visibleColumns={visibleColumns}
                />
            </div>
        </div>
    )
}

export const TorrentRow = React.memo(TorrentRowComponent)
