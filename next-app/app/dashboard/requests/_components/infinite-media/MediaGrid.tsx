'use client'

import { Loader2 } from 'lucide-react'
import { MediaCard } from '@/components/global/MediaCard'

// Objet dérivé stable par item (même référence d'un rendu à l'autre) pour que les
// cartes mémoïsées déjà affichées ne soient pas recalculées à chaque ajout de page
const withMediaTypeCache = new WeakMap<object, { initialType: string; value: any }>()
function withMediaType(item: any, initialType: string) {
  if (item.media_type) return item
  const cached = withMediaTypeCache.get(item)
  if (cached && cached.initialType === initialType) return cached.value
  const value = { ...item, media_type: initialType === 'movie' ? 'movie' : initialType === 'tv' ? 'tv' : undefined }
  withMediaTypeCache.set(item, { initialType, value })
  return value
}

interface MediaGridProps {
  items: any[]
  loading: boolean
  hasMore: boolean
  initialType: string
  triggerRef: (node: HTMLElement | null) => void
}

export function MediaGrid({ items, loading, hasMore, initialType, triggerRef }: MediaGridProps) {
  return (
    <div className="onyx-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {items.map(item => (
        <MediaCard key={item.id} item={withMediaType(item, initialType)} />
      ))}
    </div>
  )
}

export function MediaGridLoading() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  )
}

export function MediaGridMoreLoading() {
  return (
    <div className="flex justify-center py-4 opacity-50">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
    </div>
  )
}

export function MediaGridEmpty() {
  return <div className="text-center py-12 text-gray-500">Aucun résultat trouvé</div>
}

export function InfiniteScrollTrigger({ triggerRef }: { triggerRef: (node: HTMLElement | null) => void }) {
  return <div ref={triggerRef} className="h-10 opacity-0 pointer-events-none" />
}
