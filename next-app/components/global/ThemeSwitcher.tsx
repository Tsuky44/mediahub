'use client'

import clsx from 'clsx'
import { Check } from 'lucide-react'
import { THEMES, type ThemeId } from '@/lib/theme'
import { useTheme } from '@/components/providers/ThemeProvider'

/**
 * Aperçus des thèmes.
 *
 * Ces couleurs sont volontairement écrites en dur : ce sont des vignettes qui
 * doivent montrer chaque thème tel qu'il est, y compris celui qui n'est pas
 * actif. Elles ne doivent donc surtout pas suivre les variables du thème
 * courant.
 */
const PREVIEWS: Record<ThemeId, { surface: string; accent: string }> = {
  studio: {
    surface: '#101214',
    accent: '#7aa2d6',
  },
  classique: {
    surface: 'radial-gradient(circle at top center, #2d3e5a 0%, #020617 100%)',
    accent: '#6366f1',
  },
  ardoise: {
    surface: '#0a0a0b',
    accent: '#7aa2d6',
  },
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="px-3 py-2.5">
      <p className="px-1 mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500">
        Apparence
      </p>

      <div className="flex flex-col gap-1" role="radiogroup" aria-label="Thème de l'interface">
        {THEMES.map((option) => {
          const isActive = option.id === theme
          const preview = PREVIEWS[option.id]

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(option.id)}
              className={clsx(
                'flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
              )}
            >
              <span
                aria-hidden
                className="relative h-7 w-9 flex-none overflow-hidden rounded-md border border-white/10"
                style={{ background: preview.surface }}
              >
                <span
                  className="absolute left-1 right-1 bottom-1 h-1 rounded-full"
                  style={{ background: preview.accent }}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-tight">
                  {option.name}
                </span>
                <span className="block text-[11px] leading-tight text-gray-500 truncate">
                  {option.description}
                </span>
              </span>

              {isActive && <Check className="h-4 w-4 flex-none text-indigo-400" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
