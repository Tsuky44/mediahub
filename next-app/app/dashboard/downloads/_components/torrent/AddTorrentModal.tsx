'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, FileDown, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

interface AddTorrentModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (e: React.FormEvent) => void | Promise<void>
    addMode: 'url' | 'file'
    onAddModeChange: (mode: 'url' | 'file') => void
    newTorrentUrl: string
    onNewTorrentUrlChange: (url: string) => void
    torrentFiles: FileList | null
    onTorrentFilesChange: (files: FileList | null) => void
}

export function AddTorrentModal({
    isOpen,
    onClose,
    onSubmit,
    addMode,
    onAddModeChange,
    newTorrentUrl,
    onNewTorrentUrlChange,
    torrentFiles,
    onTorrentFilesChange,
}: AddTorrentModalProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    if (!mounted || !isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#080909]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in-95 ring-1 ring-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <Plus className="w-5 h-5 text-indigo-400" />
                        </div>
                        Ajouter un Torrent
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs for URL/File */}
                <div className="flex p-1 bg-black/20 rounded-xl border border-white/5 mb-6">
                    <button
                        onClick={() => onAddModeChange('url')}
                        className={clsx(
                            'flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all',
                            addMode === 'url'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                    >
                        Lien Magnet / URL
                    </button>
                    <button
                        onClick={() => onAddModeChange('file')}
                        className={clsx(
                            'flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all',
                            addMode === 'file'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                    >
                        Fichier .torrent
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                    {addMode === 'url' ? (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Lien Magnet ou URL</label>
                            <textarea
                                value={newTorrentUrl}
                                onChange={(e) => onNewTorrentUrlChange(e.target.value)}
                                placeholder="magnet:?xt=urn:btih:..."
                                className="w-full h-32 bg-black/20 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all focus:bg-black/40 outline-none text-sm font-mono leading-relaxed"
                                required
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Fichier .torrent</label>
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-white/10 border-dashed rounded-2xl cursor-pointer bg-black/20 hover:bg-white/5 hover:border-indigo-500/30 transition-all group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:scale-110 transition-transform duration-300">
                                            <FileDown className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <p className="mb-2 text-sm text-gray-400">
                                            <span className="font-bold text-white">Cliquez pour upload</span> ou glissez-déposez
                                        </p>
                                        <p className="text-xs text-gray-500 font-medium">.torrent uniquement</p>
                                        {torrentFiles && torrentFiles.length > 0 && (
                                            <div className="mt-4 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                                <p className="text-xs text-indigo-400 font-bold truncate max-w-[200px] flex items-center gap-2">
                                                    <CheckCircle className="w-3 h-3" />
                                                    {torrentFiles[0].name}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        id="dropzone-file"
                                        type="file"
                                        className="hidden"
                                        accept=".torrent"
                                        onChange={(e) => onTorrentFilesChange(e.target.files)}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
