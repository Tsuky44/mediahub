'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { useCredentialsSignIn } from './_hooks/useCredentialsSignIn'
import { usePlexOAuth } from './_hooks/usePlexOAuth'
import { getDefaultProvider, type EnabledProviders, type LoginProvider } from './_utils/login-providers'

import { SystemMessageBanner } from './_components/SystemMessageBanner'
import { ProviderSelector } from './_components/ProviderSelector'
import { CredentialsForm } from './_components/CredentialsForm'
import { PlexOAuthButton } from './_components/PlexOAuthButton'
import { OnyxLoginPanel } from './_components/OnyxLoginPanel'

interface LoginFormProps {
    enabledProviders?: EnabledProviders
}

const DEFAULT_PROVIDERS: EnabledProviders = { emby: true, plex: false, jellyfin: false, local: true }

export default function LoginForm({ enabledProviders = DEFAULT_PROVIDERS }: LoginFormProps) {
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

    const [provider, setProvider] = useState<LoginProvider>(getDefaultProvider(enabledProviders))
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    // Lien de connexion Onyx refusé : la route SSO renvoie ici avec le message.
    const urlError = searchParams.get('error')

    const { loading, error, setError, signInWith } = useCredentialsSignIn(callbackUrl)
    const { isLoading: isPlexLoading, status: plexStatus, startOAuth: startPlexOAuth } =
        usePlexOAuth(callbackUrl, setError)

    useEffect(() => {
        if (urlError && urlError.includes(' ')) setError(urlError)
    }, [urlError, setError])

    const enabledCount = Object.values(enabledProviders).filter(Boolean).length

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await signInWith(provider, username, password)
    }

    return (
        <>
            <SystemMessageBanner />

            <div className="w-full max-w-md mx-auto space-y-8">
                {enabledCount > 1 && (
                    <ProviderSelector enabled={enabledProviders} current={provider} onChange={setProvider} />
                )}

                {provider === 'onyx' ? (
                    <OnyxLoginPanel callbackUrl={callbackUrl} />
                ) : (
                <form className="onyx-stagger space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-md bg-red-900/50 p-4 border border-red-900 animate-in fade-in slide-in-from-top-2">
                            <h3 className="text-sm font-medium text-red-200">{error}</h3>
                        </div>
                    )}

                    {provider === 'plex' ? (
                        <PlexOAuthButton
                            isLoading={isPlexLoading}
                            status={plexStatus}
                            disabled={loading}
                            onStart={startPlexOAuth}
                        />
                    ) : (
                        <CredentialsForm
                            provider={provider}
                            username={username}
                            password={password}
                            loading={loading || isPlexLoading}
                            onUsernameChange={setUsername}
                            onPasswordChange={setPassword}
                        />
                    )}
                </form>
                )}
            </div>
        </>
    )
}
