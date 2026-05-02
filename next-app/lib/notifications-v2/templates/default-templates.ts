import type { NotificationEvent } from '../types'
import { NOTIFICATION_EVENTS } from '../types'

/**
 * Default message templates per event.
 * Placeholders: {title} {year} {user} {overview} {genres} {rating}
 *               {quality} {size} {mediaType} {reason}
 */
export const DEFAULT_TEMPLATES: Record<NotificationEvent, string> = {
  [NOTIFICATION_EVENTS.MEDIA_REQUESTED]:
    '🎬 *Nouvelle demande*\n\n' +
    '📌 *{title}* ({year})\n' +
    '👤 Demandé par : {user}\n' +
    '⭐ Note : {rating}\n' +
    '🎭 Genres : {genres}\n\n' +
    '📖 {overview}',

  [NOTIFICATION_EVENTS.MEDIA_APPROVED]:
    '✅ *Demande approuvée*\n\n' +
    '📌 *{title}* ({year})\n' +
    '👤 {user}',

  [NOTIFICATION_EVENTS.MEDIA_GRABBED]:
    '🎯 *Release trouvée*\n\n' +
    '📌 *{title}* ({year})\n' +
    '🏷️ Qualité : {quality}\n' +
    '💾 Taille : {size}\n' +
    '📦 {release}\n\n' +
    '_Téléchargement va démarrer..._',

  [NOTIFICATION_EVENTS.MEDIA_DOWNLOADING]:
    '⬇️ *Téléchargement en cours*\n\n' +
    '📌 *{title}* ({year})\n' +
    '🏷️ Qualité : {quality}\n' +
    '💾 Taille : {size}\n' +
    '📦 {release}',

  [NOTIFICATION_EVENTS.MEDIA_DOWNLOAD_COMPLETE]:
    '✅ *Téléchargement terminé*\n\n' +
    '📌 *{title}* ({year})\n' +
    '🏷️ Qualité : {quality}\n' +
    '💾 Taille : {size}\n\n' +
    "_En attente de l'import..._",

  [NOTIFICATION_EVENTS.MEDIA_IMPORTING]:
    '📥 *Téléchargement terminé*\n\n' +
    '📌 *{title}* ({year})\n' +
    '🏷️ Qualité : {quality}\n' +
    '💾 Taille : {size}\n\n' +
    "_En cours d'import sur le serveur..._",

  [NOTIFICATION_EVENTS.MEDIA_AVAILABLE]:
    '🍿 *Disponible sur le serveur*\n\n' +
    '📌 *{title}* ({year})\n' +
    '👤 {user}\n\n' +
    '📖 {overview}',

  [NOTIFICATION_EVENTS.MEDIA_FAILED]:
    '⚠️ *Échec*\n\n' +
    '📌 *{title}* ({year})\n' +
    '❌ Raison : {reason}',
}
