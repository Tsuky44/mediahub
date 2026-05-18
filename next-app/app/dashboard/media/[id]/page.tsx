import { notFound, redirect } from 'next/navigation'
import { isExternalMediaId, resolveExternalItem } from './_services/external-item-resolver'
import { loadMediaPageData } from './_services/media-page-data'
import { MediaPageContent } from './_components/page/MediaPageContent'
import { AccessDeniedFallback } from './_components/page/AccessDeniedFallback'
import { ExternalMediaFallback } from './_components/page/ExternalMediaFallback'

export const dynamic = 'force-dynamic'

export default async function MediaDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string; source?: string; name?: string }>
}) {
  const { id } = await params
  const { type, source, name } = await searchParams
  const mediaType = (type as 'movie' | 'tv') || 'movie'

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
  if (isNaN(tmdbId)) notFound()

  const result = await loadMediaPageData({ tmdbId, mediaType, externalId: id })

  if (result.kind === 'not-found') notFound()
  if (result.kind === 'access-denied') return <AccessDeniedFallback />

  return (
    <MediaPageContent
      data={result.data}
      id={id}
      tmdbId={tmdbId}
      mediaType={mediaType}
    />
  )
}

