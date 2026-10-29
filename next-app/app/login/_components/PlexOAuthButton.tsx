'use client'

import { Loader2, ExternalLink } from 'lucide-react'
import { BRAND } from '@/lib/media-server-brand'

interface PlexOAuthButtonProps {
    isLoading: boolean
    status: string
    disabled?: boolean
    onStart: () => void
}

/** Bouton de connexion via Plex.tv avec etat de chargement et message de statut. */
export function PlexOAuthButton({ isLoading, status, disabled, onStart }: PlexOAuthButtonProps) {
    return (
        <div className="pt-2">
            <p className="text-gray-400 text-sm text-center mb-6">
                Connectez-vous via votre compte Plex.tv pour accéder à votre serveur.
            </p>

            <button
                type="button"
                onClick={onStart}
                disabled={isLoading || disabled}
                className={`flex w-full justify-center items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-bold transition-[scale,filter] duration-300 ease-onyx active:scale-[0.98] ${BRAND.plex.solid}`}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{status || 'Connexion...'}</span>
                    </>
                ) : (
                    <>
                        <ExternalLink className="h-5 w-5" />
                        <span>Connexion avec Plex.tv</span>
                    </>
                )}
            </button>
            {isLoading && (
                <p className="text-xs text-center text-gray-500 mt-2 animate-pulse">
                    Une fenêtre s&apos;est ouverte pour vous connecter...
                </p>
            )}
        </div>
    )
}
