'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import SettingsTabButton from './SettingsTabButton'
import { SETTINGS_TABS, SETTINGS_CATEGORIES } from '../../_constants/settings-tabs-config'
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const activeTabDef = SETTINGS_TABS.find(t => t.id === activeTab)
    const ActiveIcon = activeTabDef?.icon

    return (
        <div className="w-full">
            {/* Mobile Navigation Dropdown */}
            <div className="lg:hidden relative">
                <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-left shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <div className="flex items-center gap-3">
                        {ActiveIcon && <ActiveIcon size={20} className="text-indigo-400" />}
                        <span className="font-semibold text-base">{activeTabDef?.label || 'Menu'}</span>
                    </div>
                    <ChevronDown
                        size={20}
                        className={clsx("text-white/60 transition-transform duration-200", isMobileMenuOpen && "rotate-180")}
                    />
                </button>

                {isMobileMenuOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" 
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <div className="absolute left-0 right-0 mt-2 z-40 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-2 max-h-[70vh] overflow-y-auto space-y-4">
                            {SETTINGS_CATEGORIES.map(category => {
                                // Filter tabs user actually has permission to see
                                const visibleTabs = category.tabs.filter(tabId => {
                                    const def = SETTINGS_TABS.find(t => t.id === tabId)
                                    return def && permissions[def.permissionKey]
                                })

                                if (visibleTabs.length === 0) return null

                                return (
                                    <div key={category.title} className="space-y-1">
                                        <div className="px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white/40">
                                            {category.title}
                                        </div>
                                        <div className="space-y-1">
                                            {visibleTabs.map(tabId => {
                                                const def = SETTINGS_TABS.find(t => t.id === tabId)!
                                                const badge =
                                                    def.id === 'requests' && pendingRequestsCount > 0 ? (
                                                        <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-rose-500/20">
                                                            {pendingRequestsCount}
                                                        </span>
                                                    ) : undefined

                                                return (
                                                    <SettingsTabButton
                                                        key={def.id}
                                                        icon={def.icon}
                                                        label={def.label}
                                                        isActive={activeTab === def.id}
                                                        onClick={() => {
                                                            onChange(def.id)
                                                            setIsMobileMenuOpen(false)
                                                        }}
                                                        badge={badge}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Desktop Vertical Sidebar */}
            <div className="hidden lg:flex flex-col gap-6 bg-white/[0.02] border border-white/5 rounded-2xl p-4 shadow-xl">
                {SETTINGS_CATEGORIES.map(category => {
                    const visibleTabs = category.tabs.filter(tabId => {
                        const def = SETTINGS_TABS.find(t => t.id === tabId)
                        return def && permissions[def.permissionKey]
                    })

                    if (visibleTabs.length === 0) return null

                    return (
                        <div key={category.title} className="space-y-2">
                            <h3 className="px-3 text-xs font-black uppercase tracking-wider text-white/40 select-none">
                                {category.title}
                            </h3>
                            <div className="space-y-1">
                                {visibleTabs.map(tabId => {
                                    const def = SETTINGS_TABS.find(t => t.id === tabId)!
                                    const badge =
                                        def.id === 'requests' && pendingRequestsCount > 0 ? (
                                            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-rose-500/20">
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
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
