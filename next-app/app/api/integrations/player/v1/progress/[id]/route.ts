import { NextResponse } from 'next/server'
import { apiError, authenticate, parseId, parseMediaType } from '@/lib/integrations/player-v1'
import { getTmdbServiceForUser } from '@/lib/auth'
import { checkDownloadStatus } from '@/app/dashboard/media/[id]/download-status-actions'

export const dynamic = 'force-dynamic'

/**
 * Suivi d'un titre : le telechargement et l'import que montrent les widgets de
 * la fiche (Radarr/Sonarr ou sorraa). Meme source que l'interface, mise en
 * forme pour Onyx. `active` vaut false quand rien n'est en cours.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  if (auth.ability.cannot('read', 'Media')) return apiError(403, 'Forbidden')

  const tmdbId = parseId((await params).id)
  const mediaType = parseMediaType(new URL(request.url).searchParams.get('type'))
  if (!tmdbId || !mediaType) return apiError(400, 'Invalid media')

  // Sonarr ne connait une serie que par son identifiant TVDB.
  let tvdbId: number | undefined
  if (mediaType === 'tv') {
    const tmdb = await getTmdbServiceForUser()
    const externalIds = tmdb ? await tmdb.getExternalIds('tv', tmdbId).catch(() => null) : null
    tvdbId = externalIds?.tvdb_id ?? undefined
  }

  const status = await checkDownloadStatus(tmdbId, mediaType, tvdbId)
  const imports = status?.imports ?? []
  const downloading = status?.isDownloading === true
  if (!status || (!downloading && imports.length === 0)) {
    return NextResponse.json({ active: false, downloading: false, download: null, imports: [] })
  }

  return NextResponse.json({
    active: true,
    downloading,
    download: downloading
      ? {
          progress: status.progress,
          timeleft: status.timeleft || null,
          speed: status.speed ?? null,
          size: status.size || null,
          sizeLeft: status.sizeLeft || null,
          releaseTitle: status.releaseTitle ?? null,
        }
      : null,
    imports: imports.map((item) => ({
      releaseName: item.releaseName,
      progress: item.progress,
      files: item.files,
      filesDone: item.filesDone,
      size: item.size,
      sizeDone: item.sizeDone,
      sizeLeft: item.sizeLeft,
      current: item.current ?? null,
      failed: item.failed,
      message: item.message ?? null,
    })),
  })
}
