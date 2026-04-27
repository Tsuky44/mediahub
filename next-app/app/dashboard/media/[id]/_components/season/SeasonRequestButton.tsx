'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Download } from 'lucide-react'
import { requestSeason } from '@/app/dashboard/media/[id]/actions'

interface SeasonRequestButtonProps {
    tvId: number
    seasonNumber: number
    title: string
    onSuccess: () => void
}

/** Bouton "Demander" avec etat de chargement et notification au parent. */
export function SeasonRequestButton({ tvId, seasonNumber, title, onSuccess }: SeasonRequestButtonProps) {
    const [requesting, setRequesting] = useState(false)

    const handleRequest = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (requesting) return
        setRequesting(true)
        const result = await requestSeason(tvId, seasonNumber, title)
        if (result.success) {
            onSuccess()
        } else {
            alert('Erreur lors de la demande')
        }
        setRequesting(false)
    }

    return (
        <div
            role="button"
            onClick={handleRequest}
            className={clsx(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors',
                requesting
                    ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-wait'
                    : 'bg-indigo-600/80 text-white border-indigo-500 hover:bg-indigo-500 cursor-pointer',
            )}
        >
            {requesting ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
                <>
                    <Download className="h-3 w-3" />
                    <span>Demander</span>
                </>
            )}
        </div>
    )
}
