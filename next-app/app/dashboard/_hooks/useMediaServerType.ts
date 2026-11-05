'use client'

import { useEffect, useState } from 'react'

type ServerType = 'emby' | 'jellyfin'
interface ServerInfo {
  serverType: ServerType
  accountOrigin: 'onyx' | null
}

let cachedInfo: ServerInfo | null = null
let pending: Promise<ServerInfo> | null = null

function loadServerInfo(): Promise<ServerInfo> {
  if (!pending) {
    pending = fetch('/api/media/server-type')
      .then(r => r.json())
      .then((data): ServerInfo => {
        cachedInfo = { serverType: data.serverType, accountOrigin: data.accountOrigin ?? null }
        return cachedInfo
      })
      .catch(() => {
        pending = null
        return { serverType: 'emby' as ServerType, accountOrigin: null }
      })
  }
  return pending
}

function useServerInfo(): ServerInfo {
  const [info, setInfo] = useState<ServerInfo>(cachedInfo || { serverType: 'emby', accountOrigin: null })

  useEffect(() => {
    if (cachedInfo) return
    loadServerInfo().then(setInfo)
  }, [])

  return info
}

export function useMediaServerType() {
  return useServerInfo().serverType
}
