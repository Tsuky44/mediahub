import type { MediaWatchState } from '@/components/global/media-card/useMediaCardActions'
import type { OnyxLibraryItem } from '@/lib/services/onyx-directory'
import type { EmbyItem } from '@/types/emby'

/**
 * Progression d'un titre Onyx pour le compte lié. Une série ne compte que les épisodes présents
 * sur le disque (Onyx ignore ceux que TMDB annonce sans fichier) ; une série jamais commencée n'a
 * pas de pastille, sinon chaque affiche porterait son nombre d'épisodes.
 */
export function onyxWatchState(item: OnyxLibraryItem): MediaWatchState | undefined {
  if (item.type === 'movie') {
    if (item.is_finished) return { watched: true }
    const position = item.current_position_seconds ?? 0
    const duration = item.duration ?? 0
    return position > 0 && duration > 0 ? { watched: false, progress: position / duration } : undefined
  }
  const available = item.available_episode_count ?? 0
  const watched = item.watched_episode_count ?? 0
  const started = item.started_episode_count ?? 0
  if (available <= 0 || (watched === 0 && started === 0)) return undefined
  if (watched >= available) return { watched: true }
  return { watched: false, progress: watched / available, remaining: available - watched }
}

/**
 * Même pastille pour Emby et Jellyfin, à partir des données du compte (UserData) : « vu » et
 * l'avancement d'un film. Les épisodes restants d'une série ne sont pas lus ici : la liste ne dit
 * pas si la série est commencée.
 */
export function embyWatchState(item: EmbyItem): MediaWatchState | undefined {
  const data = item.UserData
  if (!data) return undefined
  if (data.Played) return { watched: true }
  const percent = item.Type === 'Movie' && typeof data.PlayedPercentage === 'number' ? data.PlayedPercentage : 0
  return percent > 0 ? { watched: false, progress: percent / 100 } : undefined
}
