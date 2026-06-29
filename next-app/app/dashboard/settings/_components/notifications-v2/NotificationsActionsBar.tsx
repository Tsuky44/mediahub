'use client'

import { Save, Send } from 'lucide-react'

interface NotificationsActionsBarProps {
  saving: boolean
  message: string | null
  onSave: () => void
  onTest: () => void
}

export default function NotificationsActionsBar({
  saving,
  message,
  onSave,
  onTest,
}: NotificationsActionsBarProps) {
  return (
    <div className="flex items-center gap-3 pt-4 border-t border-white/10">
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
      </button>
      <button
        onClick={onTest}
        className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
      >
        <Send className="w-4 h-4" />
        Envoyer un test
      </button>
      {message && (
        <span className={`text-sm ${message.startsWith('✅') ? 'text-green-400' : message.startsWith('❌') ? 'text-red-400' : 'text-gray-300'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
