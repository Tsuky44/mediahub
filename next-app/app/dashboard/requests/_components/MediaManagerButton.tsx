'use client'

import { useState } from 'react'
import { HardDrive } from 'lucide-react'
import { MediaManagerModal } from '@/components/global/MediaManagerModal'

interface MediaManagerButtonProps {
    canDelete?: boolean
}

export function MediaManagerButton({ canDelete = false }: MediaManagerButtonProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-white rounded-xl transition-all text-sm font-medium"
            >
                <HardDrive className="w-4 h-4" />
                Gestion des médias
            </button>

            {open && (
                <MediaManagerModal
                    canDelete={canDelete}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    )
}
