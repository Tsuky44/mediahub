'use client'

import clsx from 'clsx'
import { FileCode2, Layers3, Loader2, Play, RotateCw, Square } from 'lucide-react'
import type { DockerStack, StackAction } from '../../_types/docker'

interface DockerStacksPanelProps {
    stacks: DockerStack[]
    pendingProject: string | null
    canManageContainers: boolean
    canReadDetails: boolean
    onAction: (project: string, action: StackAction) => Promise<void>
    onEdit: (stack: DockerStack) => void
}

/**
 * Stacks Docker Compose détectées d'après les labels des conteneurs.
 *
 * Rien ne s'affiche s'il n'y en a pas : une section vide sur une installation
 * sans Compose ne ferait qu'occuper de la place.
 */
export function DockerStacksPanel({
    stacks,
    pendingProject,
    canManageContainers,
    canReadDetails,
    onAction,
    onEdit,
}: DockerStacksPanelProps) {
    if (stacks.length === 0) return null

    const actionButton =
        'p-2 rounded-lg border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
                <Layers3 className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                    Stacks Compose
                </h2>
                <span className="px-2 py-0.5 rounded-lg bg-white/5 text-xs font-medium text-gray-500 border border-white/5">
                    {stacks.length}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {stacks.map(stack => {
                    const isPending = pendingProject === stack.project
                    const allRunning = stack.running === stack.total
                    const noneRunning = stack.running === 0

                    return (
                        <div
                            key={stack.project}
                            className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] hover:border-teal-500/25 transition-all"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={clsx(
                                            'w-2 h-2 rounded-full flex-shrink-0',
                                            allRunning
                                                ? 'bg-emerald-400'
                                                : noneRunning
                                                  ? 'bg-gray-600'
                                                  : 'bg-amber-400',
                                        )}
                                    />
                                    <h3 className="font-bold text-white truncate" title={stack.project}>
                                        {stack.project}
                                    </h3>
                                </div>
                                <p className="text-xs text-gray-500 font-medium mt-1 tabular-nums">
                                    {stack.running}/{stack.total} conteneur{stack.total > 1 ? 's' : ''} en marche
                                </p>
                                {stack.workingDir && (
                                    <p
                                        className="text-[10px] text-gray-600 font-mono truncate mt-0.5"
                                        title={stack.workingDir}
                                    >
                                        {stack.workingDir}
                                    </p>
                                )}
                            </div>

                            {canManageContainers && (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-3" />
                                    ) : (
                                        <>
                                            {canReadDetails && stack.workingDir && (
                                                <button
                                                    onClick={() => onEdit(stack)}
                                                    className={`${actionButton} bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border-teal-500/20`}
                                                    title="Éditer les fichiers et redéployer"
                                                >
                                                    <FileCode2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onAction(stack.project, 'start')}
                                                disabled={allRunning}
                                                className={`${actionButton} bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20`}
                                                title="Démarrer la stack"
                                            >
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                            </button>
                                            <button
                                                onClick={() => onAction(stack.project, 'restart')}
                                                className={`${actionButton} bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20`}
                                                title="Redémarrer la stack"
                                            >
                                                <RotateCw className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onAction(stack.project, 'stop')}
                                                disabled={noneRunning}
                                                className={`${actionButton} bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20`}
                                                title="Arrêter la stack"
                                            >
                                                <Square className="w-3.5 h-3.5 fill-current" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
