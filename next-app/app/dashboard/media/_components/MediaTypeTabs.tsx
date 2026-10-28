interface MediaTypeTabsProps {
  currentType: 'all' | 'movie' | 'tv'
  query?: string
  isFavoritesOnly: boolean
  isWatchLaterOnly: boolean
}

export function MediaTypeTabs({ currentType, query, isFavoritesOnly, isWatchLaterOnly }: MediaTypeTabsProps) {
  const buildHref = (type: string) =>
    `?type=${type}${query ? `&q=${query}` : ''}${isFavoritesOnly ? '&favorites=true' : ''}${isWatchLaterOnly ? '&watchLater=true' : ''}`

  const tabs = [
    { key: 'all', label: 'Tout' },
    { key: 'movie', label: 'Films' },
    { key: 'tv', label: 'Séries' },
  ] as const

  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex bg-gray-900/50 p-1.5 rounded-full border border-gray-800/50 backdrop-blur-md shadow-inner">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={buildHref(tab.key)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
              currentType === tab.key
                ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(232,230,228,0.12)] scale-105'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>
    </div>
  )
}
