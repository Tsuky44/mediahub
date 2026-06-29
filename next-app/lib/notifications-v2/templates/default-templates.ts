import type { NotificationEvent } from '../types'
import { NOTIFICATION_EVENTS } from '../types'

export interface TemplateVariants {
  movie: string
  tv: string
}

/**
 * Default message templates per event, déclinés en variants movie / tv.
 * Placeholders communs : {title} {year} {user} {overview} {genres} {rating}
 *                        {quality} {size} {mediaType} {reason}
 * Spécifique TV       : {season} (ex: "S01") — vide pour les films.
 */
export const DEFAULT_TEMPLATES: Record<NotificationEvent, TemplateVariants> = {
  [NOTIFICATION_EVENTS.MEDIA_REQUESTED]: {
    movie:
      '🎬 *Nouvelle demande*\n\n' +
      '📌 *{title}* ({year})\n' +
      '👤 Demandé par : {user}\n' +
      '⭐ Note : {rating}\n' +
      '� Genres : {genres}\n\n' +
      '📖 {overview}',
    tv:
      '� *Nouvelle demande*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '👤 Demandé par : {user}\n' +
      '⭐ Note : {rating}\n' +
      '🎭 Genres : {genres}\n\n' +
      '📖 {overview}',
  },

  [NOTIFICATION_EVENTS.MEDIA_APPROVED]: {
    movie:
      '✅ *Demande approuvée*\n\n' +
      '📌 *{title}* ({year})\n' +
      '👤 {user}',
    tv:
      '✅ *Demande approuvée*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '👤 {user}',
  },

  [NOTIFICATION_EVENTS.MEDIA_GRABBED]: {
    movie:
      '🎯 *Release trouvée*\n\n' +
      '📌 *{title}* ({year})\n' +
      '🏷️ Qualité : {quality}\n' +
      '💾 Taille : {size}\n' +
      '📦 {release}\n\n' +
      '_Téléchargement va démarrer..._',
    tv:
      '🎯 *Release trouvée*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '🏷️ Qualité : {quality}\n' +
      '💾 Taille : {size}\n' +
      '📦 {release}\n\n' +
      '_Téléchargement va démarrer..._',
  },

  [NOTIFICATION_EVENTS.MEDIA_DOWNLOADING]: {
    movie:
      '⬇️ *Téléchargement en cours*\n\n' +
      '📌 *{title}* ({year})\n' +
      '🏷️ Qualité : {quality}\n' +
      '💾 Taille : {size}\n' +
      '📦 {release}',
    tv:
      '⬇️ *Téléchargement en cours*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '🏷️ Qualité : {quality}\n' +
      '💾 Taille : {size}\n' +
      '📦 {release}',
  },

  [NOTIFICATION_EVENTS.MEDIA_DOWNLOAD_COMPLETE]: {
    movie:
      '✅ *Téléchargement terminé*\n\n' +
      '📌 *{title}* ({year})\n' +
      '🏷️ Qualité : {quality}\n' +
      '💾 Taille : {size}\n\n' +
      "_En attente de l'import..._",
    tv:
      '✅ *Téléchargement terminé*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '🏷️ Qualité : {quality}\n' +
      '💾 Taille : {size}\n\n' +
      "_En attente de l'import..._",
  },

  [NOTIFICATION_EVENTS.MEDIA_IMPORTING]: {
    movie:
      '📥 *Téléchargement terminé*\n\n' +
      '📌 *{title}* ({year})\n' +
      '🏷️ Qualité : {quality}\n' +
      '💾 Taille : {size}\n\n' +
      "_En cours d'import sur le serveur..._",
    tv:
      '📥 *Téléchargement terminé*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '🏷️ Qualité : {quality}\n' +
      '💾 Taille : {size}\n\n' +
      "_En cours d'import sur le serveur..._",
  },

  [NOTIFICATION_EVENTS.MEDIA_AVAILABLE]: {
    movie:
      '🍿 *Disponible sur le serveur*\n\n' +
      '📌 *{title}* ({year})\n' +
      '👤 {user}\n\n' +
      '📖 {overview}',
    tv:
      '🍿 *Disponible sur le serveur*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '👤 {user}\n\n' +
      '📖 {overview}',
  },

  [NOTIFICATION_EVENTS.SEASON_PARTIALLY_AVAILABLE]: {
    movie:
      '📺 *Saison partiellement disponible*\n\n' +
      '📌 *{title}* ({year})\n' +
      '👤 {user}\n\n' +
      'Certains épisodes sont manquants.',
    tv:
      '📺 *Saison partiellement disponible*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '👤 {user}\n\n' +
      'Certains épisodes sont manquants.',
  },

  [NOTIFICATION_EVENTS.EPISODE_AVAILABLE]: {
    movie: '',
    tv:
      '📺 *Nouvel épisode disponible*\n\n' +
      '📌 *{title}* ({year}) - {season}{episode}\n' +
      '👤 {user}\n\n' +
      '📖 {overview}',
  },

  [NOTIFICATION_EVENTS.MEDIA_FAILED]: {
    movie:
      '⚠️ *Échec*\n\n' +
      '📌 *{title}* ({year})\n' +
      '❌ Raison : {reason}',
    tv:
      '⚠️ *Échec*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '❌ Raison : {reason}',
  },

  [NOTIFICATION_EVENTS.SEASON_DOWNLOAD_COMPLETE]: {
    movie: '',
    tv:
      '✅ *Saison terminée*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '📥 Épisodes téléchargés : {episodesDownloaded}/{totalEpisodes}\n' +
      '{episodesFailed && ⚠️ Échecs : {episodesFailed}}',
  },

  [NOTIFICATION_EVENTS.SEASON_IMPORT_COMPLETE]: {
    movie: '',
    tv:
      '📥 *Importation terminée*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '📥 Épisodes importés : {episodesImported}/{totalEpisodes}',
  },

  [NOTIFICATION_EVENTS.SEASON_AVAILABLE]: {
    movie: '',
    tv:
      '🍿 *Saison disponible*\n\n' +
      '📌 *{title}* ({year}) {season}\n' +
      '📺 Épisodes disponibles : {episodesAvailable}/{totalEpisodes}\n' +
      '👤 {user}',
  },
}
