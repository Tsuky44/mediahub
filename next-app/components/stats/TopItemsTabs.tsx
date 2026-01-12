'use client'

import { useState } from 'react'
import { TrendingUp, Film, Tv } from 'lucide-react'
import { EmbyImage } from '../EmbyImage'

interface TopItemCardProps {
  item: any
  rank: number
  instanceId: number
}

function TopItemCard({ item, rank, instanceId }: TopItemCardProps) {
  const isSeries = item.Type === 'Episode' || !!item.SeriesName || item.ItemType === 'Episode'
  const name = item.Name || item.ItemName || item.NowPlayingItemName || 'Inconnu'
  const itemId = item.imageItemId || item.NowPlayingItemId || item.ItemId || item.Id || item.id
  const count = item.count || 0
  
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all group">
      <div className="text-lg font-bold text-gray-600 w-4">{rank}</div>
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-gray-800">
        {itemId ? (
          <EmbyImage 
            itemId={itemId} 
            alt={name} 
            itemName={name}
            instanceId={instanceId} 
            tmdbId={item.tmdbId}
            mediaType={item.mediaType}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <Film className="h-4 w-4 text-gray-600" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
          {name}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 text-gray-500 font-medium border border-gray-700">
            {isSeries ? 'Série' : 'Film'}
          </span>
          <span className="text-[10px] text-gray-500 truncate">
            {count} vues
          </span>
        </div>
      </div>
    </div>
  )
}

interface TopItemsTabsProps {
  movies: any[]
  series: any[]
  instanceId: number
  title?: string
}

export function TopItemsTabs({ movies, series, instanceId, title = "Contenus les plus vus" }: TopItemsTabsProps) {
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>(movies.length >= series.length ? 'movies' : 'series')

  const currentItems = activeTab === 'movies' ? movies : series

  return (
    <div className="space-y-4">
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

      <div className="space-y-3 min-h-[400px]">
        {currentItems.length > 0 ? (
          currentItems.map((item, idx) => (
            <TopItemCard 
              key={item.Id || idx} 
              item={item} 
              rank={idx + 1} 
              instanceId={instanceId} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 italic border border-dashed border-gray-800 rounded-xl bg-gray-900/20">
            <p>Aucune donnée disponible pour cette catégorie</p>
          </div>
        )}
      </div>
    </div>
  )
}
