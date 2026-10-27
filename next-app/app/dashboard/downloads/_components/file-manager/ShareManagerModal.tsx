'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ShareIcon, TrashIcon, LockClosedIcon, ClipboardIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { listPublicShares, deletePublicShare, type ShareListItem } from '../../file-actions'

interface ShareManagerModalProps {
    isOpen: boolean
    onClose: () => void
}

const COPY_FEEDBACK_MS = 2000

export function ShareManagerModal({ isOpen, onClose }: ShareManagerModalProps) {
    const [mounted, setMounted] = useState(false)
    const [shares, setShares] = useState<ShareListItem[]>([])
    const [loading, setLoading] = useState(false)
    const [copiedToken, setCopiedToken] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const fetchShares = useCallback(async () => {
        setLoading(true)
        const result = await listPublicShares()
        setShares(result)
        setLoading(false)
    }, [])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            fetchShares()
            setDeleteConfirmId(null)
        }
    }, [isOpen, fetchShares])

    const copyToClipboard = (token: string) => {
        const url = `${window.location.origin}/share/${token}`
        navigator.clipboard.writeText(url)
        setCopiedToken(token)
        setTimeout(() => setCopiedToken(null), COPY_FEEDBACK_MS)
    }

    const handleDelete = async (id: string) => {
        await deletePublicShare(id)
        setDeleteConfirmId(null)
        await fetchShares()
    }

    if (!mounted || !isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#080909]/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 max-w-2xl w-full border border-white/10 overflow-hidden ring-1 ring-white/10 scale-100 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />

                <div className="p-6 border-b border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                        <ShareIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-white">Liens de partage</h3>
                        <p className="text-sm text-gray-400">{shares.length} lien(s) actif(s)</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    ) : shares.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <ShareIcon className="w-12 h-12 text-gray-600 mb-3" />
                            <p className="text-gray-500 text-sm">Aucun lien de partage créé</p>
                        </div>
                    ) : (
                        shares.map((share) => {
                            const isExpired = share.expiresAt && share.expiresAt < new Date()
                            const fileName = share.filePath.split('/').pop() || share.filePath

                            return (
                                <div
                                    key={share.id}
                                    className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.04] transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {share.hasPassword ? (
                                                    <LockClosedIcon className="w-4 h-4 text-amber-400" />
                                                ) : (
                                                    <ShareIcon className="w-4 h-4 text-indigo-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-white truncate">
                                                    {fileName}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate font-mono">
                                                    {share.filePath}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                    {share.hasPassword && (
                                                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                            Protégé
                                                        </span>
                                                    )}
                                                    {isExpired ? (
                                                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                                                            <ExclamationTriangleIcon className="w-3 h-3" />
                                                            Expiré
                                                        </span>
                                                    ) : share.expiresAt ? (
                                                        <span className="text-[10px] text-gray-400">
                                                            Expire le {new Date(share.expiresAt).toLocaleDateString('fr-FR')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-emerald-400">
                                                            Illimité
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-500">
                                                        Créé le {new Date(share.createdAt).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {deleteConfirmId === share.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleDelete(share.id)}
                                                        className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        Confirmer
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(null)}
                                                        className="text-xs font-bold text-gray-400 hover:text-white px-2 py-1.5 rounded-lg transition-all"
                                                    >
                                                        Annuler
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => copyToClipboard(share.token)}
                                                        className="p-2 hover:bg-indigo-500/10 rounded-xl text-indigo-400 hover:text-indigo-300 transition-all"
                                                        title="Copier le lien"
                                                    >
                                                        {copiedToken === share.token ? (
                                                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                                                        ) : (
                                                            <ClipboardIcon className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(share.id)}
                                                        className="p-2 hover:bg-red-500/10 rounded-xl text-red-400 hover:text-red-300 transition-all"
                                                        title="Supprimer"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="p-4 bg-black/40 border-t border-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
