'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { useDebounce } from 'use-debounce'

export function SearchInput() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [text, setText] = useState(initialQuery)
  const [query] = useDebounce(text, 500)

  useEffect(() => {
    // Only push if query changed or if we are not on the initial load with same query
    // But since this is a controlled component with URL sync, we just sync query to URL
    
    // Check if query actually changed compared to URL to avoid loops or unnecessary pushes
    const currentQ = searchParams.get('q') || ''
    if (query === currentQ && query === '') return // Both empty, do nothing
    if (query === currentQ) return // Same query, do nothing
    
    const params = new URLSearchParams(searchParams)
    
    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    
    // When searching, we usually want to reset pagination?
    // The page component handles fetching page 1.
    // We should replace or push? Push allows back button.
    router.push(`/dashboard/requests?${params.toString()}`)
    
  }, [query, router, searchParams])

  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>
      <input
        type="text"
        className="block w-full rounded-full border-0 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        placeholder="Rechercher un film ou une série..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  )
}
