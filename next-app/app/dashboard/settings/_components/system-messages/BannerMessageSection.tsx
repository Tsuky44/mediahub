'use client'

interface BannerMessageSectionProps {
  enabled: boolean
  onToggle: () => void
  content: string
  onContentChange: (value: string) => void
  speed: number
  onSpeedChange: (speed: number) => void
}

export function BannerMessageSection({ enabled, onToggle, content, onContentChange, speed, onSpeedChange }: BannerMessageSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Bannière de Login (Pré-connexion)
      </h3>

      <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-300">Activer la bannière</label>
            <p className="text-xs text-gray-500">S&apos;affiche en permanence sur la page de connexion.</p>
          </div>
          <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              enabled ? 'bg-emerald-600' : 'bg-gray-700'
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
          <label className="block text-sm font-medium text-gray-300">Contenu de la bannière</label>
          <textarea
            value={content}
            onChange={e => onContentChange(e.target.value)}
            rows={3}
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-y"
            placeholder="Entrez votre message de bannière ici..."
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-300">
              Vitesse de défilement (durée de l&apos;animation)
            </label>
            <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-emerald-400">{speed}s</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={1}
            value={speed}
            onChange={e => onSpeedChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Rapide (5s)</span>
            <span>Lent (60s)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
