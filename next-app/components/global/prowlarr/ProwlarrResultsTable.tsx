'use client'

import { Search, ChevronDown, Database, Loader2, CheckCircle2, Download } from 'lucide-react'
import type { ProwlarrRelease, ProwlarrSortBy, ProwlarrSortOrder } from './prowlarr-types'
import { formatSize, getAge } from './prowlarr-utils'

interface SortableHeaderProps {
    column: ProwlarrSortBy
    label: string
    currentSort: ProwlarrSortBy
    currentOrder: ProwlarrSortOrder
    onSort: (col: ProwlarrSortBy) => void
    className?: string
    centered?: boolean
}

function SortableHeader({ column, label, currentSort, currentOrder, onSort, className, centered }: SortableHeaderProps) {
    const isActive = currentSort === column
    return (
        <th
            className={`px-4 py-3 cursor-pointer hover:text-white transition-colors ${className || ''}`}
            onClick={() => onSort(column)}
        >
            <div className={`flex items-center gap-1 ${centered ? 'justify-center' : ''}`}>
                {label}
                {isActive && (
                    <ChevronDown className={`h-3 w-3 ${currentOrder === 'asc' ? 'rotate-180' : ''}`} />
                )}
            </div>
        </th>
    )
}

interface ProwlarrResultsTableProps {
    results: ProwlarrRelease[]
    loading: boolean
    canManage: boolean
    selectedGuids: Set<string>
    downloading: string | null
    downloadSuccess: string | null
    sortBy: ProwlarrSortBy
    sortOrder: ProwlarrSortOrder
    onToggleSelect: (guid: string) => void
    onToggleSelectAll: () => void
    onSort: (col: ProwlarrSortBy) => void
    onDownload: (release: ProwlarrRelease) => void
}

/** Tableau des resultats Prowlarr avec tri, selection et action de telechargement. */
export function ProwlarrResultsTable({
    results,
    loading,
    canManage,
    selectedGuids,
    downloading,
    downloadSuccess,
    sortBy,
    sortOrder,
    onToggleSelect,
    onToggleSelectAll,
    onSort,
    onDownload,
}: ProwlarrResultsTableProps) {
    return (
        <div className="bg-gray-900/30 rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 font-medium uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={results.length > 0 && selectedGuids.size === results.length}
                                    onChange={onToggleSelectAll}
                                    className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/50 h-4 w-4 transition-all"
                                />
                            </th>
                            <th className="px-4 py-3">Titre</th>
                            <SortableHeader column="publishDate" label="Age" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} className="w-24" />
                            <SortableHeader column="size" label="Taille" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} className="w-28" />
                            <SortableHeader column="seeders" label="S/L" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} className="w-24 text-center" centered />
                            <th className="px-4 py-3 w-32">Indexeur</th>
                            <th className="px-4 py-3 w-16">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {results.length === 0 && !loading ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-gray-500 italic">
                                    <div className="flex flex-col items-center justify-center">
                                        <Search className="h-12 w-12 mb-4 opacity-20" />
                                        <p>Aucun résultat trouvé</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            results.map((result, i) => (
                                <tr
                                    key={result.guid + i}
                                    className={`hover:bg-white/10 transition-colors group ${
                                        selectedGuids.has(result.guid) ? 'bg-indigo-500/5' : ''
                                    }`}
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedGuids.has(result.guid)}
                                            onChange={() => onToggleSelect(result.guid)}
                                            className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/50 h-4 w-4 transition-all"
                                        />
                                    </td>
                                    <td className="px-4 py-3 cursor-pointer" onClick={() => onToggleSelect(result.guid)}>
                                        <div
                                            className="font-medium text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight"
                                            title={result.title}
                                        >
                                            {result.title}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {result.indexerFlags?.map(flag => (
                                                <span
                                                    key={flag}
                                                    className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] text-indigo-400 font-bold uppercase tracking-wider"
                                                >
                                                    {flag}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{getAge(result.publishDate)}</td>
                                    <td className="px-4 py-3 text-gray-300 font-medium whitespace-nowrap text-xs">{formatSize(result.size)}</td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                        <div className="flex flex-col items-center">
                                            <span className="text-green-500 font-bold text-sm">{result.seeders}</span>
                                            <span className="text-red-500/70 text-[10px]">{result.leechers} leech</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">
                                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg w-fit border border-white/5">
                                            <Database className="h-3 w-3 text-indigo-400" />
                                            <span className="text-[11px] font-medium truncate max-w-[100px]">{result.indexer}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {canManage && (
                                            <button
                                                onClick={() => onDownload(result)}
                                                disabled={downloading === result.guid || downloadSuccess === result.guid}
                                                className={`p-2.5 rounded-lg transition-all active:scale-95 ${
                                                    downloadSuccess === result.guid
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                                }`}
                                                title="Télécharger"
                                            >
                                                {downloading === result.guid ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : downloadSuccess === result.guid ? (
                                                    <CheckCircle2 className="h-4 w-4" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
