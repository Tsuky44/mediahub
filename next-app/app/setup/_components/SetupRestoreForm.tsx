'use client'

import { useState } from 'react'
import { RefreshCw, AlertCircle, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

interface SetupRestoreFormProps {
  restorePassword: string
  showPassword: boolean
  loading: boolean
  onTogglePassword: () => void
  onPasswordChange: (value: string) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
}

export function SetupRestoreForm({
  restorePassword,
  showPassword,
  loading,
  onTogglePassword,
  onPasswordChange,
  onFileChange,
  onSubmit,
}: SetupRestoreFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
            La restauration remplacera la configuration actuelle. Assurez-vous d&apos;avoir le mot de passe de déchiffrement.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">
            Fichier de sauvegarde (.enc)
          </label>
          <div className="relative group">
            <input
              type="file"
              accept=".enc"
              onChange={onFileChange}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-600 file:text-white
                hover:file:bg-indigo-700
                cursor-pointer bg-white/5 rounded-xl border border-white/10 p-2"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-1">
            Sélectionnez votre fichier de sauvegarde chiffré
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 ml-1 mb-2">
            Mot de passe de déchiffrement
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={restorePassword}
              onChange={e => onPasswordChange(e.target.value)}
              className="block w-full rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-10 pr-10 py-3"
              placeholder="Mot de passe"
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
  )
}
