'use client'

import { useState, useEffect } from 'react'

export function useFilterModal(isOpen: boolean) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return { mounted: mounted && isOpen }
}
