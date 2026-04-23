import { Tv, Download, Bot, HardDrive, Settings as SettingsIcon } from 'lucide-react'
import { TabType } from './types'

interface Props {
    activeTab: TabType
    onTabChange: (tab: TabType) => void
}

export const TabNavigation = ({ activeTab, onTabChange }: Props) => {
    const tabs = [
        { id: 'media', label: 'Média', icon: Tv },
        { id: 'downloads', label: 'Téléchargements', icon: Download },
        { id: 'automation', label: 'Automatisation', icon: Bot },
        { id: 'storage', label: 'Stockage', icon: HardDrive },
        { id: 'maintenance', label: 'Maintenance', icon: SettingsIcon },
    ] as const

    return (
        <div className="flex space-x-1 rounded-xl bg-gray-800/50 p-1">
            {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                            isActive
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                        }`}
                    >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
