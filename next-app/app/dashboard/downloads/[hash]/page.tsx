import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { notFound, redirect } from 'next/navigation'
import { getQBittorrentService } from '@/lib/services/qbittorrent'
import { getTorrentDetails, getTorrentPageUrl, getTrackerInfo } from './actions'
import { TorrentDetailsHeader } from './_components/TorrentDetailsHeader'
import { MediaInfoCard } from './_components/MediaInfoCard'
import { TorrentInfoCard } from './_components/TorrentInfoCard'
import { TorrentSidebar } from './_components/TorrentSidebar'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface TorrentDetailsPageProps {
  params: Promise<{ hash: string }>
}

export default async function TorrentDetailsPage({ params }: TorrentDetailsPageProps) {
  const { hash } = await params

  // Check authentication
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user) {
    redirect('/login')
  }

  const ability = defineAbilityFor(user)

  if (ability.cannot('read', 'Downloads')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-8">
        <div className="p-6 rounded-3xl bg-red-500/10 text-red-500 border border-red-500/20">
          <FileQuestion size={64} />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-3xl font-bold text-white">Accès restreint</h2>
          <p className="text-gray-400 text-lg">
            Vous n&apos;avez pas les permissions nécessaires pour consulter les détails des torrents.
          </p>
        </div>
        <Link
          href="/dashboard/downloads"
          className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux téléchargements</span>
        </Link>
      </div>
    )
  }

  // Get torrent details
  const data = await getTorrentDetails(hash)

  if (!data) {
    notFound()
  }

  const { torrent, parsed, mediaInfo } = data

  // Get tracker info - handle empty or multiple trackers
  let rawTracker = torrent.tracker || ''

  if (!rawTracker) {
    try {
      const qbtService = await getQBittorrentService()
      if (qbtService) {
        const trackers = await qbtService.getTorrentTrackers(torrent.hash)
        const validTracker = trackers?.find(t =>
          t.url &&
          !t.url.includes('dht') &&
          !t.url.includes('pex') &&
          !t.url.includes('lsd') &&
          !t.url.includes('**') &&
          t.tier >= 0
        )
        if (validTracker) {
          rawTracker = validTracker.url
        }
      }
    } catch (e) {
      console.error('Failed to get trackers from API:', e)
    }
  }

  const firstTracker = rawTracker.split(/[\n,]/)[0].trim()
  const trackerInfo = firstTracker ? await getTrackerInfo(firstTracker) : null
  const trackerName = trackerInfo?.name || 'Inconnu'

  const torrentPageUrl = await getTorrentPageUrl(torrent.hash, torrent.name, torrent.size, firstTracker)
  const trackerUrl = torrentPageUrl || trackerInfo?.baseUrl || null

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-300">
      <TorrentDetailsHeader torrent={torrent} parsed={parsed} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {mediaInfo ? (
              <MediaInfoCard mediaInfo={mediaInfo} torrentHash={torrent.hash} parsed={parsed} />
            ) : (
              <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-8 text-center">
                <FileQuestion className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">Informations non disponibles</h3>
                <p className="text-sm text-gray-500">
                  Impossible de trouver des informations sur ce média. Les données seront mises à jour automatiquement lors de l&apos;indexation.
                </p>
              </div>
            )}
            <TorrentInfoCard torrent={torrent} parsed={parsed} />
          </div>

          <TorrentSidebar
            torrent={torrent}
            trackerName={trackerName}
            trackerUrl={trackerUrl}
            torrentPageUrl={torrentPageUrl}
            firstTracker={firstTracker}
          />
        </div>
      </div>
    </div>
  )
}
