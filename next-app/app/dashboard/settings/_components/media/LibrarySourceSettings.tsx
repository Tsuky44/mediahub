'use client'

import { Library } from 'lucide-react'
import { SectionHeader } from '../SharedComponents'
import { BRAND, ONYX_BRAND } from '@/lib/media-server-brand'
import type { SettingsFormData } from '../types'

interface LibrarySourceSettingsProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string | boolean | number | null | undefined) => void
  readOnly?: boolean
}

interface Platform {
  id: 'emby' | 'jellyfin' | 'plex' | 'onyx'
  name: string
  /** MediaHub sait lire sa bibliothèque (Emby, Jellyfin par l'API compatible, Plex par le jeton, Onyx par la clé d'intégration) */
  library: boolean
  selected: string
}

/**
 * Plateforme affichée dans « Ma médiathèque ». Une seule plateforme configurée : elle est prise
 * d'office. Plusieurs : l'administrateur choisit (lib/auth/service-factories.ts, getLibraryServer).
 */
export function LibrarySourceSettings({ formData, updateField, readOnly }: LibrarySourceSettingsProps) {
  const configured: Platform[] = (
    [
      { id: 'emby', name: 'Emby', library: true, selected: BRAND.emby.selected, on: !!(formData.emby_url && formData.emby_api_key) },
      { id: 'jellyfin', name: 'Jellyfin', library: true, selected: BRAND.jellyfin.selected, on: !!formData.jellyfin_url },
      { id: 'plex', name: 'Plex', library: true, selected: BRAND.plex.selected, on: !!(formData.plex_url && formData.plex_token) },
      {
        id: 'onyx',
        name: 'Onyx',
        library: !!formData.player_integration_api_key,
        selected: ONYX_BRAND.selected,
        on: !!(formData.onyx_url && (formData.auth_onyx_enabled || formData.player_integration_api_key)),
      },
    ] as const
  )
    .filter((p) => p.on)
    .map(({ on: _on, ...p }) => p)

  const readable = configured.filter((p) => p.library)
  // Choix enregistré s'il est encore configuré, sinon la première plateforme lisible (comme le serveur)
  const current = readable.find((p) => p.id === formData.library_source) ?? readable[0]

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
      <SectionHeader icon={Library} title="Ma médiathèque" description="Plateforme dont la bibliothèque est affichée" />

      {configured.length === 0 ? (
        <p className="text-sm text-white/60">Aucune plateforme configurée : renseignez Emby, Jellyfin ou Onyx ci-dessous.</p>
      ) : configured.length === 1 ? (
        <p className="text-sm text-white/70">
          {current
            ? `${current.name} est la seule plateforme configurée : sa bibliothèque est affichée.`
            : configured[0].id === 'onyx'
              ? "Onyx est la seule plateforme configurée : enregistrez la clé d'intégration (bloc Onyx ci-dessous) pour afficher sa bibliothèque."
              : `${configured[0].name} est la seule plateforme configurée, mais MediaHub ne sait pas encore afficher sa bibliothèque.`}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-white/70">Plusieurs plateformes sont configurées : choisissez celle à afficher.</p>
          <div role="radiogroup" aria-label="Plateforme de la médiathèque" className="flex flex-wrap gap-3">
            {configured.map((p) => {
              const active = current?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={readOnly || !p.library}
                  onClick={() => updateField('library_source', p.id)}
                  title={p.library ? undefined : p.id === 'onyx' ? 'Connectez le compte de service Onyx pour afficher sa bibliothèque' : `MediaHub ne sait pas encore afficher la bibliothèque ${p.name}`}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                    active
                      ? p.selected || 'bg-white/15 text-white ring-1 ring-inset ring-white/30'
                      : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5'
                  }`}
                >
                  {p.name}
                  {!p.library && <span className="ml-2 text-xs font-normal">{p.id === 'onyx' ? '(compte de service requis)' : '(bientôt)'}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
