'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { ProwlarrSearch } from '@/components/global/ProwlarrSearch'

interface SearchModalProps {
    isOpen: boolean
    onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    if (!mounted || !isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#080909]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 ring-1 ring-white/10">
                <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#080909]/95 backdrop-blur-xl z-10 rounded-t-3xl">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <Search className="w-5 h-5 text-purple-400" />
                        </div>
                        Recherche Interactive
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <ProwlarrSearch title="" canManage={true} />
                </div>
            </div>
        </div>,
        document.body
    )
}
