'use client'

import { useState } from 'react'
import { TrendingUp, Film, Tv } from 'lucide-react'
import { TopItemCard } from './top-items-tabs/TopItemCard'

interface TopItemsTabsProps {
  movies: any[]
  series: any[]
  title?: string
}

export function TopItemsTabs({ movies, series, title = "Contenus les plus vus" }: TopItemsTabsProps) {
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>(movies.length >= series.length ? 'movies' : 'series')

  const currentItems = activeTab === 'movies' ? movies : series

  return (
    <div className="onyx-reveal space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-yellow-500" />
          {title}
        </h2>

        <div className="flex p-1 bg-gray-900/80 rounded-xl border border-gray-800 w-fit">
          <button
            onClick={() => setActiveTab('movies')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'movies'
                ? 'bg-gray-800 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            Films
          </button>
          <button
            onClick={() => setActiveTab('series')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'series'
                ? 'bg-gray-800 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            Séries
          </button>
        </div>
      </div>

      <div className="onyx-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 *:onyx-lift">
        {currentItems.map((item, index) => (
          <TopItemCard
            key={item.Id || item.ItemId || index}
            item={item}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  )
}
