'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ManageMediaInfo, ManageMediaType } from '../_types/manage-media'

const ROUTER_REFRESH_DELAY_MS = 500
const QUERY_KEY = (tmdbId: number, mediaType: ManageMediaType) =>
    ['media-manage', tmdbId, mediaType] as const

export interface UseManageMediaResult {
    loading: boolean
    error: string | null
    mediaInfo: ManageMediaInfo | null
    isDeleting: string | null
    selectedRequests: number[]
    toggleRequestSelection: (id: number) => void
    setSelectedRequests: (ids: number[]) => void
    fetchMediaInfo: (refresh?: boolean) => Promise<void>
    deleteRequest: (requestIds: number | number[] | undefined) => Promise<void>
    deleteMedia: (mediaId: number | undefined, deleteFiles?: boolean) => Promise<void>
    markAsAvailable: (mediaId: number | undefined) => Promise<void>
}

/**
 * TanStack Query-powered media management hook.
 *
 * - Data fetched on demand via useQuery (enabled by isOpen).
 * - Mutations (delete request, delete media, mark as available) invalidate
 *   the query cache on success and refresh the router.
 */
export function useManageMedia(
    isOpen: boolean,
    tmdbId: number,
    mediaType: ManageMediaType,
    onClose: () => void,
): UseManageMediaResult {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [selectedRequests, setSelectedRequests] = useState<number[]>([])

    const {
        data: mediaInfo,
        isLoading: loading,
        error: queryError,
    } = useQuery({
        queryKey: QUERY_KEY(tmdbId, mediaType),
        queryFn: async () => {
            const url = `/api/media/${tmdbId}/manage?type=${mediaType}`
            const res = await fetch(url)
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to fetch media info')
            }
            return res.json() as Promise<ManageMediaInfo>
        },
        enabled: isOpen,
    })

    const errorMessage = queryError instanceof Error ? queryError.message : null

    const refreshData = async () => {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEY(tmdbId, mediaType) })
        setTimeout(() => router.refresh(), ROUTER_REFRESH_DELAY_MS)
    }

    const toggleRequestSelection = useCallback((requestId: number) => {
        setSelectedRequests(prev =>
            prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId],
        )
    }, [])

    const deleteRequest = async (requestIds: number | number[] | undefined) => {
        if (!requestIds) return
        const idsArray = Array.isArray(requestIds) ? requestIds : [requestIds]
        if (idsArray.length === 0) return

        const message = idsArray.length > 1
            ? `Voulez-vous vraiment supprimer ces ${idsArray.length} demandes ?`
            : 'Voulez-vous vraiment supprimer cette demande ?'
        if (!confirm(message)) return

        const idsString = idsArray.join(',')
        setIsDeleting(idsString)
        try {
            const res = await fetch(
                `/api/media/${tmdbId}/manage?action=request&targetId=${idsString}&type=${mediaType}`,
                { method: 'DELETE' },
            )
            if (res.ok) {
                if (idsArray.length > 1) setSelectedRequests([])
                await refreshData()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsDeleting(null)
        }
    }

    const deleteMedia = async (mediaId: number | undefined, deleteFiles = false) => {
        if (!mediaId) return
        const serviceName = mediaType === 'tv' ? 'Sonarr' : 'Radarr'
        const message = deleteFiles
            ? `Voulez-vous vraiment supprimer ce média de ${serviceName} ? Cela supprimera également tous les fichiers.`
            : `Voulez-vous vraiment effacer les données locales de ce média ? (Les fichiers dans ${serviceName} ne seront pas supprimés)`
        if (!confirm(message)) return

        setIsDeleting(mediaId.toString())
        try {
            const res = await fetch(
                `/api/media/${tmdbId}/manage?action=media&targetId=${mediaId}&type=${mediaType}&deleteFiles=${deleteFiles}`,
                { method: 'DELETE' },
            )
            if (res.ok) {
                if (deleteFiles) {
                    await fetch(`/api/media/availability/${tmdbId}?type=${mediaType}&refresh=true`)
                    onClose()
                }
                await refreshData()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsDeleting(null)
        }
    }

    const markAsAvailable = async (mediaId: number | undefined) => {
        const idToUse = mediaId || tmdbId
        if (!confirm('Voulez-vous vraiment marquer ce média comme disponible localement ?')) return

        setIsDeleting(idToUse.toString())
        try {
            const res = await fetch(`/api/media/${tmdbId}/manage?action=status&type=${mediaType}`, {
                method: 'POST',
            })
            if (res.ok) {
                await refreshData()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsDeleting(null)
        }
    }

    return {
        loading,
        error: errorMessage,
        mediaInfo: mediaInfo ?? null,
        isDeleting,
        selectedRequests,
        toggleRequestSelection,
        setSelectedRequests,
        fetchMediaInfo: refreshData,
        deleteRequest,
        deleteMedia,
        markAsAvailable,
    }
}
