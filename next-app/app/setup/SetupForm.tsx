'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Server, Key, CheckCircle, Upload, Lock, FileText, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function SetupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'configure' | 'restore'>('configure')
  
  // Configuration State
  const [formData, setFormData] = useState({
    emby_url: '',
    emby_api_key: ''
  })

  // Restore State
  const [restorePassword, setRestorePassword] = useState('')
  const [showRestorePassword, setShowRestorePassword] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRestoreFile(e.target.files[0])
    }
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

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!restoreFile || !restorePassword) {
      toast.error('Veuillez sélectionner un fichier et entrer le mot de passe')
      return
    }

    setLoading(true)
    try {
      const text = await restoreFile.text()
      
      const res = await fetch('/api/setup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: text, password: restorePassword })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la restauration')
      }

      toast.success('Restauration terminée avec succès !')
      router.push('/login')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex p-1 bg-white/5 rounded-xl mb-8">
        <button
          onClick={() => setMode('configure')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            mode === 'configure' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Server size={16} />
          Nouvelle Installation
        </button>
        <button
          onClick={() => setMode('restore')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            mode === 'restore' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Upload size={16} />
          Restaurer une sauvegarde
        </button>
      </div>

      {mode === 'configure' ? (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Server className="text-indigo-400" /> Configuration Emby
            </h2>
            <p className="text-sm text-gray-400">
              MediaHub utilise Emby comme serveur backend.
            </p>
          </div>

          <div className="space-y-4">
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
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Configuration en cours...
                </>
              ) : (
                'Terminer l\'installation'
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRestore} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <RefreshCw className="text-indigo-400" /> Restauration
            </h2>
            <p className="text-sm text-gray-400">
              Restaurez vos paramètres ou votre base de données complète.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200">
                La restauration remplacera la configuration actuelle. Assurez-vous d'avoir le mot de passe de déchiffrement.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">Fichier de sauvegarde (.enc)</label>
              <div className="relative group">
                <input
                  type="file"
                  accept=".enc"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2.5 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-600 file:text-white
                    hover:file:bg-indigo-700
                    cursor-pointer bg-white/5 rounded-xl border border-white/10 p-2"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-1">Sélectionnez votre fichier de sauvegarde chiffré</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">Mot de passe de déchiffrement</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type={showRestorePassword ? "text" : "password"}
                  required
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  className="block w-full rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-10 pr-10 py-3"
                  placeholder="Mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowRestorePassword(!showRestorePassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showRestorePassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Restauration en cours...
                </>
              ) : (
                'Restaurer la sauvegarde'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
