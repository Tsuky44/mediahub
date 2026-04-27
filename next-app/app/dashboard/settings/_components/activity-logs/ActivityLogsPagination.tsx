'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { LOGS_PAGE_SIZE } from '../../_constants/activity-logs'

interface ActivityLogsPaginationProps {
    page: number
    totalPages: number
    total: number
    onPageChange: (updater: (prev: number) => number) => void
}

export default function ActivityLogsPagination({
    page,
    totalPages,
    total,
    onPageChange,
}: ActivityLogsPaginationProps) {
    if (totalPages <= 1) return null

    const from = (page - 1) * LOGS_PAGE_SIZE + 1
    const to = Math.min(page * LOGS_PAGE_SIZE, total)

    return (
        <div className="px-4 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
            <span className="text-sm text-gray-400">
                Affichage de {from} à {to} sur {total} entrées
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    )
}
