'use client'

interface PermissionRowProps {
    label: string
    description?: string
    checked: boolean
    onChange: () => void
}

/**
 * Ligne permission style "detaille" (grand label + description + checkbox natif).
 * Utilise dans les tabs dashboard / requests / my_requests / media.
 */
export function PermissionRow({ label, description, checked, onChange }: PermissionRowProps) {
    return (
        <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
            />
            <div>
                <div className="text-white font-medium">{label}</div>
                {description && <div className="text-sm text-gray-400">{description}</div>}
            </div>
        </label>
    )
}
