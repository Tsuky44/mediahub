'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'

interface PlayButtonProps {
    embyUrl: string
    embyItemId: string
    serverId: string
}

export function PlayButton({ embyUrl, embyItemId, serverId }: PlayButtonProps) {
    const [showWebOption, setShowWebOption] = useState(false)

    const handlePlay = () => {
        const webUrl = `${embyUrl}/web/index.html#!/item?id=${embyItemId}&serverId=${serverId}`
        
        // Custom scheme for Emby apps
        // Try to construct a deep link that works better
        // The format emby://items/{id} or similar might be supported better than just replacing http
        // But replacing http with emby is the standard "universal" link method for Emby.
        // If it opens the app but not the content, it might be because the app doesn't support the full web path structure in the deep link.
        
        // Let's try to strip /web/index.html from the deep link if possible, or keep it.
        // Some docs suggest: emby://server-address/web/index.html...
        // Others suggest: emby://item?id=...&serverId=...
        
        // Let's try preserving the full URL structure first (current behavior)
        // If that fails to navigate, maybe we need to be more specific.
        // Actually, the issue is often that the app just opens home.
        
        // Let's try to be cleaner with the URL.
        const appUrl = webUrl.replace(/^https?:\/\//, 'emby://')
        
        // 1. Attempt to open via custom protocol
        window.location.href = appUrl
        
        // 2. Show the web fallback option immediately
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
                className="flex items-center gap-2 rounded-full bg-indigo-600/90 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all hover:bg-indigo-500 hover:scale-105 hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] backdrop-blur-sm"
            >
                <Play className="h-4 w-4 fill-current" />
                <span>Lire sur Emby</span>
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
