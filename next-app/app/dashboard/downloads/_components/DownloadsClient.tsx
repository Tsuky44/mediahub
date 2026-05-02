'use client'

import { DownloadsHeader } from './downloads-client/DownloadsHeader'
import { QbitPanel } from './downloads-client/QbitPanel'
import { SmbPanel } from './downloads-client/SmbPanel'
import { ProwlarrPanel } from './downloads-client/ProwlarrPanel'
import { useDownloadsClient } from './downloads-client/useDownloadsClient'

export interface DownloadsPermissions {
  canReadTorrents: boolean
  canAddTorrent: boolean
  canManageTorrents: boolean
  canReadExplorer: boolean
  canShareFiles: boolean
  canDeleteFiles: boolean
  canInteractiveSearch: boolean
}

export default function DownloadsClient({
  hasQbit,
  hasSmb,
  hasProwlarr,
  permissions,
  isAdmin,
}: {
  hasQbit: boolean
  hasSmb: boolean
  hasProwlarr: boolean
  permissions: DownloadsPermissions
  isAdmin?: boolean
}) {
  const { activeTab, setActiveTab } = useDownloadsClient(hasQbit, hasSmb, hasProwlarr, permissions, isAdmin)

  return (
    <div
      className={`space-y-6 mx-auto transition-all duration-300 ${
        activeTab === 'prowlarr' ? 'w-full max-w-[1800px]' : 'max-w-7xl'
      }`}
    >
      <DownloadsHeader
        activeTab={activeTab}
        hasQbit={hasQbit}
        hasSmb={hasSmb}
        hasProwlarr={hasProwlarr}
        permissions={permissions}
        isAdmin={isAdmin}
        onTabChange={setActiveTab}
      />

      <div className="transition-all duration-300">
        {activeTab === 'qbit' && permissions.canReadTorrents ? (
          <QbitPanel permissions={permissions} hasProwlarr={hasProwlarr} />
        ) : activeTab === 'smb' && hasSmb && permissions.canReadExplorer ? (
          <SmbPanel permissions={permissions} />
        ) : activeTab === 'prowlarr' && permissions.canInteractiveSearch ? (
          <ProwlarrPanel hasProwlarr={hasProwlarr} isAdmin={isAdmin} permissions={permissions} />
        ) : null}
      </div>
    </div>
  )
}
