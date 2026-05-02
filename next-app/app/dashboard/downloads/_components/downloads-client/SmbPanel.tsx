'use client'

import FileManager from '../FileManager'

interface SmbPanelProps {
  permissions: {
    canShareFiles: boolean
    canDeleteFiles: boolean
  }
}

export function SmbPanel({ permissions }: SmbPanelProps) {
  return (
    <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl">
      <FileManager
        canDownload={true}
        canShare={permissions.canShareFiles}
        canDelete={permissions.canDeleteFiles}
      />
    </div>
  )
}
