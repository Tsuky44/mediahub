'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { useMediaServerType } from '@/app/dashboard/_hooks/useMediaServerType'

interface PlayButtonProps {
    embyUrl: string
    embyItemId: string
    serverId: string
}

export function PlayButton({ embyUrl, embyItemId, serverId }: PlayButtonProps) {
    const [showWebOption, setShowWebOption] = useState(false)
    const serverType = useMediaServerType()
    const isJellyfin = serverType === 'jellyfin'
    const serverName = isJellyfin ? 'Jellyfin' : 'Emby'
    const appScheme = isJellyfin ? 'jellyfin://' : 'emby://'

    const handlePlay = () => {
        const webUrl = `${embyUrl}/web/index.html#!/item?id=${embyItemId}&serverId=${serverId}`
        const appUrl = webUrl.replace(/^https?:\/\//, appScheme)

        window.location.href = appUrl
        setShowWebOption(true)
    }

    const openWeb = (e: React.MouseEvent) => {
        e.stopPropagation()
        const webUrl = `${embyUrl}/web/index.html#!/item?id=${embyItemId}&serverId=${serverId}`
        window.open(webUrl, '_blank')
    }

    return (
        <div className="flex flex-col items-start gap-2">
            <button
                onClick={handlePlay}
                className="flex items-center gap-2 rounded-full bg-indigo-600/90 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_15px_rgba(232,230,228,0.16)] transition-all hover:bg-indigo-500 hover:scale-105 hover:shadow-[0_0_25px_rgba(232,230,228,0.24)] backdrop-blur-sm"
            >
                <Play className="h-4 w-4 fill-current" />
                <span>{`Lire sur ${serverName}`}</span>
            </button>
            
            {showWebOption && (
                <button 
                    onClick={openWeb}
                    className="ml-2 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                >
                    Ouvrir le lecteur web si l'app ne se lance pas
                </button>
            )}
        </div>
    )
}
