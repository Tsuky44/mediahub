import Link from 'next/link'
import { Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { EmbyImage } from '@/components/global/EmbyImage'
import type { MeHistoryItem } from '../_utils/me-aggregation'

/** Badge de source (emby/plex/jellyfin). */
function SourceBadge({ source }: { source?: string }) {
    if (!source) return null
    const s = source.toLowerCase()
    const colors =
        s === 'emby'
            ? 'bg-green-500/20 text-green-300 border-green-500/30'
            : s === 'plex'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : s === 'jellyfin'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-gray-500/20 text-gray-300 border-gray-500/30'

    return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${colors}`}>
            {s}
        </span>
    )
}

/** Determine le nom de recherche "series" depuis un item (SeriesName, split Name, etc.). */
function extractSearchName(item: MeHistoryItem, isSeries: boolean): string | undefined {
    if (!isSeries) return item.Name
    if (item.SeriesName) return item.SeriesName
    if (item.Name?.includes(' - ')) return item.Name.split(' - ')[0]
    if (item.Name?.includes(' : ')) return item.Name.split(' : ')[0]
    return item.Name
}

/** Construit le href vers la page detail media (TMDB ou fallback itemId). */
function buildMediaHref(item: MeHistoryItem, isSeries: boolean): string | null {
    const tmdbId = item.TmdbId || item.tmdbId
    const itemId = item.ItemId || item.NowPlayingItemId || item.Id
    const searchName = extractSearchName(item, isSeries)

    const episodeSuffix =
        isSeries && item.ParentIndexNumber !== undefined && item.IndexNumber !== undefined
            ? `&season=${item.ParentIndexNumber}&episode=${item.IndexNumber}`
            : ''

    if (tmdbId) {
        return `/dashboard/media/${tmdbId}?type=${isSeries ? 'tv' : 'movie'}${episodeSuffix}`
    }
    if (itemId) {
        return `/dashboard/media/${itemId}?type=${isSeries ? 'tv' : 'movie'}&source=${item.Source || 'emby'}&name=${encodeURIComponent(searchName || 'Unknown')}${episodeSuffix}`
    }
    return null
}

interface MeRecentHistoryItemProps {
    item: MeHistoryItem
}

function MeRecentHistoryItem({ item }: MeRecentHistoryItemProps) {
    const isSeries = item.Type === 'Episode' || !!item.SeriesName || !!item.SeriesId
    const href = buildMediaHref(item, isSeries)

    const content = (
        <div className="p-3 hover:bg-gray-700/30 transition-colors flex gap-3 items-center">
            <div className="w-12 h-16 bg-gray-900 rounded-md overflow-hidden flex-shrink-0 relative">
                <EmbyImage itemId={item.imageItemId || ''} className="w-full h-full object-cover" alt={item.Name || ''} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{item.Name}</div>
                <div className="text-sm text-gray-400 truncate">
                    {item.SeriesName && <span className="text-blue-400">{item.SeriesName} • </span>}
                    {formatDistanceToNow(new Date(item.DateCreated || ''), { addSuffix: true, locale: fr })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                        {Math.round((item.PlaybackDuration || 0) / 60)} min
                    </span>
                    <SourceBadge source={item.Source} />
                </div>
            </div>
        </div>
    )

    if (href) {
        return (
            <Link href={href} className="block">
                {content}
            </Link>
        )
    }
    return <div>{content}</div>
}

interface MeRecentHistoryListProps {
    items: MeHistoryItem[]
}

/** Liste des derniers items regardes par l'utilisateur courant, avec lien vers la page detail. */
export function MeRecentHistoryList({ items }: MeRecentHistoryListProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock size={20} className="text-blue-500" />
                Historique Récent
            </h2>
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
                {items.length > 0 ? (
                    <div className="divide-y divide-gray-700/50">
                        {items.map((item, i) => (
                            <MeRecentHistoryItem key={i} item={item} />
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">Aucun historique récent</div>
                )}
            </div>
        </div>
    )
}
