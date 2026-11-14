import { Bot } from 'lucide-react'
import clsx from 'clsx'
import { SectionHeader, SECTION_WIDE } from '../SharedComponents'
import type { SettingsFormData } from '../types'

export type ManagerMode = 'arr' | 'sorraa'

const kind = (value: string): ManagerMode => (value === 'sorraa' ? 'sorraa' : 'arr')

/**
 * Gestionnaire en place d'après les deux réglages enregistrés (films, séries). `mixed` : une
 * configuration d'avant ce bouton, où films et séries n'ont pas le même gestionnaire.
 */
export function getManagerMode(formData: SettingsFormData): ManagerMode | 'mixed' {
  const movie = kind(formData.download_manager_movie)
  const tv = kind(formData.download_manager_tv)
  return movie === tv ? movie : 'mixed'
}

const OPTIONS: Array<{ value: ManagerMode; label: string; hint: string }> = [
  { value: 'arr', label: 'Radarr et Sonarr', hint: 'Radarr pour les films, Sonarr pour les séries' },
  { value: 'sorraa', label: 'sorraa', hint: 'Un seul service pour les films et les séries' },
]

interface ManagerSwitchProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string) => void
  readOnly?: boolean
}

/**
 * Choix du gestionnaire des demandes. Il ne règle que `download_manager_movie` et
 * `download_manager_tv` : les adresses et clés de l'autre gestionnaire restent enregistrées,
 * seulement masquées.
 */
export function ManagerSwitch({ formData, updateField, readOnly }: ManagerSwitchProps) {
  const mode = getManagerMode(formData)

  const choose = (value: ManagerMode) => {
    updateField('download_manager_movie', value)
    updateField('download_manager_tv', value)
  }

  return (
    <div className={`rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-6 shadow-xl ${SECTION_WIDE}`}>
      <SectionHeader
        icon={Bot}
        title="Gestionnaire des demandes"
        description="Service qui reçoit les demandes de films et de séries, et dont MediaHub lit la disponibilité et les téléchargements"
      />
      <div role="radiogroup" aria-label="Gestionnaire des demandes" className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(option => {
          const selected = mode === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              onClick={() => choose(option.value)}
              className={clsx(
                'flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 active:scale-[0.99] disabled:opacity-50',
                selected
                  ? 'border-indigo-500/40 bg-indigo-600/15 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                  selected ? 'border-indigo-400' : 'border-white/25'
                )}
              >
                {selected && <span className="size-2.5 rounded-full bg-indigo-400" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs text-white/50">{option.hint}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/50">
        {mode === 'mixed'
          ? `Configuration actuelle : films via ${kind(formData.download_manager_movie) === 'sorraa' ? 'sorraa' : 'Radarr'}, séries via ${kind(formData.download_manager_tv) === 'sorraa' ? 'sorraa' : 'Sonarr'}. Elle reste en place tant que vous ne choisissez pas l'un des deux ci-dessus. `
          : ''}
        Le choix s&apos;applique après « Enregistrer ». Les réglages de l&apos;autre gestionnaire sont conservés.
      </p>
    </div>
  )
}
