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

/** Bouton "Demander" (bleu) d'une saison pas encore demandee, avec etat de chargement. */
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
        <button
            type="button"
            onClick={handleRequest}
            disabled={requesting}
            aria-busy={requesting}
            className={clsx(
                'flex items-center gap-1.5 rounded-full bg-onyx-request px-2.5 py-1 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_6px_18px_-8px_var(--color-onyx-request)] transition-[filter,opacity] duration-300 ease-onyx',
                requesting ? 'cursor-wait opacity-60' : 'cursor-pointer hover:brightness-110',
            )}
        >
            {requesting ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
                <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            <span>Demander</span>
        </button>
    )
}
