'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface ActivityData {
  name: string
  value: number
  [key: string]: any
}

interface StatsChartsProps {
  hourlyActivity: ActivityData[]
  dailyActivity: ActivityData[]
  monthlyActivity?: ActivityData[]
}

export function StatsCharts({ hourlyActivity, dailyActivity, monthlyActivity }: StatsChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Activité par heure */}
        <div className="rounded-xl bg-gray-900/40 backdrop-blur-md p-6 shadow-2xl border border-gray-700/50 ring-1 ring-white/5">
          <h3 className="mb-4 text-lg font-semibold text-white">Activité par heure</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', color: '#F3F4F6' }}
                  itemStyle={{ color: '#F3F4F6' }}
                  cursor={{ fill: '#374151', opacity: 0.4 }}
                />
                <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]}>
                  {hourlyActivity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#6366F1' : '#1F2937'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activité par jour */}
        <div className="rounded-xl bg-gray-900/40 backdrop-blur-md p-6 shadow-2xl border border-gray-700/50 ring-1 ring-white/5">
          <h3 className="mb-4 text-lg font-semibold text-white">Activité par jour</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', color: '#F3F4F6' }}
                  itemStyle={{ color: '#F3F4F6' }}
                  cursor={{ fill: '#374151', opacity: 0.4 }}
                />
                <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]}>
                  {dailyActivity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#10B981' : '#1F2937'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activité par mois (Optionnel) */}
        {monthlyActivity && (
          <div className="rounded-xl bg-gray-900/40 backdrop-blur-md p-6 shadow-2xl border border-gray-700/50 ring-1 ring-white/5">
            <h3 className="mb-4 text-lg font-semibold text-white">Activité par mois</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', color: '#F3F4F6' }}
                    itemStyle={{ color: '#F3F4F6' }}
                    cursor={{ fill: '#374151', opacity: 0.4 }}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                    {monthlyActivity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#8B5CF6' : '#1F2937'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
