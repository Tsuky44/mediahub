'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Server, Key, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function SetupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  // Only one step now: Emby configuration
  
  const [formData, setFormData] = useState({
    emby_url: '',
    emby_api_key: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast.success('Configuration terminée ! Connectez-vous avec votre compte Emby.')
      router.push('/login')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <Server className="text-indigo-400" /> Configuration Emby
        </h2>
        <p className="text-sm text-gray-400">
          MediaHub utilise Emby comme serveur backend.
        </p>
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-indigo-200">
            Connectez-vous à votre instance Emby pour commencer.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">URL du serveur Emby</label>
          <input
            type="url"
            name="emby_url"
            required
            value={formData.emby_url}
            onChange={handleChange}
            className="block w-full rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3"
            placeholder="http://localhost:8096"
          />
          <p className="text-xs text-gray-500 mt-1 ml-1">L'adresse accessible par le serveur MediaHub</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">Clé API Emby</label>
          <input
            type="text"
            name="emby_api_key"
            required
            value={formData.emby_api_key}
            onChange={handleChange}
            className="block w-full rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <p className="text-xs text-gray-500 mt-1 ml-1">Générez une clé API dans le tableau de bord Emby (Avancé &gt; Clés API)</p>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Terminer l\'installation'
          )}
        </button>
      </div>
    </form>
  )
}
