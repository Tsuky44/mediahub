'use client'

import { useRef, useState } from 'react'
import { Upload, AlertCircle, Loader2 } from 'lucide-react'
import { PasswordInput, type PasswordInputColor } from './PasswordInput'

interface BackupImportCardProps {
    title: string
    submitLabel: string
    color: PasswordInputColor
    iconColor: string
    warning: {
        message: string
        bg: string
        border: string
        text: string
        iconColor: string
    }
    onImport: (file: File, password: string) => Promise<boolean>
}

/**
 * Carte generique d'import chiffre avec selection fichier + password + warning.
 * Reset le formulaire en cas de succes.
 */
export function BackupImportCard({
    title,
    submitLabel,
    color,
    iconColor,
    warning,
    onImport,
}: BackupImportCardProps) {
    const [file, setFile] = useState<File | null>(null)
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || !password) return
        setIsLoading(true)
        const ok = await onImport(file, password)
        if (ok) {
            setFile(null)
            setPassword('')
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
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
                <Upload className={iconColor} />
                {title}
            </h3>

            <div className={`${warning.bg} border ${warning.border} rounded-lg p-4 mb-6 flex items-start gap-3`}>
                <AlertCircle className={`${warning.iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />
                <p className={`text-xs ${warning.text}`}>{warning.message}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fichier (.enc)</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".enc"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) setFile(e.target.files[0])
                        }}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                        required
                    />
                </div>

                <PasswordInput
                    label="Mot de passe"
                    value={password}
                    onChange={setPassword}
                    placeholder="Mot de passe du fichier..."
                    color={color}
                    required
                />

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center items-center gap-2 ${buttonClass} text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    {submitLabel}
                </button>
            </form>
        </div>
    )
}
