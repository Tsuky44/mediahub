'use client'

import { Check } from 'lucide-react'

interface PermissionCheckboxProps {
    label: string
    checked: boolean
    onChange: () => void
    description?: string
    danger?: boolean
}

/**
 * Carte permission style "compact" (check indicator + label + description).
 * Utilise les couleurs rouges si danger pour attirer l'attention.
 */
export function PermissionCheckbox({
    label,
    checked,
    onChange,
    description,
    danger,
}: PermissionCheckboxProps) {
    return (
        <div
            onClick={onChange}
            className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all group ${
                checked
                    ? danger
                        ? 'bg-red-500/10 border-red-500/50'
                        : 'bg-indigo-500/10 border-indigo-500/50'
                    : 'bg-gray-800/50 border-white/5 hover:border-white/10'
            }`}
        >
            <div
                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    checked
                        ? danger
                            ? 'bg-red-500 border-red-500'
                            : 'bg-indigo-500 border-indigo-500'
                        : 'border-gray-600 bg-gray-900/50 group-hover:border-gray-500'
                }`}
            >
                {checked && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <div className="flex-1">
                <h4 className={`text-sm font-medium ${checked ? 'text-white' : 'text-gray-300'}`}>{label}</h4>
                {description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
            </div>
        </div>
    )
}
