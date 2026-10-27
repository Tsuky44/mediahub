'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'
import clsx from 'clsx'

export type ShareLimitUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
export type ShareLimitType = 'global' | 'unlimited' | 'custom'

interface ShareLimitModalProps {
    isOpen: boolean
    onClose: () => void
    onApply: () => void | Promise<void>
    shareLimitTime: number
    onShareLimitTimeChange: (value: number) => void
    shareLimitUnit: ShareLimitUnit
    onShareLimitUnitChange: (unit: ShareLimitUnit) => void
    shareLimitType: ShareLimitType
    onShareLimitTypeChange: (type: ShareLimitType) => void
}

export function ShareLimitModal({
    isOpen,
    onClose,
    onApply,
    shareLimitTime,
    onShareLimitTimeChange,
    shareLimitUnit,
    onShareLimitUnitChange,
    shareLimitType,
    onShareLimitTypeChange,
}: ShareLimitModalProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    if (!mounted || !isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-[#080909]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-md p-8 shadow-2xl ring-1 ring-white/5 space-y-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-lg shadow-orange-500/10 mb-6">
                        <Clock className="w-8 h-8 text-orange-500" />
                    </div>

                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Limite de temps (Seed)
                    </h3>

                    <p className="text-gray-400 font-medium leading-relaxed text-sm">
                        Définissez la durée maximale pendant laquelle les torrents sélectionnés resteront actifs avant d'être arrêtés ou supprimés (selon la configuration globale).
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => onShareLimitTypeChange('global')}
                            className={clsx(
                                "p-3 rounded-xl text-xs font-bold border transition-all",
                                shareLimitType === 'global'
                                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400"
                                    : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                            )}
                        >
                            Global
                        </button>
                        <button
                            onClick={() => onShareLimitTypeChange('unlimited')}
                            className={clsx(
                                "p-3 rounded-xl text-xs font-bold border transition-all",
                                shareLimitType === 'unlimited'
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                    : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                            )}
                        >
                            Infini
                        </button>
                        <button
                            onClick={() => onShareLimitTypeChange('custom')}
                            className={clsx(
                                "p-3 rounded-xl text-xs font-bold border transition-all",
                                shareLimitType === 'custom'
                                    ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                                    : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                            )}
                        >
                            Personnalisé
                        </button>
                    </div>

                    {shareLimitType === 'custom' && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <input
                                type="number"
                                min="0"
                                value={shareLimitTime}
                                onChange={(e) => onShareLimitTimeChange(parseInt(e.target.value) || 0)}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/30 outline-none transition-all"
                            />
                            <select
                                value={shareLimitUnit}
                                onChange={(e) => onShareLimitUnitChange(e.target.value as ShareLimitUnit)}
                                className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/30 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="minutes">Minutes</option>
                                <option value="hours">Heures</option>
                                <option value="days">Jours</option>
                                <option value="weeks">Semaines</option>
                                <option value="months">Mois</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-bold transition-all"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onApply}
                        className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        Appliquer
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
