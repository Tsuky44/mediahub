'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface ProwlarrPaginationProps {
    page: number
    resultsCount: number
    hasMore: boolean
    loading: boolean
    onPrevPage: () => void
    onNextPage: () => void
    onLoadMore: () => void
}

/** Controles de pagination (precedent / suivant / charger plus). */
export function ProwlarrPagination({
    page,
    resultsCount,
    hasMore,
    loading,
    onPrevPage,
    onNextPage,
    onLoadMore,
}: ProwlarrPaginationProps) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
            <div className="text-xs text-gray-500 font-medium">
                Affichage de <span className="text-gray-300">{resultsCount}</span> résultats
                {page > 0 && <span> (Page {page + 1})</span>}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onPrevPage}
                    disabled={loading || page === 0}
                    className="p-2 bg-gray-900/50 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                    title="Page précédente"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-xs font-bold min-w-[80px] text-center">
                    Page {page + 1}
                </div>

                <button
                    onClick={onNextPage}
                    disabled={loading || !hasMore}
                    className="p-2 bg-gray-900/50 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                    title="Page suivante"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>

                <button
                    onClick={onLoadMore}
                    disabled={loading || !hasMore}
                    className="ml-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-30"
                >
                    {loading && resultsCount > 0 ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Charger plus
                </button>
            </div>
        </div>
    )
}
