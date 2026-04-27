'use client'

import { Layers } from 'lucide-react'

export default function GroupListEmpty() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white/5 rounded-3xl border-2 border-dashed border-white/10 group hover:border-indigo-500/20 transition-colors">
            <div className="p-5 bg-black/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <Layers className="w-10 h-10 text-gray-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="text-gray-300 font-bold text-lg">Aucun groupe</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-[200px]">
                Commencez par créer un groupe pour organiser vos conteneurs.
            </p>
        </div>
    )
}
