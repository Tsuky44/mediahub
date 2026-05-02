'use client'

interface PopupMessageSectionProps {
  enabled: boolean
  onToggle: () => void
  content: string
  onContentChange: (value: string) => void
  version: string
}

export function PopupMessageSection({ enabled, onToggle, content, onContentChange, version }: PopupMessageSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        Message Pop-up (Post-connexion)
      </h3>

      <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-300">Activer le pop-up</label>
            <p className="text-xs text-gray-500">S&apos;affiche une seule fois par version après la connexion.</p>
          </div>
          <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              enabled ? 'bg-indigo-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Contenu du message</label>
          <textarea
            value={content}
            onChange={e => onContentChange(e.target.value)}
            rows={4}
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y"
            placeholder="Entrez votre message pop-up ici..."
          />
          <p className="text-xs text-gray-500">
            Version actuelle: <span className="font-mono text-indigo-400">{version}</span> (Une modification forcera la réapparition)
          </p>
        </div>
      </div>
    </div>
  )
}
