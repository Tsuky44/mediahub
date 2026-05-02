'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useTrackerStatsModal } from '../../_hooks/useTrackerStatsModal'
import { TrackerStatsSessionView } from './TrackerStatsSessionView'
import { TrackerStatsHistoryView } from './TrackerStatsHistoryView'
import { TrackerModalTabButton } from './TrackerModalTabButton'
import { TrackerModalLoadingView } from './TrackerModalLoadingView'

interface TrackerStatsModalProps {
    isOpen: boolean
    onClose: () => void
}

/** Modal avec onglets Session/Historique pour les stats par tracker. */
export function TrackerStatsModal({ isOpen, onClose }: TrackerStatsModalProps) {
    const {
        activeTab,
        setActiveTab,
        trackerStats,
        history,
        loadingTrackers,
        loadingHistory,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
    } = useTrackerStatsModal(isOpen)

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="flex border-b border-white/5 relative">
                            <TrackerModalTabButton label="Session Actuelle" target="session" active={activeTab} onClick={setActiveTab} />
                            <TrackerModalTabButton label="Historique" target="history" active={activeTab} onClick={setActiveTab} />
                            <button
                                onClick={onClose}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {activeTab === 'history' && (
                            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-4 overflow-x-auto custom-scrollbar">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Du</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        max={endDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors font-mono color-scheme-dark"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <div className="w-px h-4 bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Au</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        min={startDate}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors font-mono color-scheme-dark"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {loadingTrackers && activeTab === 'session' ? (
                                <TrackerModalLoadingView message="Récupération des données..." />
                            ) : loadingHistory && activeTab === 'history' ? (
                                <TrackerModalLoadingView message="Analyse de l'historique..." />
                            ) : activeTab === 'session' ? (
                                <TrackerStatsSessionView trackerStats={trackerStats} />
                            ) : (
                                <TrackerStatsHistoryView history={history} />
                            )}
                        </div>

                        <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-all"
                            >
                                Fermer
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
