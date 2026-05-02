'use client'

import { Download, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatSize } from './_utils/formatSize'

interface Release {
  guid: string
  indexer: string
  indexerId: number
  publishDate: string
  title: string
  size: number
  seeders: number
  leechers: number
  languages?: { name: string }[]
  quality: { quality: { name: string } }
}

interface ReleasesTableProps {
  releases: Release[]
  downloading: string | null
  onDownload: (guid: string, indexerId: number) => void
}

export function ReleasesTable({ releases, downloading, onDownload }: ReleasesTableProps) {
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0f172a]/50">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
          <thead className="text-xs uppercase bg-white/5 text-gray-300 font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4 w-[120px]">Indexer</th>
              <th className="px-6 py-4 w-[120px]">Âge</th>
              <th className="px-6 py-4 min-w-[300px]">Titre</th>
              <th className="px-6 py-4 w-[100px]">Taille</th>
              <th className="px-6 py-4 w-[100px]">S / L</th>
              <th className="px-6 py-4 w-[100px]">Langue</th>
              <th className="px-6 py-4 w-[120px]">Qualité</th>
              <th className="px-6 py-4 w-[80px] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {releases.map(release => (
              <tr key={release.guid} className="hover:bg-white/5 transition-colors group">
                <td
                  className="px-6 py-4 font-medium text-indigo-300 truncate max-w-[120px]"
                  title={release.indexer}
                >
                  {release.indexer}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {formatDistanceToNow(new Date(release.publishDate), { addSuffix: true, locale: fr })}
                </td>
                <td
                  className="px-6 py-4 text-white font-medium max-w-[400px] truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:z-10 relative"
                  title={release.title}
                >
                  {release.title}
                </td>
                <td className="px-6 py-4 font-mono text-gray-300">{formatSize(release.size)}</td>
                <td className="px-6 py-4 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-400 font-bold">{release.seeders}</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-red-400">{release.leechers}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {release.languages?.map(l => l.name).join(', ') || 'Inconnu'}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-white/10 text-gray-300 border border-white/10 whitespace-nowrap">
                    {release.quality.quality.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-right sticky right-0 bg-[#0f172a] group-hover:bg-[#162032] transition-colors shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.5)]">
                  <button
                    onClick={() => onDownload(release.guid, release.indexerId)}
                    disabled={!!downloading && downloading === release.guid}
                    className="p-2 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-all disabled:opacity-50 active:scale-90"
                    title="Télécharger"
                  >
                    {downloading === release.guid ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
