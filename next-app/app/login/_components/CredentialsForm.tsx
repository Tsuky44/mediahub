'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { OnyxTrack } from '@/components/ui/onyx'
import { cn } from '@/lib/utils'
import { getProviderIcon, getProviderLabel, getSubmitColor, type LoginProvider } from '../_utils/login-providers'

interface CredentialsFormProps {
    provider: LoginProvider
    username: string
    password: string
    loading: boolean
    onUsernameChange: (v: string) => void
    onPasswordChange: (v: string) => void
}

/** Champs username + password + bouton submit pour Emby/Jellyfin/Local. */
export function CredentialsForm({
    provider,
    username,
    password,
    loading,
    onUsernameChange,
    onPasswordChange,
}: CredentialsFormProps) {
    const [showPassword, setShowPassword] = useState(false)
    const label = getProviderLabel(provider)

    return (
        <>
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 ml-1 mb-2">
                    Nom d&apos;utilisateur {label}
                </label>
                <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {getProviderIcon(provider)}
                    </div>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        placeholder={`Votre identifiant ${label}`}
                        value={username}
                        onChange={(e) => onUsernameChange(e.target.value)}
                        className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-white/30 focus:ring-white/20 sm:text-sm pl-10 pr-4 py-3 transition-all duration-300"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 ml-1 mb-2">
                    Mot de passe
                </label>
                <div className="mt-1 relative">
                    <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-white/30 focus:ring-white/20 sm:text-sm px-4 py-3 pr-10 transition-all duration-300"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className={cn(
                        'relative flex w-full justify-center overflow-hidden rounded-2xl border px-4 py-3 text-sm font-semibold disabled:cursor-wait transition-[background-color,scale,filter] duration-300 ease-onyx active:scale-[0.98]',
                        getSubmitColor(provider),
                    )}
                >
                    {loading ? 'Connexion' : `Se connecter avec ${label}`}
                    {loading && <OnyxTrack className="absolute inset-x-6 bottom-1.5" />}
                </button>

                <div className="mt-4 text-center">
                    <a href="/request-access" className="text-sm text-gray-400 hover:text-white transition-colors">
                        Pas encore de compte ? <span className="text-white underline decoration-white/30 underline-offset-4">Faire une demande</span>
                    </a>
                </div>
            </div>
        </>
    )
}
