'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'

export function SourceFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSource = searchParams.get('source') || 'all'

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSource = e.target.value
    const params = new URLSearchParams(searchParams)
    
    if (newSource === 'all') {
      params.delete('source')
    } else {
      params.set('source', newSource)
    }
    
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 backdrop-blur-md hover:bg-white/10 transition-colors duration-300 shadow-sm">
      <Filter size={14} className="text-gray-400" />
      <select 
        value={currentSource} 
        onChange={handleChange}
        className="bg-transparent border-none text-sm text-gray-200 focus:ring-0 cursor-pointer [&>option]:bg-gray-900 [&>option]:text-gray-200 outline-none"
      >
        <option value="all">Toutes les sources</option>
        <option value="emby">Emby</option>
        <option value="plex">Plex</option>
        <option value="jellyfin">Jellyfin</option>
      </select>
    </div>
  )
}
