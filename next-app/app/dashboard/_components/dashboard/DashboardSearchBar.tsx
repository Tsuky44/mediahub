'use client'

import { Film, Search, Tv } from 'lucide-react'
import Link from 'next/link'
import type { LiveSearchResult } from '../../_types/dashboard'

interface DashboardSearchBarProps {
  userName?: string
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  searchResults: LiveSearchResult[]
  isSearching: boolean
  showResults: boolean
  onFocusOpenResults: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function DashboardSearchBar({
  userName,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  showResults,
  onFocusOpenResults,
  containerRef,
}: DashboardSearchBarProps) {
  return (
    <div className="max-w-4xl mx-auto pt-8 pb-4" ref={containerRef}>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
          {userName ? `Bonjour ${userName}, que` : 'Que'} voulez-vous{' '}
          <span className="text-blue-500">regarder</span> ?
        </h1>
        <p className="text-gray-400">
          Recherchez parmi des milliers de films et séries à ajouter.
        </p>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
        <div className="relative flex items-center">
          <input
            type="text"
            name="search-home"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder="Rechercher un film ou une série..."
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-6 py-5 pl-14 text-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-2xl"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onFocus={onFocusOpenResults}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery) {
                window.location.href = `/dashboard/requests?search=${encodeURIComponent(searchQuery)}`
              }
            }}
          />
          <Search
            className={`absolute left-5 w-6 h-6 transition-colors ${
              isSearching
                ? 'text-blue-500 animate-pulse'
                : 'text-gray-500 group-focus-within:text-blue-500'
            }`}
          />
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl bg-opacity-95">
            <div className="max-h-[400px] overflow-y-auto py-2">
              {searchResults.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={`/dashboard/media/${result.id}?type=${result.type}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="w-10 h-14 bg-gray-800 rounded flex-shrink-0 overflow-hidden">
                    {result.poster ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={result.poster}
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {result.type === 'movie' ? (
                          <Film className="w-5 h-5 text-gray-600" />
                        ) : (
                          <Tv className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                      {result.title}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="capitalize">
                        {result.type === 'movie' ? 'Film' : 'Série'}
                      </span>
                      {result.year && <span>• {result.year}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
