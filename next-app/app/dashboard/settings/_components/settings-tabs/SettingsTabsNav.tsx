'use client'

import SettingsTabButton from './SettingsTabButton'
import { SETTINGS_TABS } from '../../_constants/settings-tabs-config'
import type { SettingsTabId, SettingsTabPermissions } from '../../_types/settings-tabs'

interface SettingsTabsNavProps {
    permissions: SettingsTabPermissions
    activeTab: SettingsTabId
    onChange: (id: SettingsTabId) => void
    pendingRequestsCount: number
}

export default function SettingsTabsNav({
    permissions,
    activeTab,
    onChange,
    pendingRequestsCount,
}: SettingsTabsNavProps) {
    return (
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 flex-wrap">
            {SETTINGS_TABS.map(def => {
                if (!permissions[def.permissionKey]) return null

                const badge =
                    def.id === 'requests' && pendingRequestsCount > 0 ? (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {pendingRequestsCount}
                        </span>
                    ) : undefined

                return (
                    <SettingsTabButton
                        key={def.id}
                        icon={def.icon}
                        label={def.label}
                        isActive={activeTab === def.id}
                        onClick={() => onChange(def.id)}
                        badge={badge}
                    />
                )
            })}
        </div>
    )
}
