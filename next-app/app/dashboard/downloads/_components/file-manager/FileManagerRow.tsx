'use client'

import {
    FolderIcon,
    DocumentIcon,
    ArrowDownTrayIcon,
    ShareIcon,
    TrashIcon,
} from '@heroicons/react/24/outline'
import { FileInfo } from '@/lib/services/smb'

interface FileManagerRowProps {
    file: FileInfo
    canDownload: boolean
    canShare: boolean
    canDelete: boolean
    onFolderClick: (folderName: string) => void
    onDownload: (file: FileInfo) => void
    onShare: (file: FileInfo) => void
    onDelete: (file: FileInfo) => void
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/** Ligne d'un fichier ou dossier dans le tableau du gestionnaire SMB. */
export function FileManagerRow({
    file,
    canDownload,
    canShare,
    canDelete,
    onFolderClick,
    onDownload,
    onShare,
    onDelete,
}: FileManagerRowProps) {
    const isFolder = file.type === 'd'

    return (
        <tr className="hover:bg-indigo-500/5 transition-all duration-300 group border-b border-transparent hover:border-indigo-500/10">
            <td className="px-4 py-3.5 overflow-hidden">
                <div className="flex items-center min-w-0">
                    {isFolder ? (
                        <FolderIcon className="w-5 h-5 text-yellow-500/80 mr-3 flex-shrink-0 drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                        <DocumentIcon className="w-5 h-5 text-indigo-400/80 mr-3 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
                    )}
                    <button
                        onClick={() => (isFolder ? onFolderClick(file.name) : null)}
                        className={`text-sm font-medium truncate text-left transition-colors ${
                            isFolder
                                ? 'text-indigo-300 hover:text-indigo-200 hover:underline decoration-indigo-500/30'
                                : 'text-gray-300 group-hover:text-gray-100'
                        }`}
                        title={file.name}
                    >
                        {file.name}
                    </button>
                </div>
            </td>
            <td className="hidden sm:table-cell px-3 py-3.5 whitespace-nowrap text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                {isFolder ? '--' : formatFileSize(file.size)}
            </td>
            <td className="hidden md:table-cell px-3 py-3.5 whitespace-nowrap text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                {new Date(file.mtime).toLocaleDateString()}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1 opacity-60 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    {canDownload && (
                        <button
                            onClick={() => onDownload(file)}
                            title={isFolder ? 'Télécharger (ZIP)' : 'Télécharger'}
                            className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all duration-300"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                    )}
                    {canShare && (
                        <button
                            onClick={() => onShare(file)}
                            title="Partager"
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all duration-300"
                        >
                            <ShareIcon className="w-4 h-4" />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={() => onDelete(file)}
                            title="Supprimer"
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    )
}
