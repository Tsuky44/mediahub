'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Server, CheckCircle2, Ticket, ArrowLeft } from 'lucide-react'
import { createInstanceWithInvite } from '@/app/actions/instances'
import { toast } from 'react-hot-toast'

interface Instance {
  id: number;
  name: string;
  slug: string;
  embyUrl: string;
}

export default function LoginForm({ hasInstances = true }: { hasInstances?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const initialInstanceSlug = searchParams.get('instance') || 'main'
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [discoveredInstances, setDiscoveredInstances] = useState<Instance[]>([])
  const [showInstanceModal, setShowInstanceModal] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null)
  const [showCreateInstance, setShowCreateInstance] = useState(!hasInstances)
  const [inviteFormData, setInviteFormData] = useState({
    name: 'Main Server',
    slug: 'main',
    embyUrl: '',
    embyApiKey: '',
    inviteCode: ''
  })

  // Force show create instance if no instances exist
  useEffect(() => {
    if (!hasInstances) {
      setShowCreateInstance(true)
    }
  }, [hasInstances])

  const handleCreateWithInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await createInstanceWithInvite(inviteFormData)
      if (res.success) {
        toast.success('Instance créée ! Connectez-vous maintenant.')
        setShowCreateInstance(false)
        setInviteFormData({ name: '', slug: '', embyUrl: '', embyApiKey: '', inviteCode: '' })
        // On redirige vers la même page mais avec le slug de la nouvelle instance
        router.push(`/login?instance=${res.instance.slug}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const performSignIn = async (slug: string) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        username,
        password,
        instance: slug
      })

      if (result?.error) {
        const errorMessage = result.error === 'CredentialsSignin' 
          ? 'Nom d\'utilisateur ou mot de passe incorrect'
          : result.error.replace('Error: ', '')
        
        setError(errorMessage)
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Discovery logic only if on main or if no specific instance is provided in URL
    if (initialInstanceSlug === 'main' || !searchParams.get('instance')) {
      try {
        const response = await fetch('/api/auth/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });

        const data = await response.json();
        
        if (data.instances && data.instances.length > 1) {
          setDiscoveredInstances(data.instances);
          setShowInstanceModal(true);
          setLoading(false);
          return;
        } else if (data.instances && data.instances.length === 1) {
          await performSignIn(data.instances[0].slug);
          return;
        }
      } catch (err) {
        console.error('Discovery error:', err);
      }
    }

    // Fallback to initial instance or main
    await performSignIn(initialInstanceSlug);
  }

  const handleInstanceSelect = async (instance: Instance) => {
    setSelectedInstance(instance);
    setShowInstanceModal(false);
    setLoading(true);
    await performSignIn(instance.slug);
  }

  if (showCreateInstance) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-2 mb-4">
          {hasInstances && (
            <button 
              onClick={() => setShowCreateInstance(false)}
              className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-xl font-bold text-white">
            {hasInstances ? 'Créer une instance' : 'Configuration initiale'}
          </h2>
        </div>

        {error && (
          <div className="rounded-md bg-red-900/50 p-4 border border-red-900">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-200">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateWithInvite} className="space-y-4">
          {hasInstances && (
            <div>
              <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">Code d'invitation</label>
              <input
                type="text"
                required
                placeholder="XXXX-XXXX"
                value={inviteFormData.inviteCode}
                onChange={e => setInviteFormData({ ...inviteFormData, inviteCode: e.target.value.toUpperCase() })}
                className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm px-4 py-3 transition-all duration-300 font-mono tracking-wider"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">Nom de votre instance</label>
            <input
              type="text"
              required
              placeholder="Mon Serveur"
              value={inviteFormData.name}
              onChange={e => setInviteFormData({ ...inviteFormData, name: e.target.value })}
              className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 transition-all duration-300"
            />
          </div>

          <div className={hasInstances ? "block" : "hidden"}>
            <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">Identifiant URL (Slug)</label>
            <input
              type="text"
              required={hasInstances}
              placeholder="mon-serveur"
              value={inviteFormData.slug}
              onChange={e => setInviteFormData({ ...inviteFormData, slug: e.target.value })}
              className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 transition-all duration-300"
            />
          </div>

          <div className="pt-2 border-t border-white/5">
            <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">URL Emby</label>
            <input
              type="url"
              required
              placeholder="https://votre-emby.com"
              value={inviteFormData.embyUrl}
              onChange={e => setInviteFormData({ ...inviteFormData, embyUrl: e.target.value })}
              className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">Clé API Emby</label>
            <input
              type="password"
              required
              placeholder="Votre clé API"
              value={inviteFormData.embyApiKey}
              onChange={e => setInviteFormData({ ...inviteFormData, embyApiKey: e.target.value })}
              className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 transition-all duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-2xl border border-transparent bg-amber-500 px-4 py-3 text-sm font-bold text-black shadow-xl shadow-amber-500/20 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] mt-6"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (hasInstances ? 'Créer mon instance' : 'Configurer le serveur')}
          </button>
        </form>
      </div>
    )
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {(initialInstanceSlug !== 'main' || selectedInstance) && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full w-fit mx-auto mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-medium text-indigo-300">
              Instance : {selectedInstance?.name || initialInstanceSlug}
            </span>
          </div>
        )}
        {error && (
          <div className="rounded-md bg-red-900/50 p-4 border border-red-900">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-200">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 ml-1 mb-2">
            Nom d'utilisateur Emby
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              required
              placeholder="Votre identifiant"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 transition-all duration-300"
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

        <div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-2xl border border-transparent bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Se connecter'
            )}
          </button>
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-gray-500 backdrop-blur-xl">Ou</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateInstance(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-all duration-300 active:scale-[0.98]"
        >
          <Ticket className="w-4 h-4 text-amber-400" />
          Créer une instance
        </button>
      </form>

      {/* Instance Selection Modal */}
      {showInstanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Choisir un serveur</h3>
              <p className="text-sm text-gray-400 mt-1">
                Plusieurs instances ont été trouvées pour cet utilisateur.
              </p>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {discoveredInstances.map((instance) => (
                  <button
                    key={instance.id}
                    onClick={() => handleInstanceSelect(instance)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <Server className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white">{instance.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {instance.embyUrl}
                        </div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-white/5 flex justify-end">
              <button
                onClick={() => setShowInstanceModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

