'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { OnyxTrack } from '@/components/ui/onyx'
import { startOnyxPairing } from '../actions'

const OTP_REQUIRED = 'ONYX_OTP_REQUIRED:'
const PAIRING_PENDING = 'ONYX_PAIRING_PENDING'

type Step =
    | { kind: 'password' }
    | { kind: 'otp'; challenge: string }
    | { kind: 'pairing'; deviceCode: string; userCode: string; expiresAt: number; interval: number }

const INPUT =
    'block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-white/30 focus:ring-white/20 sm:text-sm px-4 py-3 transition-all duration-300'
const BUTTON =
    'relative flex w-full justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 px-4 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:bg-white/20 disabled:cursor-wait transition-[background-color,scale] duration-300 ease-onyx active:scale-[0.98]'

/** Connexion avec un compte Onyx : identifiant + mot de passe (OTP compris) ou code d'appairage. */
export function OnyxLoginPanel({ callbackUrl }: { callbackUrl: string }) {
    const router = useRouter()
    const [step, setStep] = useState<Step>({ kind: 'password' })
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const pollingRef = useRef(false)

    const done = () => {
        router.push(callbackUrl)
        router.refresh()
    }

    // Retourne true quand la connexion est terminée.
    const attempt = async (credentials: Record<string, string>): Promise<'ok' | 'otp' | 'pending' | 'error'> => {
        const result = await signIn('onyx', { redirect: false, ...credentials })
        if (!result?.error) return 'ok'
        const message = result.error.replace('Error: ', '')
        if (message.startsWith(OTP_REQUIRED)) {
            setStep({ kind: 'otp', challenge: message.slice(OTP_REQUIRED.length) })
            setCode('')
            return 'otp'
        }
        if (message === PAIRING_PENDING) return 'pending'
        setError(message === 'CredentialsSignin' ? 'Identifiant ou mot de passe Onyx incorrect' : message)
        return 'error'
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const outcome = step.kind === 'otp'
                ? await attempt({ challenge: step.challenge, otp: code })
                : await attempt({ username, password })
            if (outcome === 'ok') done()
            // Une étape OTP expirée ramène au mot de passe.
            if (outcome === 'error' && step.kind === 'otp') setStep({ kind: 'password' })
        } catch (err: any) {
            setError('Une erreur est survenue: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const startPairing = async () => {
        setLoading(true)
        setError('')
        const started = await startOnyxPairing()
        setLoading(false)
        if ('error' in started) {
            setError(started.error)
            return
        }
        setStep({
            kind: 'pairing',
            deviceCode: started.deviceCode,
            userCode: started.userCode,
            expiresAt: Date.now() + started.expiresIn * 1000,
            interval: Math.max(started.interval, 2) * 1000,
        })
    }

    // Sonde l'appairage jusqu'à validation depuis l'app Onyx, expiration ou annulation.
    useEffect(() => {
        if (step.kind !== 'pairing') return
        pollingRef.current = true
        const { deviceCode, expiresAt, interval } = step
        let timer: ReturnType<typeof setTimeout>
        const tick = async () => {
            if (!pollingRef.current) return
            if (Date.now() > expiresAt) {
                setError("Le code d'appairage a expiré, recommencez")
                setStep({ kind: 'password' })
                return
            }
            let outcome: Awaited<ReturnType<typeof attempt>> = 'pending'
            try {
                outcome = await attempt({ deviceCode })
            } catch {
                outcome = 'pending'
            }
            if (!pollingRef.current) return
            if (outcome === 'ok') done()
            else if (outcome === 'error') setStep({ kind: 'password' })
            else timer = setTimeout(tick, interval)
        }
        timer = setTimeout(tick, interval)
        return () => {
            pollingRef.current = false
            clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step.kind === 'pairing' ? step.deviceCode : null])

    const errorBox = error && (
        <div className="rounded-md bg-red-900/50 p-4 border border-red-900 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-medium text-red-200">{error}</h3>
        </div>
    )

    if (step.kind === 'pairing') {
        return (
            <div className="onyx-stagger space-y-6 text-center">
                {errorBox}
                <p className="text-sm text-gray-300">
                    Dans l&apos;application Onyx connectée, ouvrez « Connecter un appareil » et saisissez ce code.
                </p>
                <div className="rounded-2xl border border-white/10 bg-white/5 py-5 font-mono text-3xl tracking-[0.3em] text-white">
                    {step.userCode}
                </div>
                <div className="relative h-3">
                    <OnyxTrack className="absolute inset-x-6 bottom-1.5" />
                </div>
                <button type="button" className={BUTTON} onClick={() => setStep({ kind: 'password' })}>
                    Annuler
                </button>
            </div>
        )
    }

    return (
        <form className="onyx-stagger space-y-6" onSubmit={submit}>
            {errorBox}
            {step.kind === 'otp' ? (
                <div>
                    <label htmlFor="onyx-otp" className="block text-sm font-medium text-gray-300 ml-1 mb-2">
                        Code de vérification Onyx
                    </label>
                    <input
                        id="onyx-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        autoFocus
                        placeholder="123456 ou code de secours"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className={INPUT}
                    />
                </div>
            ) : (
                <>
                    <div>
                        <label htmlFor="onyx-username" className="block text-sm font-medium text-gray-300 ml-1 mb-2">
                            Nom d&apos;utilisateur Onyx
                        </label>
                        <input
                            id="onyx-username"
                            type="text"
                            required
                            autoComplete="username"
                            placeholder="Votre identifiant Onyx"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={INPUT}
                        />
                    </div>
                    <div>
                        <label htmlFor="onyx-password" className="block text-sm font-medium text-gray-300 ml-1 mb-2">
                            Mot de passe
                        </label>
                        <input
                            id="onyx-password"
                            type="password"
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={INPUT}
                        />
                    </div>
                </>
            )}
            <button type="submit" disabled={loading} aria-busy={loading} className={BUTTON}>
                {loading ? 'Connexion' : step.kind === 'otp' ? 'Valider le code' : 'Se connecter avec Onyx'}
                {loading && <OnyxTrack className="absolute inset-x-6 bottom-1.5" />}
            </button>
            {step.kind === 'password' ? (
                <button
                    type="button"
                    onClick={startPairing}
                    disabled={loading}
                    className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Utiliser un code d&apos;appairage depuis l&apos;app Onyx
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => { setStep({ kind: 'password' }); setError('') }}
                    className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Retour
                </button>
            )}
        </form>
    )
}
