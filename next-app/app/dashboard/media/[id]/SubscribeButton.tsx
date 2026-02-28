'use client'

import { useState, useTransition } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleSubscription } from './subscribe-actions'
import { toast } from 'react-hot-toast'

interface SubscribeButtonProps {
    tmdbId: string
    mediaType: string
    title: string
    initialIsSubscribed: boolean
}

export function SubscribeButton({ tmdbId, mediaType, title, initialIsSubscribed }: SubscribeButtonProps) {
    const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed)
    const [isPending, startTransition] = useTransition()

    const handleToggle = () => {
        console.log('[SubscribeButton] Clicked')
        startTransition(async () => {
            try {
                console.log('[SubscribeButton] Calling server action...')
                
                // Timeout promise
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 10000)
                )

                // Race between action and timeout
                const newState = await Promise.race([
                    toggleSubscription(tmdbId, mediaType, title),
                    timeoutPromise
                ]) as boolean

                console.log('[SubscribeButton] Server action returned:', newState)
                setIsSubscribed(newState)
                if (newState) {
                    toast.success('Vous recevrez des notifications pour ce média')
                } else {
                    toast.success('Abonnement désactivé')
                }
            } catch (error) {
                console.error('[SubscribeButton] Error:', error)
                toast.error('Erreur lors de la mise à jour de l\'abonnement')
            }
        })
    }

    return (
        <Button
            variant={isSubscribed ? "secondary" : "outline"}
            size="sm"
            onClick={handleToggle}
            disabled={isPending}
            className="gap-2"
        >
            {isSubscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {isSubscribed ? 'Désabonner' : 'M\'abonner'}
        </Button>
    )
}
