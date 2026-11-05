'use client'

import { Library } from 'lucide-react'

interface PublicDomainCardProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  /** Dernière année de publication déjà dans le domaine public */
  yearLimit: number | null
}

/**
 * Filtre « Libre de droits » : borne la date de publication à la limite du domaine public
 * américain (même règle que la pastille de la fiche média).
 */
export function PublicDomainCard({ enabled, onChange, yearLimit }: PublicDomainCardProps) {
  return (
    <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-indigo-400">
        <Library className="h-4 w-4" />
        <h4 className="font-bold text-white">Libre de droits</h4>
      </div>
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-gray-400 leading-relaxed">
          Ne garder que le domaine public : œuvres publiées
          {yearLimit ? ` jusqu'en ${yearLimit}` : ''}, libres de droits aux États-Unis.
        </p>
        <label className="relative inline-flex shrink-0 items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
        </label>
      </div>
    </div>
  )
}
