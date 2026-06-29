import type { NotificationEventPayload, EventRouteConfig } from '../types'
import { DEFAULT_TEMPLATES } from './default-templates'

/**
 * Replaces {placeholders} in a template with payload values.
 * Pure function — easy to test, no side effects.
 */
export class TemplateRenderer {
  /**
   * Rend le message à partir du payload et de la config de route.
   * Choisit le template `templateMovie` ou `templateTv` selon `payload.media.mediaType`.
   * Fallback : `route.template` (legacy) → template par défaut.
   */
  static render(payload: NotificationEventPayload, route?: EventRouteConfig | string): string {
    const isTv = payload.media.mediaType === 'tv'
    let template = ''

    if (typeof route === 'string') {
      // Backward-compat : ancienne signature qui passait directement la string
      template = route
    } else if (route) {
      const variant = isTv ? route.templateTv : route.templateMovie
      if (variant && variant.trim().length > 0) {
        template = variant
      } else if (route.template && route.template.trim().length > 0) {
        const movieCustomized = !!(route.templateMovie && route.templateMovie.trim().length > 0)
        if (isTv) {
          // Pour les séries, on n'utilise le template legacy que si le template film n'a PAS été personnalisé
          // (ce qui indique une ancienne config globale partagée). Sinon, on préfère le template TV par défaut.
          if (!movieCustomized) {
            template = route.template
          }
        } else {
          // Pour les films, si templateMovie est vide, on peut utiliser route.template (legacy)
          template = route.template
        }
      }
    }

    if (!template || template.trim().length === 0) {
      const defaults = DEFAULT_TEMPLATES[payload.event]
      template = isTv ? defaults.tv : defaults.movie
    }

    const vars = this.buildVars(payload)
    return this.interpolate(template, vars)
  }

  private static buildVars(p: NotificationEventPayload): Record<string, string> {
    const progress = p.download?.progress
    const progressPercent = progress != null ? Math.round(progress * 100) + '%' : 'N/A'

    const seasonNumber = p.media.seasonNumber
    const seasonStr = seasonNumber != null ? `S${String(seasonNumber).padStart(2, '0')}` : ''

    const episodeNumber = (p.media as any).episodeNumber
    const episodeStr = episodeNumber != null ? `E${String(episodeNumber).padStart(2, '0')}` : ''

    // Episode batch placeholders (from payload if present)
    const episodesDownloaded = (p as any).episodesDownloaded as number[] | undefined
    const episodesFailed = (p as any).episodesFailed as number[] | undefined
    const episodesImported = (p as any).episodesImported as number[] | undefined
    const episodesAvailable = (p as any).episodesAvailable as number[] | undefined
    const totalEpisodes = (p as any).totalEpisodes as number | undefined

    const formatEpisodes = (eps?: number[]) => {
      if (!eps || eps.length === 0) return ''
      return eps.map(e => `E${e}`).join(',')
    }

    return {
      title: String(p.media.title ?? ''),
      year: p.media.year != null ? String(p.media.year) : '',
      mediaType: p.media.mediaType === 'tv' ? 'Série' : 'Film',
      overview: String(p.media.overview ?? '').trim() || '_Aucun résumé_',
      genres: String(p.media.genres ?? '') || 'N/A',
      rating: p.media.rating != null ? String(p.media.rating) : 'N/A',
      season: seasonStr,
      seasonNumber: seasonNumber != null ? String(seasonNumber) : '',
      episode: episodeStr,
      episodeNumber: episodeNumber != null ? String(episodeNumber) : '',
      user: p.requester?.name || p.requester?.email || 'inconnu',
      userEmail: p.requester?.email ?? '',
      userWhatsapp: p.requester?.whatsappNumber ?? '',
      quality: p.download?.quality ?? 'N/A',
      size: p.download?.size ?? 'N/A',
      release: p.download?.releaseName ?? '',
      releaseName: p.download?.releaseName ?? '',
      progress: progressPercent,
      progressRaw: progress != null ? String(progress) : 'N/A',
      reason: p.failure?.reason ?? '',
      stage: p.failure?.stage ?? '',
      correlationId: p.correlationId,
      event: p.event,
      timestamp: p.timestamp,
      episodesDownloaded: formatEpisodes(episodesDownloaded),
      episodesFailed: formatEpisodes(episodesFailed),
      episodesImported: formatEpisodes(episodesImported),
      episodesAvailable: formatEpisodes(episodesAvailable),
      totalEpisodes: totalEpisodes != null ? String(totalEpisodes) : '',
    }
  }

  private static interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
  }
}
