'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { SETTINGS_TABS, isSettingsTabId } from '../_constants/settings-tabs-config'
import type { SettingsTabId, SettingsTabPermissions } from '../_types/settings-tabs'

interface UseSettingsTabsResult {
    activeTab: SettingsTabId
    setActiveTab: (id: SettingsTabId) => void
}

/**
 * Owns the active settings tab.
 *
 * Selection rules (preserved from the original component):
 * - If `?tab=` is a known tab id, it wins on initial render and on URL
 *   changes (back / forward navigation).
 * - Otherwise the first tab the user has permission to see is selected,
 *   following the order of `SETTINGS_TABS`.
 * - As an ultimate fallback, `services` is selected.
 */
export function useSettingsTabs(permissions: SettingsTabPermissions): UseSettingsTabsResult {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')

    const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
        if (isSettingsTabId(tabParam)) return tabParam
        const firstAvailable = SETTINGS_TABS.find(def => permissions[def.permissionKey])
        return firstAvailable?.id ?? 'services'
    })

    useEffect(() => {
        if (isSettingsTabId(tabParam)) {
            setActiveTab(tabParam)
        }
    }, [tabParam])

    return { activeTab, setActiveTab }
}
