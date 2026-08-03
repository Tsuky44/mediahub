'use client'

import { useState } from 'react'
import { DocumentIcon, ArrowDownTrayIcon, ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface ShareClientProps {
    token: string
    fileName: string
    isExpired: boolean
    hasPassword: boolean
}

export function ShareClient({ token, fileName, isExpired, hasPassword }: ShareClientProps) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [unlocked, setUnlocked] = useState(!hasPassword)

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) {
            setError('Veuillez saisir le mot de passe')
            return
        }
        const downloadUrl = `/api/share/download?token=${token}&password=${encodeURIComponent(password)}`
        fetch(downloadUrl, { method: 'HEAD' }).then((res) => {
            if (res.ok) {
                setUnlocked(true)
                setError('')
            } else {
                setError('Mot de passe incorrect')
            }
        }).catch(() => {
            setError('Erreur lors de la vérification')
        })
    }

    if (isExpired) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
                <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                            <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Lien expiré</h1>
                        <p className="text-gray-400 text-sm mb-8">Ce lien de partage a expiré.</p>
                    </div>
                </div>
                <Link href="/" className="mt-8 text-gray-500 hover:text-gray-400 text-sm font-medium transition-colors">
                    Retour à l'accueil
                </Link>
            </div>
        )
    }

    if (hasPassword && !unlocked) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
                <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                            <LockClosedIcon className="w-10 h-10 text-indigo-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2 truncate w-full">{fileName}</h1>
                        <p className="text-gray-400 text-sm mb-8">Ce fichier est protégé par un mot de passe</p>

                        <form onSubmit={handleUnlock} className="w-full space-y-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mot de passe"
                                autoFocus
                                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            />
                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                                <LockClosedIcon className="w-5 h-5 mr-3" />
                                Déverrouiller
                            </button>
                        </form>
                    </div>
                </div>
                <Link href="/" className="mt-8 text-gray-500 hover:text-gray-400 text-sm font-medium transition-colors">
                    Retour à l'accueil
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
            <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                        <DocumentIcon className="w-10 h-10 text-indigo-500" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2 truncate w-full">
                        {fileName}
                    </h1>
                    <p className="text-gray-400 text-sm mb-8">
                        Un fichier a été partagé avec vous
                    </p>

                    <a
                        href={`/api/share/download?token=${token}${hasPassword ? `&password=${encodeURIComponent(password)}` : ''}`}
                        className="w-full flex items-center justify-center px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                        <ArrowDownTrayIcon className="w-6 h-6 mr-3" />
                        Télécharger le fichier
                    </a>

                    <div className="mt-8 pt-8 border-t border-gray-800 w-full">
                        <p className="text-xs text-gray-500">
                            Partagé via MediaHub
                        </p>
                    </div>
                </div>
            </div>

            <Link
                href="/"
                className="mt-8 text-gray-500 hover:text-gray-400 text-sm font-medium transition-colors"
            >
                Retour à l'accueil
            </Link>
        </div>
    )
}
