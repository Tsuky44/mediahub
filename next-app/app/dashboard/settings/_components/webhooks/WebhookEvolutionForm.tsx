'use client'

import { WebhookTemplatesList } from './WebhookTemplatesList'
import { getDefaultEvolutionTemplate } from '../../_utils/webhook-templates'
import type { Webhook } from '../../_types/webhook'

interface WebhookEvolutionFormProps {
  webhook: Webhook
  onUpdate: (field: string, value: string | boolean) => void
  onUpdateTemplate: (eventId: string, value: string) => void
  onToggleImage: (eventId: string) => void
}

const TEMPLATE_HELP = 'Variables: {title}, {message}, {year}, {overview}, {rating}, {genres}, {user}, {quality}, {size}, {indexer}, {release}, {poster}. Format autorisé (*gras*, _italique_).'

export function WebhookEvolutionForm({
  webhook,
  onUpdate,
  onUpdateTemplate,
  onToggleImage,
}: WebhookEvolutionFormProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          URL de l&apos;API (ex: https://evo.tondomaine.com)
        </label>
        <input
          type="url"
          value={webhook.evolutionUrl || ''}
          onChange={e => onUpdate('evolutionUrl', e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Nom de l&apos;instance</label>
        <input
          type="text"
          value={webhook.evolutionInstance || ''}
          onChange={e => onUpdate('evolutionInstance', e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          placeholder="Ex: mediahub-bot"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Global API Key</label>
        <input
          type="password"
          value={webhook.evolutionApiKey || ''}
          onChange={e => onUpdate('evolutionApiKey', e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          placeholder="Votre clé API"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Numéro WhatsApp destinataire (fallback)
        </label>
        <input
          type="text"
          value={webhook.whatsappNumber || ''}
          onChange={e => onUpdate('whatsappNumber', e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          placeholder="Ex: 33612345678 (sans + ni espace)"
        />
        <p className="text-xs text-gray-500 mt-1">
          Utilisé si le destinataire fixe n&apos;a pas de numéro WhatsApp dans son profil.
        </p>
      </div>
      <WebhookTemplatesList
        webhook={webhook}
        getDefaultTemplate={getDefaultEvolutionTemplate}
        onUpdateTemplate={onUpdateTemplate}
        onToggleImage={onToggleImage}
        helpText={TEMPLATE_HELP}
      />
    </>
  )
}
