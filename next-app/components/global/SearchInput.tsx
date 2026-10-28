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
    <div className="relative w-full max-w-md group">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        ) : (
          <Search className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors duration-300" aria-hidden="true" />
        )}
      </div>
      <input
        type="text"
        name="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck="false"
        data-1p-ignore="true"
        data-lpignore="true"
        data-form-type="other"
        className="block w-full rounded-full border border-white/5 bg-gray-900/50 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-gray-900 transition-all duration-300 shadow-inner group-hover:bg-gray-800/50 group-hover:border-white/10 sm:text-sm sm:leading-6"
        placeholder={placeholder || "Rechercher..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  )
}
