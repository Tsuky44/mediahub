'use client'

import clsx from 'clsx'
import { Info, Terminal, Database, Network } from 'lucide-react'
import type { ContainerDetailsTab } from '../../_types/container-details'

interface SidebarTabConfig {
    id: ContainerDetailsTab
    label: string
    icon: React.ComponentType<{ className?: string }>
}

const TABS: SidebarTabConfig[] = [
    { id: 'info', label: 'Général', icon: Info },
    { id: 'env', label: 'Variables (ENV)', icon: Terminal },
    { id: 'volumes', label: 'Volumes', icon: Database },
    { id: 'network', label: 'Réseau & Ports', icon: Network },
]

interface DetailsSidebarTabsProps {
    activeTab: ContainerDetailsTab
    onChange: (tab: ContainerDetailsTab) => void
}

/** Sidebar verticale (ou horizontale mobile) de selection de tab pour les details conteneur. */
export function DetailsSidebarTabs({ activeTab, onChange }: DetailsSidebarTabsProps) {
    return (
        <div className="w-full md:w-64 bg-black/20 border-r border-white/5 p-3 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible scrollbar-hide">
            {TABS.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={clsx(
                            'flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all w-full text-left whitespace-nowrap group relative overflow-hidden',
                            isActive
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        )}
                    >
                        <Icon className={clsx('w-5 h-5 transition-colors', isActive ? 'text-white' : 'text-gray-500 group-hover:text-white')} />
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
