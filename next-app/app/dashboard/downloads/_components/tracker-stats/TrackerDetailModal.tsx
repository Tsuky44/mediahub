'use client'

import { motion } from 'framer-motion'
import type { TrackerStat } from '../../_types/tracker-stat'
import { TrackerModalHeader } from './TrackerModalHeader'
import { TrackerStatsBody } from './TrackerStatsBody'

interface TrackerDetailModalProps {
  stat: TrackerStat
  onClose: () => void
}

export default function TrackerDetailModal({
  stat,
  onClose,
}: TrackerDetailModalProps) {
  return (
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
        className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        <TrackerModalHeader stat={stat} onClose={onClose} />
        <TrackerStatsBody stat={stat} />

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
  )
}
