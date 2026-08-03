'use client'

import { ArrowLeftIcon, MagnifyingGlassIcon, ShareIcon } from '@heroicons/react/24/outline'

interface FileManagerHeaderProps {
    path: string
    fileCount: number
    searchQuery: string
    onSearchChange: (q: string) => void
    onBack: () => void
    onRefresh: () => void
    onManageShares?: () => void
}

/** En-tete du gestionnaire de fichiers : bouton retour, titre/path, recherche, actualiser. */
export function FileManagerHeader({
    path,
    fileCount,
    searchQuery,
    onSearchChange,
    onBack,
    onRefresh,
    onManageShares,
}: FileManagerHeaderProps) {
    return (
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 gap-4 relative z-10">
            <div className="flex items-center space-x-4 min-w-0">
                {path && (
                    <button
                        onClick={onBack}
                        className="p-2.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all duration-300 flex-shrink-0 group/back"
                    >
                        <ArrowLeftIcon className="w-5 h-5 group-hover/back:-translate-x-1 transition-transform" />
                    </button>
                )}
                <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 truncate">
                        {path || 'Racine'}
                    </h3>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                        {fileCount} éléments
                    </span>
                </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0 group/search">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-500 group-focus-within/search:text-indigo-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-black/20 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-black/40 sm:text-sm transition-all duration-300"
                    />
                </div>
                <button
                    onClick={onRefresh}
                    className="text-sm text-indigo-400 hover:text-indigo-300 font-bold whitespace-nowrap px-3 py-2 hover:bg-indigo-500/10 rounded-xl transition-all duration-300"
                >
                    Actualiser
                </button>
                {onManageShares && (
                    <button
                        onClick={onManageShares}
                        className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-bold whitespace-nowrap px-3 py-2 hover:bg-amber-500/10 rounded-xl transition-all duration-300"
                    >
                        <ShareIcon className="w-4 h-4" />
                        Partages
                    </button>
                )}
            </div>
        </div>
    )
}
