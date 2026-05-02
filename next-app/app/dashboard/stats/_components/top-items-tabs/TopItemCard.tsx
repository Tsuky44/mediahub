'use client'

import Link from 'next/link'
import { Film } from 'lucide-react'
import { EmbyImage } from '@/components/global/EmbyImage'

interface TopItemCardProps {
  item: any
  rank: number
}

export function TopItemCard({ item, rank }: TopItemCardProps) {
  const isSeries = item.Type === 'Episode' || !!item.SeriesName || item.ItemType === 'Episode' || item.mediaType === 'tv'
  const name = item.Name || item.ItemName || item.NowPlayingItemName || 'Inconnu'

  let searchName = name
  if (isSeries) {
    if (item.SeriesName) {
      searchName = item.SeriesName
    } else if (name.includes(' - ')) {
      searchName = name.split(' - ')[0]
    } else if (name.includes(' : ')) {
      searchName = name.split(' : ')[0]
    }
  }

  const rawId = item.imageItemId || item.NowPlayingItemId || item.ItemId || item.Id || item.id
  const itemId = rawId ? String(rawId) : undefined
  const count = item.count || 0

  const seasonNum = item.seasonIndex ?? item.ParentIndexNumber
  const episodeNum = item.episodeIndex ?? item.IndexNumber

  const tmdbId = item.tmdbId || item.TmdbId || item.mediaInfo?.tmdbId || item.mediaInfo?.ProviderIds?.Tmdb

  let href = null
  if (tmdbId) {
    href = `/dashboard/media/${tmdbId}?type=${isSeries ? 'tv' : 'movie'}${isSeries && seasonNum !== undefined && episodeNum !== undefined ? `&season=${seasonNum}&episode=${episodeNum}` : ''}`
  } else if (itemId) {
    href = `/dashboard/media/${itemId}?type=${isSeries ? 'tv' : 'movie'}&source=${item.Source || 'emby'}&name=${encodeURIComponent(searchName)}${isSeries && seasonNum !== undefined && episodeNum !== undefined ? `&season=${seasonNum}&episode=${episodeNum}` : ''}`
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
          <span className="text-[10px] text-gray-500 truncate">{count} vues</span>
        </div>
      </div>
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {Content}
    </Link>
  ) : (
    <div>{Content}</div>
  )
}
