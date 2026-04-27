'use client'

interface NotificationsHeaderProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

export default function NotificationsHeader({
  enabled,
  onToggle,
}: NotificationsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold">Notifications V2 (indépendant)</h2>
        <p className="text-sm text-gray-500">
          Système autonome basé sur des événements internes, sans webhooks
          Radarr/Sonarr.
        </p>
      </div>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-5 w-5"
        />
        <span className="font-medium">Activer le module</span>
      </label>
    </div>
  )
}
