'use client'

import type { ComponentType, ReactNode } from 'react'
import clsx from 'clsx'

import type { SettingsTabIcon } from '../../_types/settings-tabs'

interface SettingsTabButtonProps {
    icon: ComponentType<SettingsTabIcon>
    label: string
    isActive: boolean
    onClick: () => void
    badge?: ReactNode
}

export default function SettingsTabButton({
    icon: Icon,
    label,
    isActive,
    onClick,
    badge,
}: SettingsTabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border active:scale-[0.98]",
                isActive
                    ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/30 shadow-sm shadow-indigo-500/5 font-semibold"
                    : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
            )}
        >
            <div className="flex items-center gap-3">
                <Icon size={18} className={clsx(isActive ? "text-indigo-400" : "text-white/45")} />
                <span>{label}</span>
            </div>
            {badge && (
                <div className="shrink-0 ml-2">
                    {badge}
                </div>
            )}
        </button>
    )
}
