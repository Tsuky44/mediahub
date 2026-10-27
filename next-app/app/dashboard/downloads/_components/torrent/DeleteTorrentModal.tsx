'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, ChevronRight } from 'lucide-react'

interface DeleteTorrentModalProps {
    isOpen: boolean
    torrent: { hash: string; name: string } | null
    onConfirm: (deleteFiles: boolean) => void | Promise<void>
    onCancel: () => void
}

export function DeleteTorrentModal({ isOpen, torrent, onConfirm, onCancel }: DeleteTorrentModalProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    if (!mounted || !isOpen || !torrent) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0e1010]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-md p-8 shadow-2xl ring-1 ring-white/5 space-y-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10 mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>

                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Supprimer le torrent
                    </h3>

                    <p className="text-gray-400 font-medium leading-relaxed">
                        Voulez-vous vraiment supprimer <br />
                        <span className="text-white font-bold text-base bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 inline-block mt-1">"{torrent.name}"</span> ?
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => onConfirm(false)}
                        className="w-full px-4 py-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white rounded-2xl font-bold transition-all flex items-center justify-between group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-xl bg-gray-500/20 text-gray-400 group-hover:text-white group-hover:scale-110 transition-all">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold">Torrent uniquement</div>
                                <div className="text-xs text-gray-500 font-medium">Conserver les fichiers</div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                    </button>

                    <button
                        onClick={() => onConfirm(true)}
                        className="w-full px-4 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-300 rounded-2xl font-bold transition-all flex items-center justify-between group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-xl bg-red-500/20 text-red-500 group-hover:scale-110 transition-all shadow-lg shadow-red-500/10">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold">Tout supprimer</div>
                                <div className="text-xs text-red-500/60 font-medium">Torrent + Fichiers</div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-red-500/50 group-hover:text-red-500 transition-colors" />
                    </button>
                </div>

                <button
                    onClick={onCancel}
                    className="w-full py-3 text-sm font-bold text-gray-500 hover:text-white transition-colors"
                >
                    Annuler
                </button>
            </div>
        </div>,
        document.body
    )
}
