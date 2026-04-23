'use client'

import React from 'react'
import { Film } from 'lucide-react'

interface EmbyImageProps {
  itemId: string
  alt: string
  itemName?: string
  tmdbId?: string
  mediaType?: 'tv' | 'movie'
  className?: string
}

export function EmbyImage({ itemId, alt, itemName, tmdbId, mediaType, className = "h-full w-full object-cover" }: EmbyImageProps) {
  // Use the image proxy route which handles TMDB fallback
  const params = new URLSearchParams()
  if (tmdbId) params.append('tmdbId', tmdbId)
  if (mediaType) params.append('mediaType', mediaType)
  if (itemName) params.append('itemName', itemName)
  
  const url = `/api/media/image/${itemId}${params.toString() ? `?${params.toString()}` : ''}`
  
  return (
    <div className="relative h-full w-full">
      <img 
        src={url} 
        alt={alt}
        className={className}
        loading="lazy"
        onError={(e) => {
          // If the image fails to load (even if URL exists), try to show a placeholder
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            // Check if placeholder already exists
            if (parent.querySelector('.emby-image-placeholder')) return;
            
            const placeholder = document.createElement('div');
            placeholder.className = 'emby-image-placeholder w-full h-full bg-gray-800 flex items-center justify-center';
            placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
            parent.appendChild(placeholder);
          }
        }}
      />
    </div>
  )
}
