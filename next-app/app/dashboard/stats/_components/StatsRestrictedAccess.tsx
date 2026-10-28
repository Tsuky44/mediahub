import Link from 'next/link'
import { AlertCircle, ChevronRight } from 'lucide-react'

interface StatsRestrictedAccessProps {
    message: string
    linkHref: string
    linkLabel: string
}

/** Ecran d'acces refuse pour la page stats (non connecte ou sans permissions). */
export function StatsRestrictedAccess({ message, linkHref, linkLabel }: StatsRestrictedAccessProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-8">
            <div className="p-6 rounded-3xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-xl shadow-red-500/10 animate-in fade-in zoom-in duration-500">
                <AlertCircle size={64} className="animate-pulse" />
            </div>
            <div className="text-center space-y-2 max-w-md">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                    Accès restreint
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed">{message}</p>
            </div>
            <Link
                href={linkHref}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
            >
                <span>{linkLabel}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            </Link>
        </div>
    )
}
