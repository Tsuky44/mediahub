'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FileInfo } from '@/lib/services/smb'
import { getRemoteFiles, createPublicShare } from './file-actions'
import { deleteSmbPath } from './actions'
import { 
    FolderIcon, 
    DocumentIcon, 
    ArrowLeftIcon, 
    ArrowDownTrayIcon, 
    ShareIcon,
    ClipboardIcon,
    CheckIcon,
    ClockIcon,
    TrashIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

export default function FileManager({ canDownload, canShare, canDelete }: { canDownload: boolean, canShare: boolean, canDelete: boolean }) {
    const [path, setPath] = useState('')
    const [files, setFiles] = useState<FileInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, file: FileInfo | null }>({
        isOpen: false,
        file: null
    })
    const [shareModal, setShareModal] = useState<{ isOpen: boolean, filePath: string, token?: string }>({
        isOpen: false, 
        filePath: '' 
    })
    const [copied, setCopied] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const fetchFiles = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getRemoteFiles(path)
            setFiles(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue')
        } finally {
            setLoading(false)
        }
    }, [path])

    useEffect(() => {
        fetchFiles()
    }, [fetchFiles])

    const handleDeleteClick = (file: FileInfo) => {
        setDeleteModal({ isOpen: true, file })
    }

    const confirmDelete = async () => {
        if (!deleteModal.file) return
        
        setLoading(true)
        try {
            const res = await deleteSmbPath(deleteModal.file.fullPath)
            if (res.success) {
                await fetchFiles()
                setDeleteModal({ isOpen: false, file: null })
            } else {
                setError(res.error || 'Erreur lors de la suppression')
            }
        } catch (err) {
            setError('Une erreur est survenue lors de la suppression')
        } finally {
            setLoading(false)
        }
    }

    const handleFolderClick = (folderName: string) => {
        setPath(prev => prev ? `${prev}/${folderName}` : folderName)
        setSearchQuery('')
    }

    const handleBack = () => {
        const parts = path.split('/')
        parts.pop()
        setPath(parts.join('/'))
        setSearchQuery('')
    }

    const handleDownload = (file: FileInfo) => {
        const url = `/api/smb/download?path=${encodeURIComponent(file.fullPath)}`
        window.location.href = url
    }

    const handleShare = async (file: FileInfo) => {
        setShareModal({ isOpen: true, filePath: file.fullPath })
    }

    const confirmShare = async (days?: number) => {
        const res = await createPublicShare(shareModal.filePath, days)
        if (res.success) {
            setShareModal(prev => ({ ...prev, token: res.token }))
        }
    }

    const copyToClipboard = (token: string) => {
        const url = `${window.location.origin}/share/${token}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const filteredFiles = Array.isArray(files) ? files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) : []

    return (
        <div className="bg-black/20 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl overflow-hidden relative group transition-all duration-300 hover:shadow-indigo-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            
            <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 gap-4 relative z-10">
                <div className="flex items-center space-x-4 min-w-0">
                    {path && (
                        <button 
                            onClick={handleBack}
                            className="p-2.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all duration-300 flex-shrink-0 group/back"
                        >
                            <ArrowLeftIcon className="w-5 h-5 group-hover/back:-translate-x-1 transition-transform" />
                        </button>
                    )}
                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 truncate">
                            {path || 'Racine'}
                        </h3>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                            {files.length} éléments
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0 group/search">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-500 group-focus-within/search:text-indigo-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-black/20 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-black/40 sm:text-sm transition-all duration-300"
                        />
                    </div>
                    <button 
                        onClick={fetchFiles}
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-bold whitespace-nowrap px-3 py-2 hover:bg-indigo-500/10 rounded-xl transition-all duration-300"
                    >
                        Actualiser
                    </button>
                </div>
            </div>

            <div className="w-full overflow-hidden relative z-10">
                <table className="w-full divide-y divide-white/5 table-fixed">
                    <thead className="bg-gradient-to-r from-white/5 to-transparent backdrop-blur-md">
                        <tr>
                            <th className="text-left text-[10px] font-bold text-indigo-300 uppercase tracking-wider px-4 py-3">Nom</th>
                            <th className="hidden sm:table-cell w-24 text-left text-[10px] font-bold text-indigo-300 uppercase tracking-wider px-3 py-3">Taille</th>
                            <th className="hidden md:table-cell w-32 text-left text-[10px] font-bold text-indigo-300 uppercase tracking-wider px-3 py-3">Modifié</th>
                            <th className="w-32 text-right text-[10px] font-bold text-indigo-300 uppercase tracking-wider px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                        <span className="text-gray-400 text-sm animate-pulse">Chargement des fichiers...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-red-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-2 bg-red-500/10 rounded-full">
                                            <span className="text-xl">⚠️</span>
                                        </div>
                                        {error}
                                    </div>
                                </td>
                            </tr>
                        ) : filteredFiles.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                                    {searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Ce dossier est vide"}
                                </td>
                            </tr>
                        ) : (
                            filteredFiles.map((file) => (
                                <tr key={file.name} className="hover:bg-indigo-500/5 transition-all duration-300 group border-b border-transparent hover:border-indigo-500/10">
                                    <td className="px-4 py-3.5 overflow-hidden">
                                        <div className="flex items-center min-w-0">
                                            {file.type === 'd' ? (
                                                <FolderIcon className="w-5 h-5 text-yellow-500/80 mr-3 flex-shrink-0 drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
                                            ) : (
                                                <DocumentIcon className="w-5 h-5 text-indigo-400/80 mr-3 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
                                            )}
                                            <button 
                                                onClick={() => file.type === 'd' ? handleFolderClick(file.name) : null}
                                                className={`text-sm font-medium truncate text-left transition-colors ${file.type === 'd' ? 'text-indigo-300 hover:text-indigo-200 hover:underline decoration-indigo-500/30' : 'text-gray-300 group-hover:text-gray-100'}`}
                                                title={file.name}
                                            >
                                                {file.name}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-3 py-3.5 whitespace-nowrap text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                                        {file.type === 'd' ? '--' : formatSize(file.size)}
                                    </td>
                                    <td className="hidden md:table-cell px-3 py-3.5 whitespace-nowrap text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                                        {new Date(file.mtime).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-1 opacity-60 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                            {canDownload && (
                                                <button 
                                                    onClick={() => handleDownload(file)}
                                                    title={file.type === 'd' ? "Télécharger (ZIP)" : "Télécharger"}
                                                    className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all duration-300"
                                                >
                                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            {canShare && (
                                                <button 
                                                    onClick={() => handleShare(file)}
                                                    title="Partager"
                                                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all duration-300"
                                                >
                                                    <ShareIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button 
                                                    onClick={() => handleDeleteClick(file)}
                                                    title="Supprimer"
                                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de suppression */}
            {mounted && deleteModal.isOpen && createPortal(
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
                                    Êtes-vous sûr de vouloir supprimer <span className="text-white font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 inline-block mx-1">"{deleteModal.file?.name}"</span> ?
                                    {deleteModal.file?.type === 'd' && <span className="block mt-2 text-red-400/80 font-medium">Cela supprimera également tout le contenu du dossier.</span>}
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
                                onClick={() => setDeleteModal({ isOpen: false, file: null })}
                                className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 hover:border-white/10 w-full sm:w-auto"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-6 py-3 text-sm font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center gap-2"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de partage */}
            {mounted && shareModal.isOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#0A0A0A]/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 max-w-md w-full border border-white/10 overflow-hidden ring-1 ring-white/10 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />
                        
                        <div className="p-8 space-y-6">
                            <div className="text-center">
                                <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/10 mb-4">
                                    <ShareIcon className="w-8 h-8 text-indigo-400" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Partager le fichier</h3>
                                <p className="text-sm text-gray-400 truncate max-w-xs mx-auto bg-white/5 py-1 px-3 rounded-lg border border-white/5">
                                    {shareModal.filePath}
                                </p>
                            </div>
                            
                            {!shareModal.token ? (
                                <div className="space-y-4">
                                    <p className="text-gray-300 text-sm font-bold text-center">Choisissez la durée de validité du lien :</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: '24 Heures', days: 1 },
                                            { label: '7 Jours', days: 7 },
                                            { label: '30 Jours', days: 30 },
                                            { label: 'Illimité', days: undefined }
                                        ].map((opt, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => confirmShare(opt.days)}
                                                className={`flex items-center justify-center px-4 py-3.5 ${opt.days === undefined ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 hover:border-white/10'} rounded-xl transition-all font-bold text-sm hover:-translate-y-0.5`}
                                            >
                                                <ClockIcon className="w-4 h-4 mr-2 opacity-70" /> {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-black/40 rounded-2xl p-4 flex items-center justify-between border border-indigo-500/20 shadow-inner">
                                        <span className="text-indigo-400 text-xs truncate mr-3 font-mono">
                                            {window.location.origin}/share/{shareModal.token}
                                        </span>
                                        <button 
                                            onClick={() => copyToClipboard(shareModal.token!)}
                                            className="p-2.5 hover:bg-indigo-500/10 rounded-xl transition-colors text-indigo-400 hover:text-indigo-300 border border-transparent hover:border-indigo-500/20"
                                            title="Copier le lien"
                                        >
                                            {copied ? <CheckIcon className="w-5 h-5 text-emerald-400" /> : <ClipboardIcon className="w-5 h-5" />}
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
                                onClick={() => setShareModal({ isOpen: false, filePath: '' })}
                                className="px-8 py-3 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all w-full sm:w-auto"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
