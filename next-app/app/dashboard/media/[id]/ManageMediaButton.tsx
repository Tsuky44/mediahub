'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { ManageMediaModal } from './ManageMediaModal'

interface ManageMediaButtonProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
}

export function ManageMediaButton({ tmdbId, mediaType, title }: ManageMediaButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-700 transition text-white group"
        title="Gérer le média"
      >
        <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
      </button>

      <ManageMediaModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tmdbId={tmdbId}
        mediaType={mediaType}
        title={title}
      />
    </>
  )
}
