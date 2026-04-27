'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getTorrents,
    addTorrent,
    deleteTorrents as deleteTorrentsAction,
    pauseTorrents as pauseTorrentsAction,
    resumeTorrents as resumeTorrentsAction,
    getTags,
    setPriority as setPriorityAction,
    reannounceTorrents as reannounceTorrentsAction,
    setShareLimits as setShareLimitsAction,
} from '../actions'
import { Torrent } from '@/lib/services/qbittorrent'

export type TorrentPriority = 'top' | 'up' | 'down' | 'bottom'

export interface UseTorrentsResult {
    torrents: Torrent[]
    loading: boolean
    tags: string[]
    refetch: () => Promise<void>
    addTorrent: (formData: FormData) => Promise<{ success: boolean; error?: string }>
    deleteTorrents: (hashes: string[], deleteFiles: boolean) => Promise<{ success: boolean; error?: string }>
    pauseTorrents: (hashes: string[]) => Promise<void>
    resumeTorrents: (hashes: string[]) => Promise<void>
    reannounceTorrents: (hashes: string[]) => Promise<void>
    setPriority: (hashes: string[], priority: TorrentPriority) => Promise<void>
    setShareLimits: (hashes: string[], ratio: number, minutes: number, inactive: number) => Promise<void>
}

const torrentsQueryKey = (filter: string) => ['torrents', 'list', filter] as const
const tagsQueryKey = ['torrents', 'tags'] as const

/**
 * TanStack Query-powered torrents hook.
 *
 * - Torrents polled via refetchInterval.
 * - Tags fetched once and cached.
 * - Every mutation invalidates the torrent list cache on success.
 */
export function useTorrents(filter: string, refreshInterval: number = 2000): UseTorrentsResult {
    const queryClient = useQueryClient()

    const { data: torrents = [], isLoading: loading } = useQuery({
        queryKey: torrentsQueryKey(filter),
        queryFn: async () => getTorrents(filter),
        refetchInterval: refreshInterval,
        staleTime: refreshInterval / 2,
    })

    const { data: tags = [] } = useQuery({
        queryKey: tagsQueryKey,
        queryFn: async () => getTags(),
        staleTime: 60_000,
    })

    const invalidateTorrents = async () => {
        await queryClient.invalidateQueries({ queryKey: torrentsQueryKey(filter) })
    }

    const addTorrentMutation = useMutation({
        mutationFn: addTorrent,
        onSuccess: invalidateTorrents,
    })

    const deleteTorrentsMutation = useMutation({
        mutationFn: async ({ hashes, deleteFiles }: { hashes: string[]; deleteFiles: boolean }) =>
            deleteTorrentsAction(hashes, deleteFiles),
        onSuccess: invalidateTorrents,
    })

    const pauseTorrentsMutation = useMutation({
        mutationFn: pauseTorrentsAction,
        onSuccess: invalidateTorrents,
    })

    const resumeTorrentsMutation = useMutation({
        mutationFn: resumeTorrentsAction,
        onSuccess: invalidateTorrents,
    })

    const reannounceTorrentsMutation = useMutation({
        mutationFn: reannounceTorrentsAction,
        onSuccess: invalidateTorrents,
    })

    const setPriorityMutation = useMutation({
        mutationFn: async ({ hashes, priority }: { hashes: string[]; priority: TorrentPriority }) =>
            setPriorityAction(hashes, priority),
        onSuccess: invalidateTorrents,
    })

    const setShareLimitsMutation = useMutation({
        mutationFn: async (params: {
            hashes: string[]
            ratio: number
            minutes: number
            inactive: number
        }) => setShareLimitsAction(params.hashes, params.ratio, params.minutes, params.inactive),
        onSuccess: invalidateTorrents,
    })

    const refetch = async () => {
        await queryClient.invalidateQueries({ queryKey: torrentsQueryKey(filter) })
    }

    return {
        torrents,
        loading,
        tags,
        refetch,
        addTorrent: async (formData: FormData) => {
            const res = await addTorrentMutation.mutateAsync(formData)
            return res
        },
        deleteTorrents: async (hashes: string[], deleteFiles: boolean) => {
            const res = await deleteTorrentsMutation.mutateAsync({ hashes, deleteFiles })
            return res
        },
        pauseTorrents: async (hashes: string[]) => {
            await pauseTorrentsMutation.mutateAsync(hashes)
        },
        resumeTorrents: async (hashes: string[]) => {
            await resumeTorrentsMutation.mutateAsync(hashes)
        },
        reannounceTorrents: async (hashes: string[]) => {
            await reannounceTorrentsMutation.mutateAsync(hashes)
        },
        setPriority: async (hashes: string[], priority: TorrentPriority) => {
            await setPriorityMutation.mutateAsync({ hashes, priority })
        },
        setShareLimits: async (hashes: string[], ratio: number, minutes: number, inactive: number) => {
            await setShareLimitsMutation.mutateAsync({ hashes, ratio, minutes, inactive })
        },
    }
}
