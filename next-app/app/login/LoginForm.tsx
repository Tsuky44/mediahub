'use client'

import { useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Server, Tv, MonitorPlay, ExternalLink } from 'lucide-react'
import { toast } from 'react-hot-toast'
import clsx from 'clsx'
import { getPlexAuthPin, checkPlexAuthPin } from './actions'

const isDev = process.env.NODE_ENV === 'development';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


interface LoginFormProps {
  enabledProviders?: {
    emby: boolean
    plex: boolean
    jellyfin: boolean
  }
}

export default function LoginForm({ enabledProviders = { emby: true, plex: false, jellyfin: false } }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  
  // Determine default provider
  const getDefaultProvider = () => {
    if (enabledProviders.emby) return 'emby'
    if (enabledProviders.plex) return 'plex'
    if (enabledProviders.jellyfin) return 'jellyfin'
    return 'emby' // Fallback
  }

  const [provider, setProvider] = useState(getDefaultProvider())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Plex OAuth State
  const [isPlexAuthLoading, setIsPlexAuthLoading] = useState(false)
  const [plexAuthStatus, setPlexAuthStatus] = useState<string>('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Count enabled providers
  const enabledCount = Object.values(enabledProviders).filter(Boolean).length

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const performSignIn = async () => {
    log(`[LoginForm] Starting performSignIn with username: ${username} via ${provider}`)
    try {
      const result = await signIn(provider, {
        redirect: false,
        username,
        password
      })

      log(`[LoginForm] signIn result:`, result)

      if (result?.error) {
        const errorMessage = result.error === 'CredentialsSignin' 
          ? 'Nom d\'utilisateur ou mot de passe incorrect'
          : result.error.replace('Error: ', '')
        
        error(`[LoginForm] Login error: ${errorMessage}`)
        setLoginError(errorMessage)
      } else {
        log(`[LoginForm] Login success, redirecting to: ${callbackUrl}`)
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (e: any) {
      error(`[LoginForm] Unexpected error:`, e)
      setLoginError('Une erreur est survenue: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePlexOAuth = async () => {
    setIsPlexAuthLoading(true)
    setLoginError('')
    setPlexAuthStatus('Préparation de la connexion...')

    // Open popup immediately to avoid blocker
    const width = 600
    const height = 700
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2
    
    const popup = window.open(
      'about:blank', 
      'plex_oauth', 
      `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars=yes,status=1`
    )

    if (!popup) {
      setLoginError('Veuillez autoriser les popups pour vous connecter avec Plex')
      setIsPlexAuthLoading(false)
      return
    }

    try {
      const pinData = await getPlexAuthPin()
      
      if (!pinData || !pinData.authUrl) {
        throw new Error('Impossible d\'obtenir le lien d\'authentification Plex')
      }

      popup.location.href = pinData.authUrl
      setPlexAuthStatus('En attente de validation sur Plex.tv...')

      // Start polling
      const pollInterval = 2000 // 2 seconds
      const maxAttempts = 60 // 2 minutes timeout
      let attempts = 0

      pollingRef.current = setInterval(async () => {
        attempts++
        
        // Check if popup closed manually
        if (popup.closed) {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setIsPlexAuthLoading(false)
          setPlexAuthStatus('')
          return
        }

        if (attempts > maxAttempts) {
          if (pollingRef.current) clearInterval(pollingRef.current)
          popup.close()
          setIsPlexAuthLoading(false)
          setLoginError('Délai d\'attente dépassé. Veuillez réessayer.')
          return
        }

        const checkResult = await checkPlexAuthPin(pinData.id, pinData.clientIdentifier)
        
        if (checkResult.authorized && checkResult.authToken) {
          if (pollingRef.current) clearInterval(pollingRef.current)
          popup.close()
          setPlexAuthStatus('Connexion réussie ! Redirection...')
          
          // Sign in with the token
          await signIn('plex', {
            redirect: false,
            token: checkResult.authToken
          }).then((result) => {
            if (result?.error) {
              setLoginError(result.error)
              setIsPlexAuthLoading(false)
            } else {
              router.push(callbackUrl)
              router.refresh()
            }
          })
        }
      }, pollInterval)

    } catch (e: any) {
      error('[LoginForm] Plex OAuth error:', e)
      setLoginError(e.message || 'Erreur lors de l\'initialisation Plex')
      setIsPlexAuthLoading(false)
      if (popup) popup.close()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoginError('')
    await performSignIn();
  }

  const getProviderIcon = (p: string) => {
    switch (p) {
      case 'emby': return <Server className="w-5 h-5" />
      case 'plex': return <Tv className="w-5 h-5" />
      case 'jellyfin': return <MonitorPlay className="w-5 h-5" />
      default: return <Server className="w-5 h-5" />
    }
  }

  const getProviderLabel = (p: string) => {
    switch (p) {
      case 'emby': return 'Emby'
      case 'plex': return 'Plex'
      case 'jellyfin': return 'Jellyfin'
      default: return 'Serveur'
    }
  }

  const getProviderColor = (p: string, isSelected: boolean) => {
    if (!isSelected) return 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
    switch (p) {
      case 'emby': return 'bg-green-600 text-white shadow-lg shadow-green-500/20'
      case 'plex': return 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
      case 'jellyfin': return 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
      default: return 'bg-indigo-600 text-white'
    }
  }

  return (
    <>
      <div className="space-y-6">
        {enabledCount > 1 && (
          <div className={clsx("grid gap-2 mb-6", {
            'grid-cols-2': enabledCount === 2,
            'grid-cols-3': enabledCount >= 3
          })}>
            {enabledProviders.emby && (
              <button
                type="button"
                onClick={() => setProvider('emby')}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300",
                  getProviderColor('emby', provider === 'emby')
                )}
              >
                <Server className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Emby</span>
              </button>
            )}
            {enabledProviders.plex && (
              <button
                type="button"
                onClick={() => setProvider('plex')}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300",
                  getProviderColor('plex', provider === 'plex')
                )}
              >
                <Tv className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Plex</span>
              </button>
            )}
            {enabledProviders.jellyfin && (
              <button
                type="button"
                onClick={() => setProvider('jellyfin')}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300",
                  getProviderColor('jellyfin', provider === 'jellyfin')
                )}
              >
                <MonitorPlay className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Jellyfin</span>
              </button>
            )}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {loginError && (
            <div className="rounded-md bg-red-900/50 p-4 border border-red-900 animate-in fade-in slide-in-from-top-2">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">{loginError}</h3>
                </div>
              </div>
            </div>
          )}

          {provider !== 'plex' && (
            <>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 ml-1 mb-2">
                  Nom d'utilisateur {getProviderLabel(provider)}
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
                    placeholder={`Votre identifiant ${getProviderLabel(provider)}`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-10 pr-4 py-3 transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 ml-1 mb-2">
                  Mot de passe
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 transition-all duration-300"
                  />
                </div>
              </div>
            </>
          )}

          {provider === 'plex' && (
            <div className="pt-2">
              <p className="text-gray-400 text-sm text-center mb-6">
                Connectez-vous via votre compte Plex.tv pour accéder à votre serveur.
              </p>

              <button
                type="button"
                onClick={handlePlexOAuth}
                disabled={isPlexAuthLoading || loading}
                className="flex w-full justify-center items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-500 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-300 active:scale-[0.98]"
              >
                {isPlexAuthLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{plexAuthStatus || 'Connexion...'}</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-5 w-5" />
                    <span>Connexion avec Plex.tv</span>
                  </>
                )}
              </button>
              {isPlexAuthLoading && (
                <p className="text-xs text-center text-gray-500 mt-2 animate-pulse">
                  Une fenêtre s'est ouverte pour vous connecter...
                </p>
              )}
            </div>
          )}

          {provider !== 'plex' && (
            <div>
              <button
                type="submit"
                disabled={loading || isPlexAuthLoading}
                className={clsx(
                  "flex w-full justify-center rounded-2xl border border-transparent px-4 py-3 text-sm font-bold text-white shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98]",
                  provider === 'emby' ? "bg-green-600 hover:bg-green-500 shadow-green-500/20 focus:ring-green-500" :
                  provider === 'plex' ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20 focus:ring-amber-500" :
                  provider === 'jellyfin' ? "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20 focus:ring-purple-500" :
                  "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 focus:ring-indigo-500"
                )}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `Se connecter avec ${getProviderLabel(provider)}`
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </>
  )
}

