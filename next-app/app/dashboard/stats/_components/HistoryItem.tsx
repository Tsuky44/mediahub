'use client'

import Link from 'next/link'
import { Film, Play, Activity, User, Monitor } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { EmbyImage } from '@/components/global/EmbyImage'
import { formatDuration, type ProcessedHistoryItem } from '../_utils/history-formatters'

interface HistoryItemProps {
    item: ProcessedHistoryItem
}

/**
 * Construit le lien TMDB/Emby pour cet item d'historique.
 */
function buildHref(item: ProcessedHistoryItem): string | null {
    const { isSeries, itemId, displayName } = item
    const seasonNum = item.seasonIndex ?? item.ParentIndexNumber
    const episodeNum = item.episodeIndex ?? item.IndexNumber

    const tmdbId = item.tmdbId || item.TmdbId || item.mediaInfo?.tmdbId || item.mediaInfo?.ProviderIds?.Tmdb
    const searchName = isSeries
        ? (item.SeriesName || item.seriesName || item.mediaInfo?.seriesName || displayName)
        : (item.Name || item.itemName || displayName)

    const seasonEpisode = isSeries && seasonNum !== undefined && episodeNum !== undefined
        ? `&season=${seasonNum}&episode=${episodeNum}`
        : ''

    if (tmdbId) {
        return `/dashboard/media/${tmdbId}?type=${isSeries ? 'tv' : 'movie'}${seasonEpisode}`
    }
    if (itemId) {
        return `/dashboard/media/${itemId}?type=${isSeries ? 'tv' : 'movie'}&source=${item.Source || 'emby'}&name=${encodeURIComponent(searchName || 'Unknown')}${seasonEpisode}`
    }
    return null
}

/**
 * Rend un item d'historique (live ou passe) avec image, titre, sous-titre,
 * metadonnees utilisateur / device / duree et horodatage relatif.
 */
export function HistoryItem({ item }: HistoryItemProps) {
    const { displayName, subName, isLive, itemId, date, duration, isSeries } = item
    const href = buildHref(item)

    const content = (
        <div
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:scale-[1.01] ${
                isLive
                    ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/40 hover:border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'bg-black/20 border-white/5 hover:bg-white/10 hover:border-indigo-500/30'
            }`}
        >
            {/* Live indicator bar */}
            {isLive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse"></div>
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

            <div className="flex items-center gap-4 p-4 relative z-10">
                {/* Image / Icon */}
                <div className={`relative shrink-0 overflow-hidden rounded-xl border shadow-lg group-hover:scale-105 transition-transform duration-300 w-16 h-16 bg-gray-900 ${
                    isLive ? 'border-indigo-500/30 shadow-indigo-500/20' : 'border-white/10'
                }`}>
                    {itemId ? (
                        <EmbyImage
                            itemId={itemId}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            alt={displayName}
                            itemName={displayName}
                            tmdbId={item.tmdbId}
                            mediaType={item.mediaType || (isSeries ? 'tv' : 'movie')}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-600">
                            <Film className="h-8 w-8 opacity-50" />
                        </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                        <Play className="h-6 w-6 text-white fill-current drop-shadow-lg scale-0 group-hover:scale-100 transition-transform duration-300 delay-75" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-center min-w-0 gap-1.5">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white truncate text-base group-hover:text-indigo-400 transition-colors tracking-tight leading-tight">
                            {displayName}
                        </h4>
                        {isLive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500 text-white animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                                LIVE
                            </span>
                        )}
                    </div>

                    {subName && (
                        <span className="text-xs font-medium text-gray-400 truncate group-hover:text-gray-300 transition-colors">
                            {subName}
                        </span>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                        <div className="flex items-center gap-1.5 bg-gray-900/50 px-2 py-1 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
                            <User className="h-3 w-3 text-indigo-400" />
                            <span className="font-medium text-gray-300 truncate max-w-[100px]">{item.userName || item.UserName}</span>
                        </div>

                        {(item.Client || item.client || item.DeviceName || item.device) && (
                            <div className="flex items-center gap-1.5 bg-gray-900/50 px-2 py-1 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
                                <Monitor className="h-3 w-3 text-blue-400" />
                                <span
                                    className="font-medium text-gray-300 truncate max-w-[150px]"
                                    title={`${item.Client || item.client || ''} ${item.DeviceName || item.device ? `(${item.DeviceName || item.device})` : ''}`}
                                >
                                    {(() => {
                                        const client = item.Client || item.client
                                        const device = item.DeviceName || item.device
                                        if (client && device && client !== device && !client.includes(device)) return `${client} (${device})`
                                        return client || device
                                    })()}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5">
                            <Activity className="h-3 w-3 text-emerald-400" />
                            <span className="font-medium tabular-nums text-gray-400 group-hover:text-gray-300 transition-colors">{formatDuration(duration)}</span>
                        </div>
                    </div>
                </div>

                {/* Time */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-300 ${
                        isLive
                            ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20'
                            : 'text-gray-500 bg-gray-900/50 border-white/5 group-hover:text-indigo-300 group-hover:border-indigo-500/30'
                    }`}>
                        {isLive ? 'En cours' : formatDistanceToNow(date, { addSuffix: true, locale: fr })}
                    </span>
                </div>
            </div>
        </div>
    )

    return href ? <Link href={href} className="block">{content}</Link> : <div>{content}</div>
}
