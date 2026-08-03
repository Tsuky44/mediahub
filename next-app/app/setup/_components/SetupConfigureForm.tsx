'use client'

import { Server, Loader2, MonitorPlay } from 'lucide-react'

type ServerType = 'emby' | 'jellyfin'

interface SetupConfigureFormProps {
  formData: {
    server_type: ServerType
    emby_url: string
    emby_api_key: string
    jellyfin_url: string
    jellyfin_api_key: string
  }
  loading: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
  onServerTypeChange: (type: ServerType) => void
}

export function SetupConfigureForm({
  formData,
  loading,
  onChange,
  onSubmit,
  onServerTypeChange,
}: SetupConfigureFormProps) {
  const isJellyfin = formData.server_type === 'jellyfin'
  const urlField = isJellyfin ? 'jellyfin_url' : 'emby_url'
  const apiKeyField = isJellyfin ? 'jellyfin_api_key' : 'emby_api_key'
  const urlValue = isJellyfin ? formData.jellyfin_url : formData.emby_url
  const apiKeyValue = isJellyfin ? formData.jellyfin_api_key : formData.emby_api_key
  const defaultPort = 'http://localhost:8096'

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <Server className="text-indigo-400" /> Configuration du serveur
        </h2>
        <p className="text-sm text-gray-400">MediaHub utilise un serveur média comme backend.</p>
      </div>

      {/* Server type selector */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300 ml-1">
          Type de serveur
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onServerTypeChange('emby')}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${
              !isJellyfin
                ? 'border-green-500/50 bg-green-600/20 text-green-400'
                : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Server className="h-4 w-4" />
            Emby
          </button>
          <button
            type="button"
            onClick={() => onServerTypeChange('jellyfin')}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${
              isJellyfin
                ? 'border-purple-500/50 bg-purple-600/20 text-purple-400'
                : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <MonitorPlay className="h-4 w-4" />
            Jellyfin
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className={`border rounded-xl p-4 mb-4 ${
          isJellyfin
            ? 'bg-purple-500/10 border-purple-500/20'
            : 'bg-green-500/10 border-green-500/20'
        }`}>
          <p className={`text-sm ${
            isJellyfin ? 'text-purple-200' : 'text-green-200'
          }`}>
            Connectez-vous à votre instance {isJellyfin ? 'Jellyfin' : 'Emby'} pour commencer.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">
            URL du serveur {isJellyfin ? 'Jellyfin' : 'Emby'}
          </label>
          <input
            type="url"
            name={urlField}
            required
            value={urlValue}
            onChange={onChange}
            className="block w-full rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3"
            placeholder={defaultPort}
          />
          <p className="text-xs text-gray-500 mt-1 ml-1">
            L&apos;adresse accessible par le serveur MediaHub
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">
            Clé API {isJellyfin ? 'Jellyfin' : 'Emby'}
          </label>
          <input
            type="text"
            name={apiKeyField}
            required
            value={apiKeyValue}
            onChange={onChange}
            className="block w-full rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 font-mono"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <p className="text-xs text-gray-500 mt-1 ml-1">
            {isJellyfin
              ? 'Générez une clé API dans le tableau de bord Jellyfin (Avancé > Clés API)'
              : 'Générez une clé API dans le tableau de bord Emby (Avancé > Clés API)'}
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
