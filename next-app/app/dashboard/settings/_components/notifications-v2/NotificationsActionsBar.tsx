'use client'

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
    <div className="flex items-center gap-3 pt-4 border-t dark:border-gray-700">
      <button
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
      </button>
      <button
        onClick={onTest}
        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
      >
        Envoyer un test
      </button>
      {message && <span className="text-sm">{message}</span>}
    </div>
  )
}
