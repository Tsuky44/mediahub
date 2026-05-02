'use client'

interface StorageProtocolSelectorProps {
  protocol: string
  onChange: (protocol: string) => void
}

export function StorageProtocolSelector({ protocol, onChange }: StorageProtocolSelectorProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-2">Protocole</label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange('smb')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            protocol === 'smb'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          SMB
        </button>
        <button
          type="button"
          onClick={() => onChange('ftp')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            protocol === 'ftp'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          FTP
        </button>
      </div>
    </div>
  )
}
