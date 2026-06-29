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
 * Owns the active settings tab and syncs it with the URL.
 */
export function useSettingsTabs(permissions: SettingsTabPermissions): UseSettingsTabsResult {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')

    const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
        const normalizedTab = tabParam === 'tickets' ? 'support' : tabParam
        if (isSettingsTabId(normalizedTab)) return normalizedTab
        const firstAvailable = SETTINGS_TABS.find(def => permissions[def.permissionKey])
        return firstAvailable?.id ?? 'media'
    })

    useEffect(() => {
        const normalizedTab = tabParam === 'tickets' ? 'support' : tabParam
        if (isSettingsTabId(normalizedTab)) {
            setActiveTab(normalizedTab)
        }
    }, [tabParam])

    const handleTabChange = (id: SettingsTabId) => {
        setActiveTab(id)
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            url.searchParams.set('tab', id)
            // also remove subtab to avoid confusion
            url.searchParams.delete('subtab')
            window.history.pushState(null, '', url.pathname + url.search)
        }
    }

    return { activeTab, setActiveTab: handleTabChange }
}
