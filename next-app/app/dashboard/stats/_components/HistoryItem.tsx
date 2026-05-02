'use client'

import Link from 'next/link'
import { formatDuration, type ProcessedHistoryItem } from '../_utils/history-formatters'
import { HistoryItemThumbnail } from './HistoryItemThumbnail'
import { HistoryItemMeta } from './HistoryItemMeta'

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
                <HistoryItemThumbnail item={item} />

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

                    <HistoryItemMeta item={item} />
                </div>
            </div>
        </div>
    )

    return href ? <Link href={href} className="block">{content}</Link> : <div>{content}</div>
}
