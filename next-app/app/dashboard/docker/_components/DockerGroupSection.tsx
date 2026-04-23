'use client'

import clsx from 'clsx'
import { ChevronRight, Server } from 'lucide-react'
import type { DockerContainer, DockerViewMode } from '../_types/docker'

interface DockerGroupSectionProps {
    title: string
    subtitle?: string
    badgeCount?: number
    /** Si true, rend le conteneur depliable via onToggleCollapse. */
    collapsible?: boolean
    collapsed?: boolean
    onToggleCollapse?: () => void
    /** Si true, applique le highlight de drop zone. */
    highlightDrop: boolean
    /** Indique le type de drop visuel (indigo pour groupe, gris pour ungrouped). */
    dropTone: 'group' | 'ungrouped'
    viewMode: DockerViewMode
    containers: DockerContainer[]
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    /** Fonction de rendu pour chaque conteneur (factorise les props). */
    renderContainer: (container: DockerContainer) => React.ReactNode
}

/**
 * Section d'un groupe Docker (ou "Autres Conteneurs" pour les ungrouped).
 * Gere le drop pour y deposer un conteneur et le repli via collapsed.
 */
export function DockerGroupSection({
    title,
    subtitle,
    badgeCount,
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
    highlightDrop,
    dropTone,
    viewMode,
    containers,
    onDragOver,
    onDrop,
    renderContainer,
}: DockerGroupSectionProps) {
    const highlightClasses = dropTone === 'group'
        ? 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] scale-[1.01]'
        : 'border-gray-500/30 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-500/50 hover:shadow-[0_0_20px_rgba(107,114,128,0.1)] scale-[1.01]'

    return (
        <div
            className={clsx(
                'space-y-4 p-4 -m-2 rounded-3xl transition-all duration-300 border',
                highlightDrop ? highlightClasses : 'border-transparent hover:border-white/5 hover:bg-white/[0.02]'
            )}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {collapsible ? (
                <button
                    onClick={onToggleCollapse}
                    className="w-full flex items-center justify-between group/header"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-black/40 border border-white/5 shadow-lg group-hover/header:border-indigo-500/30 group-hover/header:shadow-indigo-500/10 transition-all duration-300 backdrop-blur-md">
                            <ChevronRight className={clsx(
                                'w-5 h-5 text-gray-500 group-hover/header:text-indigo-400 transition-all duration-300',
                                !collapsed && 'rotate-90'
                            )} />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl font-black text-white group-hover/header:text-indigo-400 transition-colors flex items-center gap-3">
                                {title}
                                {badgeCount !== undefined && (
                                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-gray-400 border border-white/5 font-bold backdrop-blur-md">
                                        {badgeCount}
                                    </span>
                                )}
                            </h2>
                            {subtitle && (
                                <p className="text-sm text-gray-500 font-medium mt-0.5">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent mx-8 hidden md:block opacity-30 group-hover/header:opacity-100 transition-opacity duration-500"></div>
                </button>
            ) : (
                <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-black/40 border border-white/5 shadow-lg backdrop-blur-md">
                        <Server className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-xl font-black text-gray-400">{title}</h2>
                        {subtitle && (
                            <p className="text-sm text-gray-600 font-medium mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent mx-8 hidden md:block opacity-50"></div>
                </div>
            )}

            {(!collapsible || !collapsed) && (
                <div className={clsx(
                    collapsible && 'animate-in fade-in slide-in-from-top-2 duration-300',
                    'pt-2',
                    viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                        : 'space-y-3'
                )}>
                    {containers.map(renderContainer)}
                </div>
            )}
        </div>
    )
}
