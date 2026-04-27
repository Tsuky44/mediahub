'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

export type PasswordInputColor = 'blue' | 'emerald' | 'purple' | 'red'

const RING_CLASSES: Record<PasswordInputColor, string> = {
    blue: 'focus:ring-blue-500',
    emerald: 'focus:ring-emerald-500',
    purple: 'focus:ring-purple-500',
    red: 'focus:ring-red-500',
}

interface PasswordInputProps {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    label?: string
    color: PasswordInputColor
    required?: boolean
}

/** Champ password avec icone Lock et toggle show/hide, couleur configurable. */
export function PasswordInput({
    value,
    onChange,
    placeholder = 'Mot de passe...',
    label,
    color,
    required,
}: PasswordInputProps) {
    const [show, setShow] = useState(false)
    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-10 text-white focus:ring-2 ${RING_CLASSES[color]} outline-none`}
                    placeholder={placeholder}
                    required={required}
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}
