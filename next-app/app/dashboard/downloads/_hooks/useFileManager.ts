'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileInfo } from '@/lib/services/smb'
import { getRemoteFiles } from '../file-actions'

export interface UseFileManagerResult {
    path: string
    files: FileInfo[]
    filteredFiles: FileInfo[]
    loading: boolean
    error: string | null
    searchQuery: string
    setSearchQuery: (q: string) => void
    fetchFiles: () => Promise<void>
    navigateInto: (folderName: string) => void
    navigateBack: () => void
}

/**
 * Gere la navigation et la recherche dans l'arborescence SMB cote client.
 * Refait un fetch a chaque changement de path et applique le filtre nom localement.
 */
export function useFileManager(): UseFileManagerResult {
    const [path, setPath] = useState('')
    const [files, setFiles] = useState<FileInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

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

    const navigateInto = useCallback((folderName: string) => {
        setPath(prev => (prev ? `${prev}/${folderName}` : folderName))
        setSearchQuery('')
    }, [])

    const navigateBack = useCallback(() => {
        const parts = path.split('/')
        parts.pop()
        setPath(parts.join('/'))
        setSearchQuery('')
    }, [path])

    const filteredFiles = Array.isArray(files)
        ? files.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : []

    return {
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
    }
}
