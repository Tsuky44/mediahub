'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Film, Tv } from 'lucide-react'
import { EmbyImage } from '@/components/EmbyImage'

interface TopItemCardProps {
  item: any
  rank: number
}

function TopItemCard({ item, rank }: TopItemCardProps) {
  const isSeries = item.Type === 'Episode' || !!item.SeriesName || item.ItemType === 'Episode' || item.mediaType === 'tv'
  const name = item.Name || item.ItemName || item.NowPlayingItemName || 'Inconnu'
  
  // Refine name for search if it's a series/episode
  let searchName = name;
  if (isSeries) {
      if (item.SeriesName) {
          searchName = item.SeriesName;
      } else if (name.includes(' - ')) {
          searchName = name.split(' - ')[0];
      } else if (name.includes(' : ')) {
          searchName = name.split(' : ')[0];
      }
  }

  // Ensure itemId is a string and not "0" or "undefined" if possible, but allow 0 if it's a valid ID
  const rawId = item.imageItemId || item.NowPlayingItemId || item.ItemId || item.Id || item.id
  const itemId = rawId ? String(rawId) : undefined
  const count = item.count || 0
  
  const seasonNum = item.seasonIndex ?? item.ParentIndexNumber;
  const episodeNum = item.episodeIndex ?? item.IndexNumber;
  
  const tmdbId = item.tmdbId || item.TmdbId || item.mediaInfo?.tmdbId || item.mediaInfo?.ProviderIds?.Tmdb;

  let href = null;
  if (tmdbId) {
      href = `/dashboard/media/${tmdbId}?type=${isSeries ? 'tv' : 'movie'}${isSeries && seasonNum !== undefined && episodeNum !== undefined ? `&season=${seasonNum}&episode=${episodeNum}` : ''}`;
  } else if (itemId) {
      href = `/dashboard/media/${itemId}?type=${isSeries ? 'tv' : 'movie'}&source=${item.Source || 'emby'}&name=${encodeURIComponent(searchName)}${isSeries && seasonNum !== undefined && episodeNum !== undefined ? `&season=${seasonNum}&episode=${episodeNum}` : ''}`;
  }

  const Content = (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all group">
      <div className="text-lg font-bold text-gray-600 w-4">{rank}</div>
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-gray-800">
        {itemId ? (
          <EmbyImage 
            itemId={itemId} 
            alt={name} 
            itemName={name}
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
        <div className="text-sm font-semibold text-white line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
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
  );

  return href ? (
    <Link href={href} className="block">
      {Content}
    </Link>
  ) : (
    <div>
      {Content}
    </div>
  );
}

interface TopItemsTabsProps {
  movies: any[]
  series: any[]
  title?: string
}

export function TopItemsTabs({ movies, series, title = "Contenus les plus vus" }: TopItemsTabsProps) {
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
