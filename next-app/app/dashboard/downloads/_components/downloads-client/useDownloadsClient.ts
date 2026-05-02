'use client'

import { useState } from 'react'
import type { DownloadsPermissions } from '../DownloadsClient'

export function useDownloadsClient(
  hasQbit: boolean,
  hasSmb: boolean,
  hasProwlarr: boolean,
  permissions: DownloadsPermissions,
  isAdmin?: boolean
) {
  const defaultTab = () => {
    if (hasQbit && permissions.canReadTorrents) return 'qbit'
    if (hasSmb && permissions.canReadExplorer) return 'smb'
    if ((hasProwlarr || isAdmin) && permissions.canInteractiveSearch) return 'prowlarr'
    return 'qbit'
  }

  const [activeTab, setActiveTab] = useState<'qbit' | 'smb' | 'prowlarr'>(defaultTab())

  return { activeTab, setActiveTab }
}
