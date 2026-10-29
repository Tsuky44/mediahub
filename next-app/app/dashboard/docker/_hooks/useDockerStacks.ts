'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { api, ApiError } from '@/lib/api-client'
import type { DockerStack, StackAction } from '../_types/docker'

const QUERY_KEY = ['docker', 'stacks'] as const

const ACTION_LABELS: Record<StackAction, string> = {
    start: 'Démarrage',
    stop: 'Arrêt',
    restart: 'Redémarrage',
}

export interface UseDockerStacksResult {
    stacks: DockerStack[]
    isLoading: boolean
    /** Projet en cours de traitement, le cas échéant. */
    pendingProject: string | null
    applyAction: (project: string, action: StackAction) => Promise<void>
}

/** Stacks Docker Compose détectées d'après les labels des conteneurs. */
export function useDockerStacks(): UseDockerStacksResult {
    const queryClient = useQueryClient()

    const { data: stacks = [], isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const data = await api.get<{ stacks: DockerStack[] }>('/api/docker/stacks')
            return data.stacks ?? []
        },
        refetchInterval: 30000,
    })

    const mutation = useMutation({
        mutationFn: async ({ project, action }: { project: string; action: StackAction }) => {
            return api.post<{ done: number; total: number }>('/api/docker/stacks', { project, action })
        },
        onSuccess: async (result, { project, action }) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
                queryClient.invalidateQueries({ queryKey: ['docker', 'containers'] }),
            ])
            toast.success(`${ACTION_LABELS[action]} de « ${project} » : ${result.done}/${result.total}`)
        },
        onError: (error: unknown, { project, action }) => {
            const detail = error instanceof ApiError || error instanceof Error ? error.message : 'erreur inconnue'
            toast.error(`${ACTION_LABELS[action]} de « ${project} » : ${detail}`)
        },
    })

    return {
        stacks,
        isLoading,
        pendingProject: mutation.isPending ? mutation.variables?.project ?? null : null,
        applyAction: async (project, action) => {
            try {
                await mutation.mutateAsync({ project, action })
            } catch {
                // Signalé par le toast de `onError`.
            }
        },
    }
}
