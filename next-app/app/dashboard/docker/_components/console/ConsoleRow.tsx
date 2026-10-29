'use client'

import clsx from 'clsx'
import {
    ArrowUpCircle,
    Box,
    ExternalLink,
    FileText,
    Loader2,
    Pause,
    Play,
    RotateCw,
    Square,
    Terminal,
    Trash2,
} from 'lucide-react'
import type { ContainerCardProps } from '../container/container-card-types'
import type { DockerAction } from '../../_types/docker'

/**
 * Une ligne de la vue console.
 *
 * Le parti pris tient en une phrase : chaque donnée occupe une **colonne
 * fixe**, et chaque action occupe une **position fixe**. Sur cinquante-cinq
 * conteneurs, l'œil descend une colonne au lieu de rechercher l'information
 * dans une carte ; et la souris vise toujours le même endroit au lieu de
 * suivre des boutons qui se réorganisent selon l'état.
 *
 * C'est le contraire du thème classique, où chaque carte est une unité
 * autonome et généreuse. Aucune des deux approches n'est meilleure : l'une se
 * parcourt, l'autre se scrute.
 */
export function ConsoleRow(props: ContainerCardProps) {
    const {
        container,
        permissions,
        isActionLoading,
        isSelected,
        isDragged,
        density,
        onToggleSelect,
        onSelectStats,
        onShowLogs,
        onShowTerminal,
        onShowDetails,
        onDragStart,
        onDragEnd,
        onAction,
    } = props

    const { canManageContainers, canAccessConsole, canReadDetails, canReadLogs, canReadStats, canManageGroups } =
        permissions

    const state = container.state?.toUpperCase()
    const isRunning = state === 'RUNNING'
    const isPaused = state === 'PAUSED'
    const needsUpdate =
        container.updateStatus === 'UPDATE_AVAILABLE' || container.updateStatus === 'REBUILD_READY'

    const fire = (e: React.MouseEvent, action: DockerAction) => {
        e.stopPropagation()
        onAction(container.id, action)
    }

    const iconBtn =
        'p-1.5 rounded text-[--color-gray-500] hover:text-[--color-gray-100] hover:bg-white/[0.06] transition-colors disabled:opacity-30'

    return (
        <div
            draggable={canManageGroups}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => canReadStats && onSelectStats()}
            role={canReadStats ? 'button' : undefined}
            tabIndex={canReadStats ? 0 : undefined}
            onKeyDown={e => {
                if (!canReadStats) return
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectStats()
                }
            }}
            className={clsx(
                'group grid items-center gap-3 border-b border-white/[0.04] transition-colors relative',
                'hover:bg-white/[0.025] focus-visible:outline-none focus-visible:bg-white/[0.04]',
                density === 'compact' ? 'py-1 px-3' : 'py-2 px-3',
                isSelected && 'bg-[--color-indigo-500]/[0.09]',
                isDragged && 'opacity-40',
                canManageGroups ? 'cursor-grab active:cursor-grabbing' : canReadStats ? 'cursor-pointer' : '',
            )}
            style={{
                gridTemplateColumns: 'auto 1fr minmax(0,1.1fr) auto auto auto',
            }}
        >
            {/* Filet d'état : la première chose que l'œil accroche en descendant. */}
            <span
                aria-hidden
                className={clsx(
                    'absolute left-0 top-0 bottom-0 w-[2px]',
                    isRunning ? 'bg-emerald-500/70' : isPaused ? 'bg-sky-500/70' : 'bg-transparent',
                )}
            />

            <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`Sélectionner ${container.name}`}
                onClick={e => {
                    e.stopPropagation()
                    onToggleSelect()
                }}
                className={clsx(
                    'w-3 h-3 border rounded-[3px] transition-colors ml-1',
                    isSelected
                        ? 'bg-[--color-indigo-500] border-[--color-indigo-500]'
                        : 'border-white/15 opacity-0 group-hover:opacity-100 focus:opacity-100',
                )}
            />

            <div className="flex items-center gap-2 min-w-0">
                <span
                    className="font-mono text-[13px] text-[--color-gray-100] truncate"
                    title={container.name}
                >
                    {container.name}
                </span>
                {needsUpdate && (
                    <ArrowUpCircle
                        className="w-3 h-3 text-amber-400/80 flex-shrink-0"
                        aria-label="Mise à jour disponible"
                    />
                )}
                {container.isOrphaned && (
                    <span className="text-[9px] uppercase tracking-wide text-[--color-gray-600] flex-shrink-0">
                        orph.
                    </span>
                )}
            </div>

            <span
                className="font-mono text-[11px] text-[--color-gray-500] truncate hidden md:block"
                title={container.image}
            >
                {container.image.split(':')[0]}
            </span>

            <span className="font-mono text-[11px] text-[--color-gray-600] tabular-nums truncate hidden lg:block max-w-[180px]">
                {container.ports || '—'}
            </span>

            <span
                className={clsx(
                    'font-mono text-[10px] uppercase tracking-wider tabular-nums w-16 text-right',
                    isRunning ? 'text-emerald-400/90' : isPaused ? 'text-sky-400/90' : 'text-[--color-gray-600]',
                )}
            >
                {isRunning ? 'up' : isPaused ? 'paused' : 'down'}
            </span>

            {/* Colonne d'actions de largeur constante : les icônes ne bougent
                pas d'une ligne à l'autre, même quand l'état diffère. */}
            <div className="flex items-center gap-0.5 justify-end w-[150px] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                {container.webUiUrl && isRunning && (
                    <a
                        href={container.webUiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className={iconBtn}
                        title="Ouvrir l'interface web"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}
                {canReadLogs && (
                    <button
                        onClick={e => { e.stopPropagation(); onShowLogs() }}
                        className={iconBtn}
                        title="Logs"
                    >
                        <FileText className="w-3.5 h-3.5" />
                    </button>
                )}
                {canAccessConsole && isRunning && (
                    <button
                        onClick={e => { e.stopPropagation(); onShowTerminal() }}
                        className={iconBtn}
                        title="Console"
                    >
                        <Terminal className="w-3.5 h-3.5" />
                    </button>
                )}
                {canReadDetails && (
                    <button
                        onClick={e => { e.stopPropagation(); onShowDetails() }}
                        className={iconBtn}
                        title="Configuration"
                    >
                        <Box className="w-3.5 h-3.5" />
                    </button>
                )}

                {canManageContainers && (
                    <>
                        <span aria-hidden className="w-px h-3.5 bg-white/[0.07] mx-1" />

                        {isActionLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[--color-gray-500] mx-1.5" />
                        ) : isRunning || isPaused ? (
                            <>
                                <button
                                    onClick={e => fire(e, isPaused ? 'unpause' : 'pause')}
                                    className={iconBtn}
                                    title={isPaused ? 'Reprendre' : 'Mettre en pause'}
                                >
                                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={e => fire(e, 'restart')} className={iconBtn} title="Redémarrer">
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={e => fire(e, 'stop')}
                                    className={`${iconBtn} hover:text-red-400`}
                                    title="Arrêter"
                                >
                                    <Square className="w-3.5 h-3.5" />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={e => fire(e, 'start')}
                                className={`${iconBtn} hover:text-emerald-400`}
                                title="Démarrer"
                            >
                                <Play className="w-3.5 h-3.5" />
                            </button>
                        )}

                        <button
                            onClick={e => {
                                e.stopPropagation()
                                if (confirm(`Supprimer définitivement « ${container.name} » ?`)) {
                                    onAction(container.id, 'remove')
                                }
                            }}
                            className={`${iconBtn} hover:text-red-400`}
                            title="Supprimer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
