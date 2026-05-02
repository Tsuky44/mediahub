'use client'

import type { TrackerStatsTab } from '../../_hooks/useTrackerStatsModal'

interface TrackerModalTabButtonProps {
    label: string
    target: TrackerStatsTab
    active: TrackerStatsTab
    onClick: (t: TrackerStatsTab) => void
}

export function TrackerModalTabButton({ label, target, active, onClick }: TrackerModalTabButtonProps) {
    const isActive = active === target
    return (
        <button
            onClick={() => onClick(target)}
            className={`flex-1 p-4 text-sm font-bold transition-colors border-b-2 ${
                isActive
                    ? 'text-purple-400 border-purple-400'
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
        >
            {label}
        </button>
    )
}
