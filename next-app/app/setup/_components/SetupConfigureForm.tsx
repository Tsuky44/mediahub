'use client'

import { Server, Loader2 } from 'lucide-react'

interface SetupConfigureFormProps {
  formData: { emby_url: string; emby_api_key: string }
  loading: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
}

export function SetupConfigureForm({
  formData,
  loading,
  onChange,
  onSubmit,
}: SetupConfigureFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <Server className="text-indigo-400" /> Configuration Emby
        </h2>
        <p className="text-sm text-gray-400">MediaHub utilise Emby comme serveur backend.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-indigo-200">
            Connectez-vous à votre instance Emby pour commencer.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">
            URL du serveur Emby
          </label>
          <input
            type="url"
            name="emby_url"
            required
            value={formData.emby_url}
            onChange={onChange}
            className="block w-full rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3"
            placeholder="http://localhost:8096"
          />
          <p className="text-xs text-gray-500 mt-1 ml-1">
            L&apos;adresse accessible par le serveur MediaHub
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">
            Clé API Emby
          </label>
          <input
            type="text"
            name="emby_api_key"
            required
            value={formData.emby_api_key}
            onChange={onChange}
            className="block w-full rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <p className="text-xs text-gray-500 mt-1 ml-1">
            Générez une clé API dans le tableau de bord Emby (Avancé &gt; Clés API)
          </p>
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
            "Terminer l'installation"
          )}
        </button>
      </div>
    </form>
  )
}
