'use client'

import { useState } from 'react'
import type { TorrentPriority } from './useTorrents'

interface UseTorrentManagerActionsOptions {
    addTorrent: (formData: FormData) => Promise<{ success: boolean; error?: string }>
    deleteTorrents: (hashes: string[], deleteFiles: boolean) => Promise<{ success: boolean; error?: string }>
    pauseTorrents: (hashes: string[]) => Promise<void>
    resumeTorrents: (hashes: string[]) => Promise<void>
    reannounceTorrents: (hashes: string[]) => Promise<void>
    setPriority: (hashes: string[], priority: TorrentPriority) => Promise<void>
    setShareLimits: (hashes: string[], ratio: number, minutes: number, inactive: number) => Promise<void>
    clearSelection: () => void
}

export interface UseTorrentManagerActionsResult {
    // Add modal
    isAddModalOpen: boolean
    setIsAddModalOpen: (v: boolean) => void
    addMode: 'url' | 'file'
    setAddMode: (v: 'url' | 'file') => void
    newTorrentUrl: string
    setNewTorrentUrl: (v: string) => void
    torrentFiles: FileList | null
    setTorrentFiles: (v: FileList | null) => void
    handleAddTorrent: (e: React.FormEvent) => Promise<void>

    // Delete modal
    isDeleteModalOpen: boolean
    setIsDeleteModalOpen: (v: boolean) => void
    torrentToDelete: { hash: string; name: string } | null
    setTorrentToDelete: (v: { hash: string; name: string } | null) => void
    handleDeleteClick: (torrent: { hash: string; name: string }) => void
    confirmDelete: (deleteFiles: boolean) => Promise<void>

    // Filter modal
    isFilterModalOpen: boolean
    setIsFilterModalOpen: (v: boolean) => void

    // Search modal
    isSearchOpen: boolean
    setIsSearchOpen: (v: boolean) => void

    // Share limit modal
    isShareLimitModalOpen: boolean
    setIsShareLimitModalOpen: (v: boolean) => void
    shareLimitTime: number
    setShareLimitTime: (v: number) => void
    shareLimitUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
    setShareLimitUnit: (v: 'minutes' | 'hours' | 'days' | 'weeks' | 'months') => void
    shareLimitType: 'global' | 'unlimited' | 'custom'
    setShareLimitType: (v: 'global' | 'unlimited' | 'custom') => void
    handleShareLimit: (selectedTorrents: string[]) => Promise<void>

    // Batch actions
    handlePause: (hash: string) => Promise<void>
    handleResume: (hash: string) => Promise<void>
    handleBatchAction: (
        action: 'resume' | 'pause' | 'delete' | 'top' | 'up' | 'down' | 'bottom' | 'reannounce',
        selectedTorrents: string[]
    ) => Promise<void>
}

export function useTorrentManagerActions(
    options: UseTorrentManagerActionsOptions
): UseTorrentManagerActionsResult {
    const {
        addTorrent,
        deleteTorrents,
        pauseTorrents,
        resumeTorrents,
        reannounceTorrents,
        setPriority,
        setShareLimits,
        clearSelection,
    } = options

    // Add modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [addMode, setAddMode] = useState<'url' | 'file'>('url')
    const [newTorrentUrl, setNewTorrentUrl] = useState('')
    const [torrentFiles, setTorrentFiles] = useState<FileList | null>(null)

    const handleAddTorrent = async (e: React.FormEvent) => {
        e.preventDefault()

        const formData = new FormData()

        if (addMode === 'url' && newTorrentUrl) {
            formData.append('urls', newTorrentUrl)
        } else if (addMode === 'file' && torrentFiles && torrentFiles.length > 0) {
            for (let i = 0; i < torrentFiles.length; i++) {
                formData.append('torrents', torrentFiles[i])
            }
        } else {
            return
        }

        const res = await addTorrent(formData)
        if (res.success) {
            setNewTorrentUrl('')
            setTorrentFiles(null)
            setIsAddModalOpen(false)
        } else {
            alert(res.error || 'Failed to add torrent')
        }
    }

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [torrentToDelete, setTorrentToDelete] = useState<{ hash: string; name: string } | null>(null)

    const handleDeleteClick = (torrent: { hash: string; name: string }) => {
        setTorrentToDelete(torrent)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async (deleteFiles: boolean) => {
        if (!torrentToDelete) return

        const res = await deleteTorrents([torrentToDelete.hash], deleteFiles)
        if (res.success) {
            setIsDeleteModalOpen(false)
            setTorrentToDelete(null)
        }
    }

    // Filter modal state
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

    // Search modal state
    const [isSearchOpen, setIsSearchOpen] = useState(false)

    // Share limit modal state
    const [isShareLimitModalOpen, setIsShareLimitModalOpen] = useState(false)
    const [shareLimitTime, setShareLimitTime] = useState<number>(60)
    const [shareLimitUnit, setShareLimitUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('days')
    const [shareLimitType, setShareLimitType] = useState<'global' | 'unlimited' | 'custom'>('custom')

    const handleShareLimit = async (selectedTorrents: string[]) => {
        let minutes = -2
        let ratio = -2
        let inactive = -2

        if (shareLimitType === 'unlimited') {
            minutes = -1
            ratio = -1
            inactive = -1
        } else if (shareLimitType === 'custom') {
            minutes = shareLimitTime
            if (shareLimitUnit === 'hours') minutes *= 60
            if (shareLimitUnit === 'days') minutes *= 60 * 24
            if (shareLimitUnit === 'weeks') minutes *= 60 * 24 * 7
            if (shareLimitUnit === 'months') minutes *= 60 * 24 * 30
            ratio = -2
            inactive = -2
        }

        await setShareLimits(selectedTorrents, ratio, minutes, inactive)
        setIsShareLimitModalOpen(false)
        clearSelection()
    }

    // Single actions
    const handlePause = async (hash: string) => {
        await pauseTorrents([hash])
    }

    const handleResume = async (hash: string) => {
        await resumeTorrents([hash])
    }

    // Batch actions
    const handleBatchAction = async (
        action: 'resume' | 'pause' | 'delete' | 'top' | 'up' | 'down' | 'bottom' | 'reannounce',
        selectedTorrents: string[]
    ) => {
        if (selectedTorrents.length === 0) return

        if (action === 'delete') {
            if (confirm(`Voulez-vous vraiment supprimer ${selectedTorrents.length} torrents ?`)) {
                await deleteTorrents(selectedTorrents, true)
                clearSelection()
            }
            return
        }

        if (action === 'resume') await resumeTorrents(selectedTorrents)
        else if (action === 'pause') await pauseTorrents(selectedTorrents)
        else if (action === 'reannounce') await reannounceTorrents(selectedTorrents)
        else await setPriority(selectedTorrents, action)

        clearSelection()
    }

    return {
        isAddModalOpen,
        setIsAddModalOpen,
        addMode,
        setAddMode,
        newTorrentUrl,
        setNewTorrentUrl,
        torrentFiles,
        setTorrentFiles,
        handleAddTorrent,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        torrentToDelete,
        setTorrentToDelete,
        handleDeleteClick,
        confirmDelete,
        isFilterModalOpen,
        setIsFilterModalOpen,
        isSearchOpen,
        setIsSearchOpen,
        isShareLimitModalOpen,
        setIsShareLimitModalOpen,
        shareLimitTime,
        setShareLimitTime,
        shareLimitUnit,
        setShareLimitUnit,
        shareLimitType,
        setShareLimitType,
        handleShareLimit,
        handlePause,
        handleResume,
        handleBatchAction,
    }
}
