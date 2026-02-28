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
import { Activity, CalendarDays } from 'lucide-react'

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
        <div className="rounded-3xl bg-black/20 backdrop-blur-md p-6 shadow-xl border border-white/5 ring-1 ring-white/5 transition-all duration-300 hover:bg-white/[0.03] hover:border-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">Activité par heure</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: '#F3F4F6', backdropFilter: 'blur(8px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#F3F4F6', fontWeight: 600 }}
                  cursor={{ fill: '#6366F1', opacity: 0.1 }}
                />
                <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} animationDuration={1500}>
                  {hourlyActivity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#6366F1' : '#1F2937'} strokeWidth={0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activité par jour */}
        <div className="rounded-3xl bg-black/20 backdrop-blur-md p-6 shadow-xl border border-white/5 ring-1 ring-white/5 transition-all duration-300 hover:bg-white/[0.03] hover:border-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <CalendarDays className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">Activité par jour</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: '#F3F4F6', backdropFilter: 'blur(8px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#F3F4F6', fontWeight: 600 }}
                  cursor={{ fill: '#10B981', opacity: 0.1 }}
                />
                <Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} animationDuration={1500}>
                  {dailyActivity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#10B981' : '#1F2937'} strokeWidth={0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activité par mois (Optionnel) */}
        {monthlyActivity && (
          <div className="rounded-3xl bg-black/20 backdrop-blur-md p-6 shadow-xl border border-white/5 ring-1 ring-white/5 transition-all duration-300 hover:bg-white/[0.03] hover:border-violet-500/20 hover:shadow-2xl hover:shadow-violet-500/10">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-violet-500/10 rounded-xl">
                  <Activity className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-wide">Activité par mois</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: '#F3F4F6', backdropFilter: 'blur(8px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#F3F4F6', fontWeight: 600 }}
                    cursor={{ fill: '#8B5CF6', opacity: 0.1 }}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} animationDuration={1500}>
                    {monthlyActivity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#8B5CF6' : '#1F2937'} strokeWidth={0} />
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
