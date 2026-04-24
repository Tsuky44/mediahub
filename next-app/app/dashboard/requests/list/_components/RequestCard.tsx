'use client'

import Link from 'next/link'
import {
    CheckSquare,
    Square,
    Film,
    Tv,
    User as UserIcon,
    Trash2,
    Loader2,
} from 'lucide-react'
import { MediaPoster } from './MediaPoster'
import { getStatusInfo } from '../_utils/request-status'
import { resolvePosterUrls } from '../_utils/request-poster'

interface RequestCardProps {
    request: any
    isSelected: boolean
    canDelete: boolean
    isDeleting: boolean
    onToggleSelect: () => void
    onDelete: (e: React.MouseEvent) => void
}

/** Carte d'une demande de media avec poster, statut, saisons, demandeur. */
export function RequestCard({
    request,
    isSelected,
    canDelete,
    isDeleting,
    onToggleSelect,
    onDelete,
}: RequestCardProps) {
    const media = request.media || {}
    const mediaType = request.type === 'movie' ? 'movie' : 'tv'
    const tmdbId = request.media?.tmdbId

    const { posterPath, fallbackPosterPath } = resolvePosterUrls(tmdbId, mediaType, request.media?.posterPath)
    const currentStatus = getStatusInfo(request.status)
    const StatusIcon = currentStatus.icon
    const requesterName =
        request.requestedBy?.displayName ||
        request.requestedBy?.email?.split('@')[0] ||
        'Inconnu'

    return (
        <div
            onClick={onToggleSelect}
            className={`group relative bg-zinc-900/40 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden shadow-xl cursor-pointer ${
                isSelected
                    ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-500/5'
                    : 'border-zinc-800/50 hover:border-indigo-500/30'
            }`}
        >
            {canDelete && (
                <div
                    className={`absolute top-4 left-4 z-20 transition-all duration-300 ${
                        isSelected
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                    }`}
                >
                    <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                            isSelected
                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                                : 'bg-zinc-900/80 border-zinc-700 text-zinc-500'
                        }`}
                    >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row">
                <Link
                    href={`/dashboard/media/${tmdbId}?type=${mediaType}`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full md:w-40 aspect-[2/3] md:aspect-auto overflow-hidden bg-zinc-800 flex items-center justify-center"
                >
                    <MediaPoster
                        src={posterPath}
                        fallbackSrc={fallbackPosterPath}
                        alt={media.title || 'Unknown'}
                        placeholder={
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                                <Film className="w-8 h-8 text-zinc-700 mb-2" />
                                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider line-clamp-2">
                                    {media.title || 'Sans titre'}
                                </span>
                            </div>
                        }
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:hidden" />
                </Link>

                <div className="flex-1 p-6 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <Link
                                href={`/dashboard/media/${tmdbId}?type=${mediaType}`}
                                onClick={(e) => e.stopPropagation()}
                                className="space-y-1 block flex-1"
                            >
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400/80">
                                    {request.type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                                    {request.type === 'movie' ? 'Film' : 'Série'}
                                </div>
                                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                                    {media.title || 'Sans titre'}
                                </h3>
                            </Link>

                            <div className="flex items-center gap-3 self-start">
                                {canDelete && (
                                    <button
                                        onClick={onDelete}
                                        disabled={isDeleting}
                                        className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50 relative z-10"
                                        title="Supprimer la demande"
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.color}`}>
                                <StatusIcon className="w-4 h-4" />
                                <span className="text-sm font-bold uppercase tracking-wide">
                                    {currentStatus.label}
                                </span>
                            </div>

                            {request.type === 'tv' && request.media?.seasons && request.media.seasons.length > 0 && (
                                <div className="flex items-center gap-3 bg-indigo-500/5 px-3 py-1.5 rounded-xl border border-indigo-500/20 max-w-full">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                                        <Tv className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-indigo-400/60 uppercase font-bold leading-none">
                                            Saisons demandées
                                        </p>
                                        <p className="text-sm font-bold text-indigo-300 break-words line-clamp-2">
                                            {request.media.seasons.join(', ')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 bg-zinc-800/30 px-3 py-1.5 rounded-xl border border-zinc-700/30 max-w-full">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                                    <UserIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold leading-none">
                                        Demandé par
                                    </p>
                                    <p className="text-sm font-medium text-zinc-200 truncate max-w-[150px]">
                                        {requesterName}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t border-zinc-800/50 text-[11px] text-zinc-500 font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                            <span>ID: {request.id}</span>
                            {tmdbId && <span>| TMDB: {tmdbId}</span>}
                            {mediaType && <span>| Type: {mediaType}</span>}
                        </div>
                        <span>
                            Ajouté le{' '}
                            {new Date(request.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
