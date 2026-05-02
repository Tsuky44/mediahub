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
  Cell,
} from 'recharts'
import type { ActivityData } from '../StatsCharts'

interface ActivityChartProps {
  data: ActivityData[]
  title: string
  color: string
  fontSize?: number
}

export function ActivityChart({ data, title, color, fontSize = 12 }: ActivityChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.5} />
          <XAxis
            dataKey="name"
            stroke="#9CA3AF"
            fontSize={fontSize}
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
            contentStyle={{
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              color: '#F3F4F6',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            }}
            itemStyle={{ color: '#F3F4F6', fontWeight: 600 }}
            cursor={{ fill: color, opacity: 0.1 }}
          />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} animationDuration={1500}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value > 0 ? color : '#1F2937'}
                strokeWidth={0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
