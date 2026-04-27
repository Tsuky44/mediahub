'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { LoginProvider } from '../_utils/login-providers'

const isDev = process.env.NODE_ENV === 'development'
const log = (...args: any[]) => { if (isDev) console.log(...args) }
const logError = (...args: any[]) => { if (isDev) console.error(...args) }

export interface UseCredentialsSignInResult {
    loading: boolean
    error: string
    setError: (msg: string) => void
    signInWith: (provider: LoginProvider, username: string, password: string) => Promise<void>
}

/**
 * Encapsule la logique de connexion par credentials (Emby, Jellyfin, Local)
 * avec gestion de l'erreur "demande en attente" et redirection apres succes.
 */
export function useCredentialsSignIn(callbackUrl: string): UseCredentialsSignInResult {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const signInWith = async (provider: LoginProvider, username: string, password: string) => {
        setLoading(true)
        setError('')
        log(`[LoginForm] Starting performSignIn with username: ${username} via ${provider}`)
        try {
            const result = await signIn(provider, {
                redirect: false,
                username,
                password,
            })

            if (result?.error) {
                if (provider !== 'plex' && username) {
                    try {
                        const res = await fetch(`/api/public/request-access?email=${encodeURIComponent(username)}`)
                        const data = await res.json()
                        if (data.exists && data.status === 'PENDING') {
                            setError('Votre demande de compte est en attente de validation.')
                            setLoading(false)
                            return
                        }
                    } catch {
                        // Ignore, fallback to standard message
                    }
                }

                const errorMessage = result.error === 'CredentialsSignin'
                    ? "Nom d'utilisateur ou mot de passe incorrect"
                    : result.error.replace('Error: ', '')
                logError(`[LoginForm] Login error: ${errorMessage}`)
                setError(errorMessage)
            } else {
                log(`[LoginForm] Login success, redirecting to: ${callbackUrl}`)
                router.push(callbackUrl)
                router.refresh()
            }
        } catch (e: any) {
            logError(`[LoginForm] Unexpected error:`, e)
            setError('Une erreur est survenue: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    return { loading, error, setError, signInWith }
}
