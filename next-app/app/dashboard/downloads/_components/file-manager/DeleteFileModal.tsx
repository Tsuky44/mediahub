'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TrashIcon } from '@heroicons/react/24/outline'
import { FileInfo } from '@/lib/services/smb'

interface DeleteFileModalProps {
    file: FileInfo | null
    isOpen: boolean
    onClose: () => void
    onConfirm: () => Promise<void> | void
}

/** Modal de confirmation de suppression d'un fichier ou dossier (rendu via portal). */
export function DeleteFileModal({ file, isOpen, onClose, onConfirm }: DeleteFileModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A]/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-red-500/10 max-w-md w-full border border-white/10 overflow-hidden ring-1 ring-white/10 scale-100 animate-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50" />

                <div className="p-8 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10 mb-2">
                        <TrashIcon className="w-8 h-8 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white">Confirmer la suppression</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Êtes-vous sûr de vouloir supprimer{' '}
                            <span className="text-white font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 inline-block mx-1">
                                &quot;{file?.name}&quot;
                            </span>
                            ?
                            {file?.type === 'd' && (
                                <span className="block mt-2 text-red-400/80 font-medium">
                                    Cela supprimera également tout le contenu du dossier.
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10 text-left flex items-start gap-3">
                        <div className="p-1 bg-red-500/10 rounded-full mt-0.5">
                            <span className="text-xs font-bold text-red-400">!</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Attention</p>
                            <p className="text-gray-400 text-xs italic">
                                Cette action est irréversible. Si le fichier est utilisé par un programme ou en lecture seule, la suppression échouera.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 hover:border-white/10 w-full sm:w-auto"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => onConfirm()}
                        className="px-6 py-3 text-sm font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                        <TrashIcon className="w-4 h-4" />
                        Supprimer
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
