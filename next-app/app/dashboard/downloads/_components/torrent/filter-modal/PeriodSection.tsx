'use client'

import { Calendar } from 'lucide-react'

interface PeriodSectionProps {
  dateFrom: string
  onChange: (value: string) => void
}

export function PeriodSection({ dateFrom, onChange }: PeriodSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
          <Calendar className="h-4 w-4 text-indigo-400" />
          Période
        </div>
        <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
              À partir de
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={e => onChange(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
