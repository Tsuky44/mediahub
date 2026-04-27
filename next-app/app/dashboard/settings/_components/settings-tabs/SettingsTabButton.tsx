'use client'

import type { ComponentType, ReactNode } from 'react'

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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            <Icon size={16} />
            {label}
            {badge}
        </button>
    )
}
