import type { NotificationEventPayload } from '../types'
import { DEFAULT_TEMPLATES } from './default-templates'

/**
 * Replaces {placeholders} in a template with payload values.
 * Pure function — easy to test, no side effects.
 */
export class TemplateRenderer {
  static render(payload: NotificationEventPayload, customTemplate?: string): string {
    const template =
      customTemplate && customTemplate.trim().length > 0
        ? customTemplate
        : DEFAULT_TEMPLATES[payload.event]

    const vars = this.buildVars(payload)
    return this.interpolate(template, vars)
  }

  private static buildVars(p: NotificationEventPayload): Record<string, string> {
    const progress = p.download?.progress
    const progressPercent = progress != null ? Math.round(progress * 100) + '%' : 'N/A'

    return {
      title: String(p.media.title ?? ''),
      year: p.media.year != null ? String(p.media.year) : '',
      mediaType: p.media.mediaType === 'tv' ? 'Série' : 'Film',
      overview: String(p.media.overview ?? '').trim() || '_Aucun résumé_',
      genres: String(p.media.genres ?? '') || 'N/A',
      rating: p.media.rating != null ? String(p.media.rating) : 'N/A',
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
    }
  }

  private static interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
  }
}
