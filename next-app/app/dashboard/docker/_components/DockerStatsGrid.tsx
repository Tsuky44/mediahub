'use client'

import { Container, Play, Square, Layers } from 'lucide-react'

interface StatCardProps {
    value: number
    label: string
    color: 'indigo' | 'emerald' | 'rose' | 'violet'
    icon: React.ReactNode
}

function StatCard({ value, label, color, icon }: StatCardProps) {
    const colorClasses = {
        indigo: { shadow: 'hover:shadow-indigo-500/10', bg: 'from-indigo-500/5', iconBg: 'bg-indigo-500/10', iconBorder: 'border-indigo-500/10', iconShadow: 'shadow-indigo-500/5', hover: 'group-hover:text-indigo-200' },
        emerald: { shadow: 'hover:shadow-emerald-500/10', bg: 'from-emerald-500/5', iconBg: 'bg-emerald-500/10', iconBorder: 'border-emerald-500/10', iconShadow: 'shadow-emerald-500/5', hover: 'group-hover:text-emerald-200' },
        rose: { shadow: 'hover:shadow-rose-500/10', bg: 'from-rose-500/5', iconBg: 'bg-rose-500/10', iconBorder: 'border-rose-500/10', iconShadow: 'shadow-rose-500/5', hover: 'group-hover:text-rose-200' },
        violet: { shadow: 'hover:shadow-violet-500/10', bg: 'from-violet-500/5', iconBg: 'bg-violet-500/10', iconBorder: 'border-violet-500/10', iconShadow: 'shadow-violet-500/5', hover: 'group-hover:text-violet-200' },
    }[color]

    return (
        <div className={`bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex items-center gap-5 hover:bg-white/[0.03] transition-colors group hover:shadow-2xl ${colorClasses.shadow} hover:-translate-y-1 duration-300 relative overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses.bg} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className={`p-3.5 ${colorClasses.iconBg} rounded-2xl group-hover:scale-110 transition-transform duration-300 border ${colorClasses.iconBorder} relative z-10 shadow-lg ${colorClasses.iconShadow}`}>
                {icon}
            </div>
            <div className="relative z-10">
                <div className={`text-3xl font-black text-white tracking-tight ${colorClasses.hover} transition-colors`}>{value}</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">{label}</div>
            </div>
        </div>
    )
}

interface DockerStatsGridProps {
    total: number
    running: number
    stopped: number
    groups: number
}

export function DockerStatsGrid({ total, running, stopped, groups }: DockerStatsGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard value={total} label="Total" color="indigo" icon={<Container className="w-6 h-6 text-indigo-400" />} />
            <StatCard value={running} label="En ligne" color="emerald" icon={<Play className="w-6 h-6 text-emerald-400" />} />
            <StatCard value={stopped} label="Arrêtés" color="rose" icon={<Square className="w-6 h-6 text-rose-400" />} />
            <StatCard value={groups} label="Groupes" color="violet" icon={<Layers className="w-6 h-6 text-violet-400" />} />
        </div>
    )
}
