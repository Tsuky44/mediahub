'use client'

import { Container } from 'lucide-react'

export default function DockerLoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Container className="w-5 h-5 text-blue-500" />
                </div>
            </div>
            <p className="text-gray-500 font-medium animate-pulse">
                Chargement des conteneurs...
            </p>
        </div>
    )
}
