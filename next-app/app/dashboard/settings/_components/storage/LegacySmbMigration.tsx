'use client'

interface LegacySmbMigrationProps {
  hasLegacy: boolean
  onMigrate: () => void
}

export function LegacySmbMigration({ hasLegacy, onMigrate }: LegacySmbMigrationProps) {
  if (!hasLegacy) return null

  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-6">
      <p className="text-amber-400 text-sm mb-2">
        ⚠️ Configuration SMB legacy détectée
      </p>
      <button
        onClick={onMigrate}
        className="text-sm text-indigo-400 hover:text-indigo-300"
      >
        Migrer vers la nouvelle configuration →
      </button>
    </div>
  )
}
