'use client'

import { Search } from 'lucide-react'

interface TorrentSearchInputProps {
  value: string
  onChange: (value: string) => void
}

export function TorrentSearchInput({ value, onChange }: TorrentSearchInputProps) {
  return (
    <div className="relative flex-1 group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
      <input
        type="text"
        name="search-torrent"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck="false"
        data-1p-ignore="true"
        data-lpignore="true"
        data-form-type="other"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Rechercher..."
        className="w-full pl-11 pr-4 h-11 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all focus:bg-white/10 backdrop-blur-sm"
      />
    </div>
  )
}
