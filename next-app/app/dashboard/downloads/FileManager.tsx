'use client'

import { useState, useEffect, useCallback } from 'react'
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

export default function FileManager() {
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
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-900/50 gap-4">
                <div className="flex items-center space-x-4 min-w-0">
                    {path && (
                        <button 
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors flex-shrink-0"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                    )}
                    <h3 className="text-lg font-medium text-white truncate">
                        {path || 'Racine'}
                    </h3>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-1.5 border border-gray-600 rounded-md leading-5 bg-gray-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                        />
                    </div>
                    <button 
                        onClick={fetchFiles}
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap px-2"
                    >
                        Actualiser
                    </button>
                </div>
            </div>

            <div className="w-full overflow-hidden">
                <table className="w-full divide-y divide-gray-700 table-fixed">
                    <thead className="bg-gray-900/30">
                        <tr>
                            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Nom</th>
                            <th className="hidden sm:table-cell w-24 text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Taille</th>
                            <th className="hidden md:table-cell w-32 text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Modifié</th>
                            <th className="w-36 text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                                        <span className="text-gray-400">Chargement des fichiers...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-red-400">
                                    {error}
                                </td>
                            </tr>
                        ) : filteredFiles.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                                    {searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Ce dossier est vide"}
                                </td>
                            </tr>
                        ) : (
                            filteredFiles.map((file) => (
                                <tr key={file.name} className="hover:bg-gray-700/50 transition-colors group">
                                    <td className="px-6 py-4 overflow-hidden">
                                        <div className="flex items-center min-w-0">
                                            {file.type === 'd' ? (
                                                <FolderIcon className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
                                            ) : (
                                                <DocumentIcon className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                                            )}
                                            <button 
                                                onClick={() => file.type === 'd' ? handleFolderClick(file.name) : null}
                                                className={`text-sm font-medium truncate text-left ${file.type === 'd' ? 'text-indigo-400 hover:text-indigo-300' : 'text-gray-200'}`}
                                                title={file.name}
                                            >
                                                {file.name}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {file.type === 'd' ? '--' : formatSize(file.size)}
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {new Date(file.mtime).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button 
                                                onClick={() => handleDownload(file)}
                                                title={file.type === 'd' ? "Télécharger (ZIP)" : "Télécharger"}
                                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded-md transition-all"
                                            >
                                                <ArrowDownTrayIcon className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => handleShare(file)}
                                                title="Partager"
                                                className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-gray-600 rounded-md transition-all"
                                            >
                                                <ShareIcon className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(file)}
                                                title="Supprimer"
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-600 rounded-md transition-all"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de suppression */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-700 overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2">Confirmer la suppression</h3>
                            <p className="text-gray-300 text-sm">
                                Êtes-vous sûr de vouloir supprimer <span className="text-white font-medium">"{deleteModal.file?.name}"</span> ?
                                {deleteModal.file?.type === 'd' && " Cela supprimera également tout le contenu du dossier."}
                            </p>
                            <p className="text-gray-400 text-xs mt-2 italic">
                                Note : Si le fichier est utilisé par un programme ou en lecture seule, la suppression échouera.
                            </p>
                            <p className="text-red-400 text-xs mt-4 font-medium italic">
                                Cette action est irréversible.
                            </p>
                        </div>
                        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-3">
                            <button 
                                onClick={() => setDeleteModal({ isOpen: false, file: null })}
                                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-lg"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de partage */}
            {shareModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-700 overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2">Partager le fichier</h3>
                            <p className="text-sm text-gray-400 mb-6 truncate">{shareModal.filePath}</p>
                            
                            {!shareModal.token ? (
                                <div className="space-y-4">
                                    <p className="text-gray-300 text-sm">Choisissez la durée de validité du lien :</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => confirmShare(1)}
                                            className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                                        >
                                            <ClockIcon className="w-4 h-4 mr-2" /> 24 Heures
                                        </button>
                                        <button 
                                            onClick={() => confirmShare(7)}
                                            className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                                        >
                                            <ClockIcon className="w-4 h-4 mr-2" /> 7 Jours
                                        </button>
                                        <button 
                                            onClick={() => confirmShare(30)}
                                            className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                                        >
                                            <ClockIcon className="w-4 h-4 mr-2" /> 30 Jours
                                        </button>
                                        <button 
                                            onClick={() => confirmShare()}
                                            className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm"
                                        >
                                            Illimité
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-gray-900 rounded-lg p-3 flex items-center justify-between border border-gray-700">
                                        <span className="text-indigo-400 text-xs truncate mr-2">
                                            {window.location.origin}/share/{shareModal.token}
                                        </span>
                                        <button 
                                            onClick={() => copyToClipboard(shareModal.token!)}
                                            className="p-2 hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-white"
                                        >
                                            {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 text-center italic">
                                        Toute personne disposant de ce lien pourra télécharger le fichier.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end">
                            <button 
                                onClick={() => setShareModal({ isOpen: false, filePath: '' })}
                                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                {shareModal.token ? 'Fermer' : 'Annuler'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
