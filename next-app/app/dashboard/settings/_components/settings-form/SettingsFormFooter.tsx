'use client'

import { Save, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'

interface SettingsFormFooterProps {
  readOnly: boolean
  loading: boolean
  statusMessage: { type: 'success' | 'error'; text: string } | null
}

export function SettingsFormFooter({ readOnly, loading, statusMessage }: SettingsFormFooterProps) {
  if (readOnly) return null

  return (
    // Collé en bas de l'écran : plus besoin de défiler jusqu'au bout pour enregistrer.
    // Téléphone : marge à droite pour la bulle d'aide, bouton sur la largeur restante.
    <div className="sticky bottom-3 z-20 flex items-center justify-end gap-3 rounded-2xl border border-white/10 bg-[#161818] p-2.5 pr-[4.75rem] shadow-[0_18px_40px_rgb(0_0_0/0.55)] sm:ml-auto sm:w-fit sm:max-w-full sm:p-3 sm:pr-3">
      {statusMessage && (
        <div
          className={clsx(
            'flex min-w-0 items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-right-4 [&>svg]:shrink-0',
            statusMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
          )}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {statusMessage.text}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className={clsx(
          'flex min-h-11 flex-1 items-center justify-center gap-2 px-6 py-2.5 sm:flex-none bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          loading && 'animate-pulse'
        )}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        <span>Enregistrer</span>
      </button>
    </div>
  )
}
