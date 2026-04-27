'use client'

import { Activity } from 'lucide-react'

export default function DockerAccessDeniedView() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="p-4 bg-red-500/10 rounded-full">
                <Activity className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Accès non autorisé</h1>
            <p className="text-gray-400">
                Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
            </p>
        </div>
    )
}
