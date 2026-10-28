'use client'

import { useRef, useState } from 'react'
import { Eye, Send, CalendarPlus, HardDrive, RotateCcw, Loader2 } from 'lucide-react'
import type { StorageDateFilter, StorageDateFilterMode, StorageFilters } from '../../_types/storage'
import { countActiveFilters, DEFAULT_STORAGE_FILTERS } from '../../_utils/storage-filters'
import { formatBytes } from '../../_utils/storage-formatters'
import { FilterSelect, type FilterSelectOption } from './FilterSelect'

interface StorageFilterBarProps {
    filters: StorageFilters
    onChange: (filters: StorageFilters) => void
    /** Nombre et taille cumulée des résultats (toute la bibliothèque) */
    resultCount: number | null
    resultSize: number | null
    refreshing: boolean
}

type ModeOption = { value: StorageDateFilterMode; label: string; hint: (months: number) => string }

const WATCHED_MODES: ModeOption[] = [
    { value: 'any', label: 'Peu importe', hint: () => 'Aucun filtre' },
    { value: 'never', label: 'Jamais', hint: () => 'Jamais lu par aucun utilisateur' },
    { value: 'olderOrNever', label: 'Jamais ou il y a plus de', hint: m => `Jamais regardé, ou pas depuis ${m} mois` },
    { value: 'olderThan', label: 'Il y a plus de', hint: m => `Regardé, mais pas depuis ${m} mois` },
    { value: 'within', label: 'Dans les derniers', hint: m => `Regardé au cours des ${m} derniers mois` },
]

const REQUESTED_MODES: ModeOption[] = [
    { value: 'any', label: 'Peu importe', hint: () => 'Aucun filtre' },
    { value: 'never', label: 'Jamais demandé', hint: () => 'Présent sans aucune demande' },
    { value: 'olderOrNever', label: 'Jamais ou il y a plus de', hint: m => `Jamais demandé, ou demandé il y a plus de ${m} mois` },
    { value: 'olderThan', label: 'Il y a plus de', hint: m => `Demandé il y a plus de ${m} mois` },
    { value: 'within', label: 'Dans les derniers', hint: m => `Demandé au cours des ${m} derniers mois` },
]

const ADDED_MODES: ModeOption[] = [
    { value: 'any', label: 'Peu importe', hint: () => 'Aucun filtre' },
    { value: 'olderThan', label: 'Il y a plus de', hint: m => `Ajouté au serveur il y a plus de ${m} mois` },
    { value: 'within', label: 'Dans les derniers', hint: m => `Ajouté au cours des ${m} derniers mois` },
]

const SIZE_OPTIONS: FilterSelectOption<number>[] = [0, 1, 5, 10, 20, 50, 100].map(gb => ({
    value: gb,
    label: gb === 0 ? 'Toutes' : `${gb} Go et plus`,
}))

const needsMonths = (mode: StorageDateFilterMode) => mode !== 'any' && mode !== 'never'

const chipClass = (active: boolean) =>
    `flex items-center gap-2 shrink-0 rounded-xl border px-3 py-1.5 transition-colors ${
        active ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/10 bg-black/30 hover:border-white/20'
    }`

/** Icône + libellé du filtre, dans le bouton du menu */
function ChipLabel({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
    return (
        <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${active ? 'text-purple-300' : 'text-gray-500'}`}>
            {icon}
            {label}
        </span>
    )
}

/** Nombre de mois (les filtres sont envoyés à l'API après une courte pause de saisie). */
function MonthsInput({ value, onCommit }: { value: number; onCommit: (months: number) => void }) {
    const [draft, setDraft] = useState(String(value))

    return (
        <span className="inline-flex items-center gap-1">
            <input
                type="number"
                inputMode="numeric"
                min={1}
                max={240}
                value={draft}
                onChange={e => {
                    setDraft(e.target.value)
                    const months = parseInt(e.target.value, 10)
                    if (months >= 1) onCommit(Math.min(240, months))
                }}
                onBlur={() => setDraft(String(value))}
                className="w-12 bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-purple-500/60"
                aria-label="Nombre de mois"
            />
            <span className="text-gray-400 text-sm">mois</span>
        </span>
    )
}

function DateFilterControl({
    icon,
    label,
    filter,
    modes,
    onChange,
}: {
    icon: React.ReactNode
    label: string
    filter: StorageDateFilter
    modes: ModeOption[]
    onChange: (filter: StorageDateFilter) => void
}) {
    const active = filter.mode !== 'any'
    const chipRef = useRef<HTMLDivElement>(null)
    return (
        <div ref={chipRef} className={chipClass(active)}>
            <FilterSelect
                value={filter.mode}
                options={modes.map(m => ({ value: m.value, label: m.label, hint: m.hint(filter.months) }))}
                onChange={mode => onChange({ ...filter, mode })}
                ariaLabel={`Filtre ${label}`}
                anchorRef={chipRef}
            >
                <ChipLabel icon={icon} label={label} active={active} />
            </FilterSelect>
            {needsMonths(filter.mode) && (
                <MonthsInput value={filter.months} onCommit={months => onChange({ ...filter, months })} />
            )}
        </div>
    )
}

/**
 * Filtres fins du gestionnaire de stockage (appliqués par l'API sur toute la
 * bibliothèque) : dernière lecture, date de demande, date d'ajout, taille.
 */
export function StorageFilterBar({ filters, onChange, resultCount, resultSize, refreshing }: StorageFilterBarProps) {
    const activeCount = countActiveFilters(filters)
    const minSizeActive = filters.minSizeGb > 0
    const sizeChipRef = useRef<HTMLDivElement>(null)

    return (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-visible">
            <DateFilterControl
                icon={<Eye size={14} />}
                label="Regardé"
                filter={filters.watched}
                modes={WATCHED_MODES}
                onChange={watched => onChange({ ...filters, watched })}
            />
            <DateFilterControl
                icon={<Send size={14} />}
                label="Demandé"
                filter={filters.requested}
                modes={REQUESTED_MODES}
                onChange={requested => onChange({ ...filters, requested })}
            />
            <DateFilterControl
                icon={<CalendarPlus size={14} />}
                label="Ajouté"
                filter={filters.added}
                modes={ADDED_MODES}
                onChange={added => onChange({ ...filters, added })}
            />
            <div ref={sizeChipRef} className={chipClass(minSizeActive)}>
                <FilterSelect
                    value={filters.minSizeGb}
                    options={SIZE_OPTIONS}
                    onChange={minSizeGb => onChange({ ...filters, minSizeGb })}
                    ariaLabel="Filtre Taille"
                    anchorRef={sizeChipRef}
                >
                    <ChipLabel icon={<HardDrive size={14} />} label="Taille" active={minSizeActive} />
                </FilterSelect>
            </div>

            {activeCount > 0 && (
                <button
                    type="button"
                    onClick={() => onChange(DEFAULT_STORAGE_FILTERS)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Retirer tous les filtres"
                >
                    <RotateCcw size={14} />
                    Réinitialiser ({activeCount})
                </button>
            )}

            <span className="shrink-0 ml-auto pl-2 inline-flex items-center gap-2 text-xs text-gray-400 whitespace-nowrap">
                {refreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
                {resultCount != null && (
                    <>
                        <span className="text-white font-medium">{resultCount}</span>
                        résultat{resultCount > 1 ? 's' : ''}
                        {resultSize != null && (
                            <span className="text-gray-500">• {formatBytes(resultSize)}</span>
                        )}
                    </>
                )}
            </span>
        </div>
    )
}
