'use client'

import { useState } from 'react'
import { ArrowUpCircle, FolderInput, Loader2, Play, RotateCw, Square, X } from 'lucide-react'
import type { DockerAction, DockerContainer, DockerGroup } from '../../_types/docker'

interface DockerBulkActionBarProps {
    selected: DockerContainer[]
    groups: DockerGroup[]
    canManageGroups: boolean
    onClear: () => void
    onAction: (containerId: string, action: DockerAction, containerName?: string) => Promise<void>
    onMoveToGroup: (containerName: string, groupId: string) => Promise<void>
}

/**
 * Barre flottante d'actions de masse.
 *
 * Les actions sont appliquées en série, pas en parallèle : démarrer quinze
 * conteneurs d'un coup sature l'hôte, et Unraid lui-même les échelonne. Le
 * compteur de progression évite de laisser l'utilisateur devant un spinner
 * muet pendant une minute.
 */
export function DockerBulkActionBar({
    selected,
    groups,
    canManageGroups,
    onClear,
    onAction,
    onMoveToGroup,
}: DockerBulkActionBarProps) {
    const [running, setRunning] = useState<{ action: DockerAction; done: number } | null>(null)
    const [moving, setMoving] = useState(false)

    if (selected.length === 0) return null

    const updatable = selected.filter(
        c => c.updateStatus === 'UPDATE_AVAILABLE' || c.updateStatus === 'REBUILD_READY'
    )

    const applyToAll = async (action: DockerAction, targets: DockerContainer[]) => {
        if (running) return

        setRunning({ action, done: 0 })
        try {
            for (const [index, container] of targets.entries()) {
                await onAction(container.id, action, container.name)
                setRunning({ action, done: index + 1 })
            }
        } finally {
            setRunning(null)
            onClear()
        }
    }

    /**
     * Rangement par sélection plutôt que par glisser-déposer.
     *
     * Le drag & drop est inutilisable au doigt : sur mobile, cocher puis
     * choisir un groupe est le seul chemin praticable.
     */
    const moveSelection = async (groupId: string) => {
        if (!groupId || moving) return

        setMoving(true)
        try {
            for (const container of selected) {
                await onMoveToGroup(container.name, groupId)
            }
        } finally {
            setMoving(false)
            onClear()
        }
    }

    const buttonClass =
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'

    // La barre s'enroule sur petit écran : avec six contrôles elle
    // dépasserait largement la largeur d'un téléphone.
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 py-3 rounded-2xl bg-gray-950/95 backdrop-blur-md border border-white/10 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-4 max-w-[calc(100vw-2rem)]">
            <span className="text-sm font-bold text-white pl-1 pr-2 whitespace-nowrap">
                {running
                    ? `${running.done}/${selected.length} traité${running.done > 1 ? 's' : ''}`
                    : `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}`}
            </span>

            <div className="h-6 w-px bg-white/10" />

            <button
                onClick={() => applyToAll('start', selected)}
                disabled={!!running}
                className={`${buttonClass} bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/25`}
            >
                {running?.action === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                Démarrer
            </button>

            <button
                onClick={() => applyToAll('restart', selected)}
                disabled={!!running}
                className={`${buttonClass} bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/25`}
            >
                {running?.action === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                Redémarrer
            </button>

            <button
                onClick={() => applyToAll('stop', selected)}
                disabled={!!running}
                className={`${buttonClass} bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/25`}
            >
                {running?.action === 'stop' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
                Arrêter
            </button>

            {updatable.length > 0 && (
                <button
                    onClick={() => applyToAll('update', updatable)}
                    disabled={!!running}
                    className={`${buttonClass} bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/25`}
                    title={`${updatable.length} conteneur(s) sélectionné(s) ont une image obsolète`}
                >
                    {running?.action === 'update' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                    Mettre à jour ({updatable.length})
                </button>
            )}

            {canManageGroups && groups.length > 0 && (
                <>
                    <div className="h-6 w-px bg-white/10" />
                    <label className="flex items-center gap-2 text-sm">
                        <FolderInput className="w-4 h-4 text-gray-400" />
                        <span className="sr-only">Déplacer la sélection vers un groupe</span>
                        <select
                            value=""
                            disabled={!!running || moving}
                            onChange={e => void moveSelection(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-40"
                        >
                            <option value="">Déplacer vers…</option>
                            {groups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                            <option value="ungrouped">Retirer du groupe</option>
                        </select>
                    </label>
                </>
            )}

            <div className="h-6 w-px bg-white/10" />

            <button
                onClick={onClear}
                disabled={!!running || moving}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
                title="Annuler la sélection"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
