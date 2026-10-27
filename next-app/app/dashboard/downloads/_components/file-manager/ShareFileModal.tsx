'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ShareIcon, ClockIcon, CheckIcon, ClipboardIcon, LockClosedIcon } from '@heroicons/react/24/outline'

interface ShareFileModalProps {
    isOpen: boolean
    filePath: string
    token?: string
    onClose: () => void
    onCreate: (days?: number, password?: string) => Promise<void> | void
}

const DURATION_OPTIONS: Array<{ label: string; days?: number }> = [
    { label: '24 Heures', days: 1 },
    { label: '7 Jours', days: 7 },
    { label: '30 Jours', days: 30 },
    { label: 'Illimité' },
]

const COPY_FEEDBACK_MS = 2000

/** Modal de partage public : choix duree + URL copiable une fois cree (rendu via portal). */
export function ShareFileModal({ isOpen, filePath, token, onClose, onCreate }: ShareFileModalProps) {
    const [mounted, setMounted] = useState(false)
    const [copied, setCopied] = useState(false)
    const [usePassword, setUsePassword] = useState(false)
    const [password, setPassword] = useState('')

    useEffect(() => {
        setMounted(true)
    }, [])

    const copyToClipboard = (t: string) => {
        const url = `${window.location.origin}/share/${t}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    }

    if (!mounted || !isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#080909]/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 max-w-md w-full border border-white/10 overflow-hidden ring-1 ring-white/10 scale-100 animate-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />

                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/10 mb-4">
                            <ShareIcon className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Partager le fichier</h3>
                        <p className="text-sm text-gray-400 truncate max-w-xs mx-auto bg-white/5 py-1 px-3 rounded-lg border border-white/5">
                            {filePath}
                        </p>
                    </div>

                    {!token ? (
                        <div className="space-y-4">
                            <p className="text-gray-300 text-sm font-bold text-center">
                                Choisissez la durée de validité du lien :
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {DURATION_OPTIONS.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onCreate(opt.days, usePassword ? password : undefined)}
                                        className={`flex items-center justify-center px-4 py-3.5 ${
                                            opt.days === undefined
                                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 hover:border-white/10'
                                        } rounded-xl transition-all font-bold text-sm hover:-translate-y-0.5`}
                                    >
                                        <ClockIcon className="w-4 h-4 mr-2 opacity-70" /> {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-white/5">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={usePassword}
                                        onChange={(e) => setUsePassword(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-300 flex items-center gap-1.5">
                                        <LockClosedIcon className="w-4 h-4 text-amber-400" />
                                        Protéger par mot de passe
                                    </span>
                                </label>
                                {usePassword && (
                                    <input
                                        type="text"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mot de passe du lien"
                                        className="mt-3 w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-black/40 rounded-2xl p-4 flex items-center justify-between border border-indigo-500/20 shadow-inner">
                                <span className="text-indigo-400 text-xs truncate mr-3 font-mono">
                                    {window.location.origin}/share/{token}
                                </span>
                                <button
                                    onClick={() => copyToClipboard(token)}
                                    className="p-2.5 hover:bg-indigo-500/10 rounded-xl transition-colors text-indigo-400 hover:text-indigo-300 border border-transparent hover:border-indigo-500/20"
                                    title="Copier le lien"
                                >
                                    {copied ? (
                                        <CheckIcon className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <ClipboardIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                                <CheckIcon className="w-3.5 h-3.5" />
                                Lien de partage créé avec succès
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-black/40 border-t border-white/5 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all w-full sm:w-auto"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
