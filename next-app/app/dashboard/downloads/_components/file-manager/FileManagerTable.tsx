'use client'

import { FileInfo } from '@/lib/services/smb'
import { FileManagerRow } from './FileManagerRow'

interface FileManagerTableProps {
    files: FileInfo[]
    loading: boolean
    error: string | null
    searchQuery: string
    canDownload: boolean
    canShare: boolean
    canDelete: boolean
    onFolderClick: (folderName: string) => void
    onDownload: (file: FileInfo) => void
    onShare: (file: FileInfo) => void
    onDelete: (file: FileInfo) => void
}

/** Tableau des fichiers avec etats loading/error/empty et lignes FileManagerRow. */
export function FileManagerTable({
    files,
    loading,
    error,
    searchQuery,
    canDownload,
    canShare,
    canDelete,
    onFolderClick,
    onDownload,
    onShare,
    onDelete,
}: FileManagerTableProps) {
    return (
        <div className="w-full overflow-hidden relative z-10">
            <table className="w-full divide-y divide-white/5 table-fixed">
                <thead className="bg-gradient-to-r from-white/5 to-transparent">
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
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3 shadow-[0_0_10px_rgba(232,230,228,0.2)]" />
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
                    ) : files.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                                {searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Ce dossier est vide'}
                            </td>
                        </tr>
                    ) : (
                        files.map((file) => (
                            <FileManagerRow
                                key={file.name}
                                file={file}
                                canDownload={canDownload}
                                canShare={canShare}
                                canDelete={canDelete}
                                onFolderClick={onFolderClick}
                                onDownload={onDownload}
                                onShare={onShare}
                                onDelete={onDelete}
                            />
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
