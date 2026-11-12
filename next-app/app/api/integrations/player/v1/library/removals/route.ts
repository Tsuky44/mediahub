import { NextResponse } from 'next/server'
import { apiError, authenticate, parseMediaType } from '@/lib/integrations/player-v1'
import { forgetMedia, ForgetError } from '@/lib/services/media-forget'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * Onyx va supprimer un titre (ou une saison) de son disque : { tmdbId, mediaType, season? }.
 * MediaHub le retire de sorraa ou de Radarr/Sonarr, sans toucher aux fichiers, et supprime ses
 * demandes. Onyx n'efface ses fichiers qu'apres un 200 : un 502 veut dire que le gestionnaire
 * le suit encore et le retelechargerait.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  if (auth.ability.cannot('delete_media', 'Stats') && auth.user.role !== 'admin') return apiError(403, 'Forbidden')

  const body = await request.json().catch(() => null) as { tmdbId?: unknown; mediaType?: unknown; season?: unknown } | null
  const tmdbId = Number(body?.tmdbId)
  const mediaType = parseMediaType(body?.mediaType)
  const season = body?.season === undefined || body?.season === null ? undefined : Number(body.season)
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !mediaType ||
      (season !== undefined && (!Number.isInteger(season) || season < 0 || mediaType !== 'tv'))) {
    return apiError(400, 'Missing parameters')
  }

  try {
    const outcome = await forgetMedia({ tmdbId, mediaType, season, deleteFiles: false })
    await logAction(auth.userId, 'STORAGE_DELETE', 'Media', String(tmdbId), { via: 'player-api', mediaType, season, ...outcome })
    return NextResponse.json(outcome)
  } catch (e) {
    if (e instanceof ForgetError) return apiError(502, e.message, 'manager_failed')
    throw e
  }
}
