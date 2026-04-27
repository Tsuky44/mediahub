'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getPlexAuthPin, checkPlexAuthPin } from '../actions'

const isDev = process.env.NODE_ENV === 'development'
const logError = (...args: any[]) => { if (isDev) console.error(...args) }

const PLEX_POLL_INTERVAL_MS = 2000
const PLEX_POLL_MAX_ATTEMPTS = 60 // 2 minutes

export interface UsePlexOAuthResult {
    isLoading: boolean
    status: string
    startOAuth: () => Promise<void>
}

/**
 * Gere le flux OAuth Plex.tv : ouverture popup, polling jusqu'a validation,
 * puis sign-in avec le token recu.
 */
export function usePlexOAuth(
    callbackUrl: string,
    onError: (msg: string) => void,
): UsePlexOAuthResult {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState('')
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
    }, [])

    const startOAuth = async () => {
        setIsLoading(true)
        onError('')
        setStatus('Préparation de la connexion...')

        const width = 600
        const height = 700
        const left = window.screen.width / 2 - width / 2
        const top = window.screen.height / 2 - height / 2

        const popup = window.open(
            'about:blank',
            'plex_oauth',
            `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars=yes,status=1`,
        )

        if (!popup) {
            onError('Veuillez autoriser les popups pour vous connecter avec Plex')
            setIsLoading(false)
            return
        }

        try {
            const pinData = await getPlexAuthPin()
            if (!pinData || !pinData.authUrl) {
                throw new Error("Impossible d'obtenir le lien d'authentification Plex")
            }

            popup.location.href = pinData.authUrl
            setStatus('En attente de validation sur Plex.tv...')

            let attempts = 0
            pollingRef.current = setInterval(async () => {
                attempts++

                if (popup.closed) {
                    if (pollingRef.current) clearInterval(pollingRef.current)
                    setIsLoading(false)
                    setStatus('')
                    return
                }

                if (attempts > PLEX_POLL_MAX_ATTEMPTS) {
                    if (pollingRef.current) clearInterval(pollingRef.current)
                    popup.close()
                    setIsLoading(false)
                    onError("Délai d'attente dépassé. Veuillez réessayer.")
                    return
                }

                const checkResult = await checkPlexAuthPin(pinData.id, pinData.clientIdentifier)
                if (checkResult.authorized && checkResult.authToken) {
                    if (pollingRef.current) clearInterval(pollingRef.current)
                    popup.close()
                    setStatus('Connexion réussie ! Redirection...')

                    const result = await signIn('plex', {
                        redirect: false,
                        token: checkResult.authToken,
                    })
                    if (result?.error) {
                        onError(result.error)
                        setIsLoading(false)
                    } else {
                        router.push(callbackUrl)
                        router.refresh()
                    }
                }
            }, PLEX_POLL_INTERVAL_MS)
        } catch (e: any) {
            logError('[LoginForm] Plex OAuth error:', e)
            onError(e.message || "Erreur lors de l'initialisation Plex")
            setIsLoading(false)
            if (popup) popup.close()
        }
    }

    return { isLoading, status, startOAuth }
}
