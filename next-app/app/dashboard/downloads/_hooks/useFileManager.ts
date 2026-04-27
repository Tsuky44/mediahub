'use client'

import { useMemo, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

const filesQueryKey = (path: string) => ['file-manager', 'files', path] as const

/**
 * TanStack Query-powered file manager.
 * Path changes trigger automatic re-fetch via queryKey.
 * Search filter is applied client-side with useMemo.
 */
export function useFileManager(): UseFileManagerResult {
    const queryClient = useQueryClient()
    const [path, setPath] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    const {
        data: files = [],
        isLoading: loading,
        error: queryError,
    } = useQuery({
        queryKey: filesQueryKey(path),
        queryFn: async () => getRemoteFiles(path),
    })

    const filteredFiles = useMemo(
        () => (Array.isArray(files)
            ? files.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
            : []),
        [files, searchQuery]
    )

    const errorMessage = queryError instanceof Error ? queryError.message : null

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

    const fetchFiles = async () => {
        await queryClient.invalidateQueries({ queryKey: filesQueryKey(path) })
    }

    return {
        path,
        files,
        filteredFiles,
        loading,
        error: errorMessage,
        searchQuery,
        setSearchQuery,
        fetchFiles,
        navigateInto,
        navigateBack,
    }
}
