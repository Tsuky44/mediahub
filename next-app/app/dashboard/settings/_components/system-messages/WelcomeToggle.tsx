'use client'

interface WelcomeToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function WelcomeToggle({ enabled, onChange }: WelcomeToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
      <div>
        <label className="text-base font-medium text-white">Message de Bienvenue (Tutoriel)</label>
        <p className="text-sm text-gray-400">
          Afficher le message de bienvenue par défaut lors de la première connexion.
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
      </label>
    </div>
  )
}
