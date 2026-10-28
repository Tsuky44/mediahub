'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { StorageManager } from '@/app/dashboard/stats/_components/StorageManager'

interface MediaManagerModalProps {
    canDelete?: boolean
    onClose: () => void
}

/**
 * Plein écran au-dessus du site. Rendu dans <body> : un parent avec
 * backdrop-filter/transform rendrait sinon le `fixed` relatif à ce parent
 * (le bandeau défilait avec la page). La page derrière est bloquée.
 */
export function MediaManagerModal({ canDelete = false, onClose }: MediaManagerModalProps) {
    useEffect(() => {
        const root = document.documentElement
        const previous = root.style.overflow
        root.style.overflow = 'hidden'
        return () => {
            root.style.overflow = previous
        }
    }, [])

    // Ouvert uniquement après un clic : toujours rendu côté navigateur
    if (typeof document === 'undefined') return null

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col overflow-hidden overscroll-none animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gray-950/90 flex-shrink-0">
                <h2 className="text-xl font-bold text-white">Gestion des médias</h2>
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    aria-label="Fermer"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-6">
                <StorageManager canDelete={canDelete} />
            </div>
        </div>,
        document.body
    )
}
