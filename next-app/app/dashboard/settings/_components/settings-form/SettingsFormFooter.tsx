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
    <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
      {statusMessage && (
        <div
          className={clsx(
            'flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-right-4',
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
          'flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          loading && 'animate-pulse'
        )}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        <span>Enregistrer</span>
      </button>
    </div>
  )
}
