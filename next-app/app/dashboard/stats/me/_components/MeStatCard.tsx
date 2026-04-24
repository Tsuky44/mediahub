import React from 'react'

interface MeStatCardProps {
    title: string
    value: string
    subValue: string
    icon: React.ReactNode
}

/** Carte stat simplifiee pour la page "mes statistiques" (style sobre). */
export function MeStatCard({ title, value, subValue, icon }: MeStatCardProps) {
    return (
        <div className="rounded-xl bg-gray-800 p-6 shadow-sm border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400">{title}</span>
                {icon}
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <p className="text-xs text-gray-500 mt-1">{subValue}</p>
        </div>
    )
}
