'use client'

import { useState } from 'react'
import { FileInfo } from '@/lib/services/smb'
import { useFileManager } from '../_hooks/useFileManager'
import { createPublicShare } from '../file-actions'
import { deleteSmbPath } from '../actions'
import { FileManagerHeader } from './file-manager/FileManagerHeader'
import { FileManagerTable } from './file-manager/FileManagerTable'
import { DeleteFileModal } from './file-manager/DeleteFileModal'
import { ShareFileModal } from './file-manager/ShareFileModal'
import { ShareManagerModal } from './file-manager/ShareManagerModal'

interface FileManagerProps {
    canDownload: boolean
    canShare: boolean
    canDelete: boolean
}

interface DeleteModalState {
    isOpen: boolean
    file: FileInfo | null
}

interface ShareModalState {
    isOpen: boolean
    filePath: string
    token?: string
}

/**
 * Gestionnaire de fichiers SMB : navigation arborescente, recherche locale,
 * actions par ligne (telechargement, partage, suppression) avec modals dedies.
 */
export default function FileManager({ canDownload, canShare, canDelete }: FileManagerProps) {
    const {
        path,
        files,
        filteredFiles,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        fetchFiles,
        navigateInto,
        navigateBack,
    } = useFileManager()

    const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ isOpen: false, file: null })
    const [shareModal, setShareModal] = useState<ShareModalState>({ isOpen: false, filePath: '' })
    const [shareManagerOpen, setShareManagerOpen] = useState(false)

    const handleDownload = (file: FileInfo) => {
        window.location.href = `/api/smb/download?path=${encodeURIComponent(file.fullPath)}`
    }

    const handleConfirmDelete = async () => {
        if (!deleteModal.file) return
        const res = await deleteSmbPath(deleteModal.file.fullPath)
        if (res.success) {
            await fetchFiles()
            setDeleteModal({ isOpen: false, file: null })
        }
    }

    const handleConfirmShare = async (days?: number, password?: string) => {
        const res = await createPublicShare(shareModal.filePath, days, password)
        if (res.success) {
            setShareModal((prev) => ({ ...prev, token: res.token }))
        }
    }

    return (
        <div className="bg-black/20 rounded-3xl border border-white/5 shadow-2xl overflow-hidden relative group transition-all duration-300 hover:shadow-indigo-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

            <FileManagerHeader
                path={path}
                fileCount={files.length}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onBack={navigateBack}
                onRefresh={fetchFiles}
                onManageShares={canShare ? () => setShareManagerOpen(true) : undefined}
            />

            <FileManagerTable
                files={filteredFiles}
                loading={loading}
                error={error}
                searchQuery={searchQuery}
                canDownload={canDownload}
                canShare={canShare}
                canDelete={canDelete}
                onFolderClick={navigateInto}
                onDownload={handleDownload}
                onShare={(file) => setShareModal({ isOpen: true, filePath: file.fullPath })}
                onDelete={(file) => setDeleteModal({ isOpen: true, file })}
            />

            <DeleteFileModal
                file={deleteModal.file}
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, file: null })}
                onConfirm={handleConfirmDelete}
            />

            <ShareFileModal
                isOpen={shareModal.isOpen}
                filePath={shareModal.filePath}
                token={shareModal.token}
                onClose={() => setShareModal({ isOpen: false, filePath: '' })}
                onCreate={handleConfirmShare}
            />

            <ShareManagerModal
                isOpen={shareManagerOpen}
                onClose={() => setShareManagerOpen(false)}
            />
        </div>
    )
}
