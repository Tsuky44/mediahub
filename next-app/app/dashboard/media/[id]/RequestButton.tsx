'use client'

import { useState } from 'react'
import { useRequestStatus } from './_components/request/useRequestStatus'
import { RequestErrorMessage, RequestStatusButton } from './_components/request/RequestStatusButton'
import { SeasonSelectorModal } from './_components/SeasonSelectorModal'
import { useRouter } from 'next/navigation'
import { requestAllSeasons } from './actions'
import { DownloadStatusModal } from './_components/DownloadStatusModal'

interface RequestButtonProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
  initialStatus: string
  /** Date de sortie attendue quand le média demandé n'est pas encore sorti */
  releaseDate?: string
  seasons?: any[]
  seasonStatuses?: any[]
  canRequest?: boolean
  requestAllSeasonsEnabled?: boolean
  tvdbId?: number
  /** Plateforme de connexion de l'utilisateur, nommée dans « Disponible sur … » */
  platformName: string
  /** Place du bouton dans la rangée d'actions (le message d'erreur est rendu à côté, pas dedans) */
  className?: string
}

export default function RequestButton({
  tmdbId,
  mediaType,
  title,
  initialStatus,
  releaseDate,
  seasons,
  seasonStatuses,
  canRequest = false,
  requestAllSeasonsEnabled = false,
  tvdbId,
  platformName,
  className,
}: RequestButtonProps) {
  const router = useRouter()
  const [showStatusModal, setShowStatusModal] = useState(false)

  const { status, phase, error, showSeasonModal, setShowSeasonModal, setStatus, submit, sendRequest } = useRequestStatus(
    tmdbId,
    mediaType,
    title,
    initialStatus
  )

  const isTv = mediaType === 'tv'
  const hasUnrequestedSeasons = !!(
    isTv && seasonStatuses && seasonStatuses.some((s: any) => s.seasonNumber > 0 && s.status === 'unknown')
  )

  const handlePrimaryClick = async () => {
    // If requestAllSeasonsEnabled is true, request all seasons automatically without showing modal
    if (isTv && requestAllSeasonsEnabled && seasons && seasons.length > 0) {
      const allSeasonNumbers = seasons
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => s.season_number)
      
      if (allSeasonNumbers.length === 0) return

      await submit(async () => {
        const result = await requestAllSeasons(tmdbId, title, allSeasonNumbers)
        return { ok: result.success, message: result.message }
      })
      return
    }

    // Normal flow - show season selector or send request
    if (isTv && seasons && seasons.length > 0) {
      setShowSeasonModal(true)
      return
    }

    if (status !== 'not_available' && status !== 'unknown') return

    await sendRequest()
  }

  return (
    <>
      <div className={className}>
        <RequestStatusButton
          status={status}
          releaseDate={releaseDate}
          phase={phase}
          canRequest={canRequest}
          hasUnrequestedSeasons={hasUnrequestedSeasons}
          isTv={isTv}
          platformName={platformName}
          onPrimaryClick={handlePrimaryClick}
          onSeasonClick={() => setShowSeasonModal(true)}
          onStatusClick={() => setShowStatusModal(true)}
        />

        <DownloadStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          tmdbId={tmdbId}
          mediaType={mediaType}
          tvdbId={tvdbId}
          title={title}
          mediaStatus={status}
          releaseDate={releaseDate}
        />
        {isTv && seasons && seasonStatuses && (
          <SeasonSelectorModal
            isOpen={showSeasonModal}
            onClose={() => setShowSeasonModal(false)}
            title={title}
            tmdbId={tmdbId}
            seasons={seasons}
            seasonStatuses={seasonStatuses}
            onSuccess={() => {
              if (status === 'not_available' || status === 'unknown') {
                setStatus('processing')
              }
              router.refresh()
            }}
          />
        )}
      </div>
      <RequestErrorMessage status={status} phase={phase} error={error} />
    </>
  )
}
