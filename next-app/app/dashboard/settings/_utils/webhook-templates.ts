import type { WebhookEvent } from '../_types/webhook'

/** Liste des types d'evenements declencheurs pour les webhooks. */
export const WEBHOOK_EVENT_TYPES: WebhookEvent[] = [
    { id: 'media_request', label: 'Nouvelle demande de média (Utilisateur)' },
    { id: 'request_approved', label: 'Demande de média approuvée (Admin)' },
    { id: 'media_grabbed', label: 'Média envoyé au téléchargement (Grab)' },
    { id: 'media_downloaded', label: 'Téléchargement terminé (Download)' },
    { id: 'media_available', label: 'Média disponible sur le serveur (Emby)' },
    { id: 'media_deleted', label: 'Média supprimé du serveur' },
    { id: 'account_request', label: 'Nouvelle demande de compte' },
    { id: 'user_created', label: 'Nouvel utilisateur créé' },
]

export function getEventLabel(eventId: string): string {
    return WEBHOOK_EVENT_TYPES.find(e => e.id === eventId)?.label || eventId
}

/** Template WhatsApp (Evolution API) par defaut selon l'evenement. */
export function getDefaultEvolutionTemplate(eventId: string): string {
    switch (eventId) {
        case 'media_request':
            return '🎬 *Nouvelle Demande de Média*\n\n👤 *Demandé par:* {user}\n📌 *Titre:* {title} ({year})\n🎭 *Genres:* {genres}\n⭐ *Note:* {rating}\n\n📖 *Synopsis:*\n{overview}'
        case 'media_grabbed':
            return '🎬 *{title}*\n\n📥 Envoi au téléchargement\n\n*Résumé:*\n{overview}\n\n⭐ *Note:* {rating}\n👤 *Demandé par:* {user}'
        case 'media_downloaded':
            return "🎬 *{title}*\n\n✅ Téléchargement terminé\n\nLe fichier est en cours d'importation..."
        case 'media_available':
        case 'request_approved':
            return '🎬 *{title}*\n\n🍿 Disponible sur le serveur !\n\n*Résumé:*\n{overview}\n\n⭐ *Note:* {rating}\n👤 *Demandé par:* {user}\n\n🏷️ *Qualité:* {quality}\n💾 *Taille:* {size}'
        case 'media_deleted':
            return '🎬 *{title}*\n\n🗑️ Média Supprimé du serveur.'
        default:
            return '🎬 *{title}*\n\n{message}'
    }
}

/** Template Discord par defaut selon l'evenement. */
export function getDefaultDiscordTemplate(eventId: string): string {
    switch (eventId) {
        case 'media_request':
            return '**Nouvelle Demande de Média**\n\n👤 Demandé par : {user}\n📌 Titre : **{title}** ({year})\n🎭 Genres : {genres}\n⭐ Note : {rating}/10\n\n📖 **Synopsis :**\n{overview}'
        case 'media_grabbed':
            return '**{title}** a été trouvé !\n\n📥 Envoi au client de téléchargement en cours...\n\nDemandé par : {user}'
        case 'media_downloaded':
            return '**{title}** a été téléchargé !\n\n✅ Importation en cours sur le serveur...'
        case 'media_available':
        case 'request_approved':
            return "**{title}** est maintenant disponible !\n\n{overview}\n\n🎬 {year} | ⭐ {rating}/10\nDemandé par : {user}"
        case 'media_deleted':
            return "**{title}** a été supprimé du serveur.\n\n🗑️ Libération d'espace effectuée."
        default:
            return '**{title}**\n\n{message}'
    }
}
