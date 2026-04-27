'use client'

import { Calendar } from 'lucide-react'

interface DateRangeCardProps {
  startDate: string
  endDate: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
}

export function DateRangeCard({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeCardProps) {
  return (
    <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4 text-indigo-400">
        <Calendar className="h-4 w-4" />
        <h4 className="font-bold text-white">Période</h4>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">
            De
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full bg-gray-900 border-gray-700 rounded-2xl text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">
            À
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full bg-gray-900 border-gray-700 rounded-2xl text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>
    </div>
  )
}
