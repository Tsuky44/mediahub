'use client'

import { WebhookTemplatesList } from './WebhookTemplatesList'
import { getDefaultDiscordTemplate } from '../../_utils/webhook-templates'
import type { Webhook } from '../../_types/webhook'

interface WebhookDiscordFormProps {
  webhook: Webhook
  onUpdate: (field: string, value: string | boolean) => void
  onUpdateTemplate: (eventId: string, value: string) => void
  onToggleImage: (eventId: string) => void
}

const TEMPLATE_HELP = 'Variables: {title}, {message}, {year}, {overview}, {rating}, {genres}, {user}, {quality}, {size}, {indexer}, {release}, {poster}. Laisser vide pour le format par défaut.'

export function WebhookDiscordForm({
  webhook,
  onUpdate,
  onUpdateTemplate,
  onToggleImage,
}: WebhookDiscordFormProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          URL du Webhook Discord
        </label>
        <input
          type="url"
          value={webhook.url || ''}
          onChange={e => onUpdate('url', e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          placeholder="https://discord.com/api/webhooks/..."
        />
      </div>
      <WebhookTemplatesList
        webhook={webhook}
        getDefaultTemplate={getDefaultDiscordTemplate}
        onUpdateTemplate={onUpdateTemplate}
        onToggleImage={onToggleImage}
        helpText={TEMPLATE_HELP}
      />
    </>
  )
}
