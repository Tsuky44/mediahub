'use client'

import { Globe } from 'lucide-react'
import { LANGUAGES } from './_constants/media-filters-options'

interface LanguageCardProps {
  value: string
  onChange: (value: string) => void
}

export function LanguageCard({ value, onChange }: LanguageCardProps) {
  return (
    <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-indigo-400">
        <Globe className="h-4 w-4" />
        <h4 className="font-bold text-white">Langue</h4>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-900 border-gray-700 rounded-2xl text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
      >
        <option value="all">Toutes les langues</option>
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}
