'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { useIsOnyxAccount, useMediaServerType } from '@/app/dashboard/_hooks/useMediaServerType'

interface PlayButtonProps {
    embyUrl: string | null
    embyItemId: string
    serverId: string | null
    tmdbId: number
    mediaType: 'movie' | 'tv'
}

export function PlayButton({ embyUrl, embyItemId, serverId, tmdbId, mediaType }: PlayButtonProps) {
    const [showWebOption, setShowWebOption] = useState(false)
    const serverType = useMediaServerType()
    const isOnyx = useIsOnyxAccount()
    const isJellyfin = serverType === 'jellyfin'
    const serverName = isOnyx ? 'Onyx' : isJellyfin ? 'Jellyfin' : 'Emby'
    const appScheme = isJellyfin ? 'jellyfin://' : 'emby://'

    // Sans réglage du serveur média, seul un compte Onyx peut lire (l'app Onyx reprend là où on s'est arrêté)
    if (!isOnyx && (!embyUrl || !serverId)) return null

    const webUrl = embyUrl && serverId
        ? `${embyUrl}/web/index.html#!/item?id=${embyItemId}&serverId=${serverId}`
        : null

    const handlePlay = () => {
        if (isOnyx) {
            window.location.href = `onyx://play?tmdbId=${tmdbId}&type=${mediaType}`
            return
        }
        if (!webUrl) return
        window.location.href = webUrl.replace(/^https?:\/\//, appScheme)
        setShowWebOption(true)
    }

    const openWeb = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (webUrl) window.open(webUrl, '_blank')
    }

    return (
        <div className="flex flex-col items-stretch sm:items-start gap-2">
            <button
                onClick={handlePlay}
                className="flex items-center justify-center gap-2 rounded-full bg-indigo-600/90 px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold text-white shadow-[0_0_15px_rgba(232,230,228,0.16)] transition-all hover:bg-indigo-500 hover:scale-105 hover:shadow-[0_0_25px_rgba(232,230,228,0.24)] backdrop-blur-sm"
            >
                <Play className="h-4 w-4 fill-current" />
                <span>Lire<span className="hidden sm:inline">{` sur ${serverName}`}</span></span>
            </button>

            {showWebOption && !isOnyx && (
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
