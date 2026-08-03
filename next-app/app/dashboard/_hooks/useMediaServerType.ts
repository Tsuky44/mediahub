'use client'

import { useEffect, useState } from 'react'

let cachedServerType: 'emby' | 'jellyfin' | null = null

export function useMediaServerType() {
  const [serverType, setServerType] = useState<'emby' | 'jellyfin'>(cachedServerType || 'emby')

  useEffect(() => {
    if (cachedServerType) return
    fetch('/api/media/server-type')
      .then(r => r.json())
      .then(data => {
        cachedServerType = data.serverType as 'emby' | 'jellyfin'
        setServerType(cachedServerType)
      })
      .catch(() => {})
  }, [])

  return serverType
}
