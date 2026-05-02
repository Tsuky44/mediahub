import { notFound, redirect } from 'next/navigation'
import {
  isExternalMediaId,
  resolveExternalItem,
} from './_services/external-item-resolver'
import { loadMediaPageData } from './_services/media-page-data'
import type { MediaSearchParams, MediaType } from './_types/media-page'
import { ExternalMediaFallback } from './_components/page/ExternalMediaFallback'
import { AccessDeniedFallback } from './_components/page/AccessDeniedFallback'
import { MediaPageContent } from './_components/page/MediaPageContent'

export const dynamic = 'force-dynamic'

export default async function MediaDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<MediaSearchParams>
}) {
  const { id } = await params
  const { type, source, name } = await searchParams
  const mediaType: MediaType = (type as MediaType) || 'movie'

  if (isExternalMediaId(id, source)) {
    const resolution = await resolveExternalItem({ id, source, name })
    if (resolution.kind === 'redirect') {
      redirect(`/dashboard/media/${resolution.tmdbId}?type=${resolution.mediaType}`)
    }
    return (
      <ExternalMediaFallback
        providerName={resolution.providerName}
        itemName={resolution.itemName}
        id={id}
      />
    )
  }

  const tmdbId = parseInt(id)
  if (isNaN(tmdbId)) {
    notFound()
  }

  const result = await loadMediaPageData({ tmdbId, mediaType, externalId: id })

  if (result.kind === 'not-found') {
    notFound()
  }

  if (result.kind === 'access-denied') {
    return <AccessDeniedFallback />
  }

  return <MediaPageContent data={result.data} id={id} tmdbId={tmdbId} mediaType={mediaType} />
}

