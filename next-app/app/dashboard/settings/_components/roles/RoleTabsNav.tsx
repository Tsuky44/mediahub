'use client'

import type { TabMeta } from '../../_utils/role-tabs-config'

interface RoleTabsNavProps {
    tabs: TabMeta[]
    activeTab: string
    onChange: (tabId: string) => void
}

/** Barre de navigation des tabs de permissions (horizontale, scrollable). */
export function RoleTabsNav({ tabs, activeTab, onChange }: RoleTabsNavProps) {
    return (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
            {tabs.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                            isActive
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Icon size={16} />
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
