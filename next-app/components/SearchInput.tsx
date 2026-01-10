'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { useDebounce } from 'use-debounce'

export function SearchInput({ placeholder }: { placeholder?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const initialQuery = searchParams.get('q') || ''
  
  const [text, setText] = useState(initialQuery)
  const [query] = useDebounce(text, 500)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const currentQ = searchParams.get('q') || ''
    if (query === currentQ) return 
    
    const params = new URLSearchParams(searchParams.toString())
    
    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    
    // On s'assure de garder le filtre s'il existe
    const currentFilter = searchParams.get('filter')
    if (currentFilter) {
      params.set('filter', currentFilter)
    }
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
    
  }, [query, router, searchParams, pathname])

  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        ) : (
          <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
        )}
      </div>
      <input
        type="text"
        className="block w-full rounded-full border-0 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        placeholder={placeholder || "Rechercher..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  )
}
