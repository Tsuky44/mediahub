import React from 'react'
import { CountUp } from '@/components/ui/count-up'

interface StatCardProps {
    title: string
    value: string
    subValue: string
    icon: React.ReactNode
}

/** Carte statistique de l'en-tete (temps de visionnage, contenus vus, etc.). */
export function StatCard({ title, value, subValue, icon }: StatCardProps) {
    return (
        <div className="rounded-3xl bg-black/20 backdrop-blur-md p-6 shadow-xl border border-white/5 hover:bg-white/[0.03] hover:border-white/10 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{title}</span>
                <div className="p-2 bg-white/5 rounded-xl border border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mb-1 relative z-10 group-hover:text-indigo-100 transition-colors">
                <CountUp value={value} />
            </div>
            <p className="text-xs font-medium text-gray-500 relative z-10">{subValue}</p>
        </div>
    )
}
