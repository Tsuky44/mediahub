'use client'

import { useState } from 'react'
import { Box, Cpu, Terminal, Copy, Check } from 'lucide-react'
import type { ContainerInfo } from '../../_types/container-details'

interface DetailCardProps {
    title: string
    icon?: React.ReactNode
    children: React.ReactNode
    className?: string
}

function DetailCard({ title, icon, children, className }: DetailCardProps) {
    return (
        <div className={`p-6 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 space-y-3 hover:bg-white/[0.03] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden ${className || ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                {icon}
                {title}
            </label>
            {children}
        </div>
    )
}

interface InfoTabProps {
    details: ContainerInfo
}

/** Tab "Général" : image, ID, platform, creation, commande. */
export function InfoTab({ details }: InfoTabProps) {
    const [copiedId, setCopiedId] = useState(false)

    const copyId = () => {
        navigator.clipboard.writeText(details.id)
        setCopiedId(true)
        setTimeout(() => setCopiedId(false), 2000)
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailCard title="Image" icon={<Box className="w-4 h-4" />}>
                    <p className="text-sm text-white font-mono break-all leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors shadow-inner">
                        {details.image}
                    </p>
                </DetailCard>

                <DetailCard title="Container ID" icon={<Cpu className="w-4 h-4" />}>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-mono bg-black/40 p-3 rounded-xl border border-white/5 flex-1 group-hover:border-white/10 transition-colors shadow-inner">
                            {details.id.substring(0, 12)}
                        </p>
                        <button
                            onClick={copyId}
                            className="p-3 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-xl transition-all text-gray-500 border border-transparent hover:border-indigo-500/30 active:scale-95"
                            title="Copier ID complet"
                        >
                            {copiedId ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                        </button>
                    </div>
                </DetailCard>

                <DetailCard title="Platform">
                    <p className="text-sm text-white font-bold">{details.platform}</p>
                </DetailCard>

                <DetailCard title="Création">
                    <p className="text-sm text-white font-bold">{new Date(details.created).toLocaleString()}</p>
                </DetailCard>

                <DetailCard title="Commande" icon={<Terminal className="w-4 h-4" />} className="md:col-span-2">
                    <p className="text-sm text-gray-300 font-mono bg-black/40 p-4 rounded-xl mt-1 border border-white/5 overflow-x-auto group-hover:border-white/10 transition-colors shadow-inner">
                        {details.cmd || 'Aucune commande spécifique'}
                    </p>
                </DetailCard>
            </div>
        </div>
    )
}
