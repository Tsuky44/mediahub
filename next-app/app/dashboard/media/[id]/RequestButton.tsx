'use client'

import { useState } from 'react'
import { Check, Download, Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SeasonSelectorModal } from '@/components/SeasonSelectorModal'

interface RequestButtonProps {
    tmdbId: number
    mediaType: 'movie' | 'tv'
    title: string
    initialStatus: string
    seasons?: any[]
    seasonStatuses?: any[]
}

export default function RequestButton({ tmdbId, mediaType, title, initialStatus, seasons, seasonStatuses }: RequestButtonProps) {
    const [status, setStatus] = useState(initialStatus)
    const [loading, setLoading] = useState(false)
    const [showSeasonModal, setShowSeasonModal] = useState(false)
    const router = useRouter()

    const handleRequest = async () => {
        if (mediaType === 'tv' && seasons && seasons.length > 0) {
            setShowSeasonModal(true)
            return
        }

        if (status !== 'not_available' && status !== 'unknown') return
        
        setLoading(true)
        try {
            const res = await fetch('/api/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tmdbId, mediaType, title })
            })
            
            const data = await res.json()
            if (res.ok && data.success) {
                setStatus('pending')
                router.refresh()
            } else {
                alert('Request failed: ' + (data.error || data.message || 'Unknown error'))
            }
        } catch (e) {
            console.error(e)
            alert('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (status === 'partial') {
        return (
            <>
                <div className="flex gap-2">
                    <button disabled className="flex items-center gap-2 rounded-md bg-purple-600 px-6 py-3 font-semibold text-white opacity-75 cursor-default">
                        <Check className="h-5 w-5" />
                        Partiellement disponible
                    </button>
                    {mediaType === 'tv' && (
                        <button 
                            onClick={() => setShowSeasonModal(true)}
                            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                            Compléter
                        </button>
                    )}
                </div>
                {mediaType === 'tv' && seasons && seasonStatuses && (
                    <SeasonSelectorModal
                        isOpen={showSeasonModal}
                        onClose={() => setShowSeasonModal(false)}
                        title={title}
                        tmdbId={tmdbId}
                        seasons={seasons}
                        seasonStatuses={seasonStatuses}
                        onSuccess={() => {
                            router.refresh()
                        }}
                    />
                )}
            </>
        )
    }

    if (status === 'available') {
        return (
            <button disabled className="flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 font-semibold text-white opacity-75 cursor-default">
                <Check className="h-5 w-5" />
                Disponible sur Emby
            </button>
        )
    }

    if (status === 'pending' || status === 'processing') {
         return (
            <button disabled className="flex items-center gap-2 rounded-md bg-yellow-600 px-6 py-3 font-semibold text-white opacity-75 cursor-default">
                <Loader2 className="h-5 w-5 animate-spin" />
                {status === 'processing' ? 'En cours de traitement...' : 'Déjà demandé'}
            </button>
        )
    }

    return (
        <>
            <button 
                onClick={handleRequest}
                disabled={loading}
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                {loading ? 'Envoi de la demande...' : 'Demander'}
            </button>
            {mediaType === 'tv' && seasons && seasonStatuses && (
                <SeasonSelectorModal
                    isOpen={showSeasonModal}
                    onClose={() => setShowSeasonModal(false)}
                    title={title}
                    tmdbId={tmdbId}
                    seasons={seasons}
                    seasonStatuses={seasonStatuses}
                    onSuccess={() => {
                        setStatus('pending') // Optimistic update if needed or rely on refresh
                        router.refresh()
                    }}
                />
            )}
        </>
    )
}
