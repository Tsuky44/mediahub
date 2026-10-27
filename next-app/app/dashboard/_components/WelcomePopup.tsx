'use client'

import { useState, useEffect } from 'react'
import { X, LayoutDashboard, Send, BarChart3, Download, Film, Info, Sparkles } from 'lucide-react'
import { markWelcomeAsSeen } from '@/app/dashboard/actions'
import { useMediaServerType } from '@/app/dashboard/_hooks/useMediaServerType'
import clsx from 'clsx'

interface WelcomePopupProps {
    show: boolean
    userRole?: string
}

export function WelcomePopup({ show, userRole }: WelcomePopupProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [closing, setClosing] = useState(false)

    const isAdminOrUserPlus = userRole === 'admin' || userRole === 'user_plus'
    const serverType = useMediaServerType()
    const serverName = serverType === 'jellyfin' ? 'Jellyfin' : 'Emby'

    useEffect(() => {
        if (show) {
            setIsOpen(true)
        }
    }, [show])

    const handleClose = async () => {
        setClosing(true)
        await markWelcomeAsSeen()
        setTimeout(() => {
            setIsOpen(false)
        }, 300)
    }

    if (!isOpen) return null

    const features = [
        {
            icon: <LayoutDashboard className="w-5 h-5 text-blue-400" />,
            title: "Tableau de Bord",
            description: "Votre point d'entrée central avec vos activités récentes et les services actifs.",
            show: true
        },
        {
            icon: <Send className="w-5 h-5 text-purple-400" />,
            title: "Demandes",
            description: "Besoin d'un nouveau film ou d'une série ? C'est ici que ça se passe.",
            show: true
        },
        {
            icon: <BarChart3 className="w-5 h-5 text-green-400" />,
            title: "Statistiques",
            description: "Découvrez vos habitudes de visionnage et les tendances du moment.",
            show: true
        },
        {
            icon: <Download className="w-5 h-5 text-orange-400" />,
            title: "Téléchargements",
            description: "Suivez en temps réel l'état des téléchargements en cours.",
            show: isAdminOrUserPlus
        },
        {
            icon: <Film className="w-5 h-5 text-red-400" />,
            title: "Médiathèque",
            description: `Explorez tout le contenu disponible sur ${serverName} directement d'ici.`,
            show: true
        }
    ].filter(f => f.show)

    return (
        <div className={clsx(
            "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            closing ? "opacity-0" : "opacity-100"
        )}>
            <div className={clsx(
                "bg-[#1a1c1c] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl transition-all duration-300 transform",
                closing ? "scale-95 translate-y-4" : "scale-100 translate-y-0"
            )}>
                {/* Header */}
                <div className="relative p-6 border-b border-white/5 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
                    <button 
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors text-white/50 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Sparkles className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Bienvenue sur le nouveau site !</h2>
                    </div>
                    <p className="text-white/60">
                        J'ai repensé l'interface pour rendre votre expérience plus fluide et agréable.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="grid gap-6">
                        {features.map((feature, idx) => (
                            <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors group">
                                <div className="mt-1">
                                    {feature.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-white/50 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-between gap-6">
                    <div className="flex gap-3 items-center text-yellow-500/80">
                        <Info className="w-5 h-5 shrink-0" />
                        <p className="text-xs leading-tight">
                            Des suggestions ou un bug ? <br />
                            <strong>N'hésitez pas à m'en faire part !</strong>
                        </p>
                    </div>
                    
                    <button
                        onClick={handleClose}
                        className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-all transform hover:scale-105 active:scale-95 shrink-0"
                    >
                        C'est parti !
                    </button>
                </div>
            </div>
        </div>
    )
}
