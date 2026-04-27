'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { PasswordInput, type PasswordInputColor } from './PasswordInput'

interface BackupExportCardProps {
    title: string
    description: string
    submitLabel: string
    color: PasswordInputColor
    iconColor: string
    onExport: (password: string) => Promise<boolean>
}

/**
 * Carte generique d'export chiffre avec champ password et bouton submit.
 * Utilise PasswordInput avec variantes de couleur (blue/emerald/purple/red).
 */
export function BackupExportCard({
    title,
    description,
    submitLabel,
    color,
    iconColor,
    onExport,
}: BackupExportCardProps) {
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) return
        setIsLoading(true)
        const ok = await onExport(password)
        if (ok) setPassword('')
        setIsLoading(false)
    }

    const buttonClass = {
        blue: 'bg-blue-600 hover:bg-blue-700',
        emerald: 'bg-emerald-600 hover:bg-emerald-700',
        purple: 'bg-purple-600 hover:bg-purple-700',
        red: 'bg-red-600 hover:bg-red-700',
    }[color]

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Download className={iconColor} />
                {title}
            </h3>
            <p className="text-gray-400 mb-6 text-sm">{description}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordInput
                    label="Mot de passe de chiffrement"
                    value={password}
                    onChange={setPassword}
                    placeholder="Définissez un mot de passe..."
                    color={color}
                    required
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center items-center gap-2 ${buttonClass} text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
                    {submitLabel}
                </button>
            </form>
        </div>
    )
}
