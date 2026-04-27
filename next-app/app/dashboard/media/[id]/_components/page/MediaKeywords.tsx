import Link from 'next/link'

interface MediaKeyword {
  id: number
  name: string
}

interface MediaKeywordsProps {
  keywords: MediaKeyword[]
}

export default function MediaKeywords({ keywords }: MediaKeywordsProps) {
  if (keywords.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 mt-8">
      {keywords.map((k) => (
        <Link
          key={k.id}
          href={`/dashboard/media/discover?keyword=${k.id}&name=${encodeURIComponent(k.name)}`}
          className="px-3 py-1 bg-gray-800/30 border border-gray-700/50 rounded-full text-xs text-gray-500 hover:text-white hover:bg-indigo-600/30 hover:border-indigo-500/50 transition flex items-center gap-1"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          {k.name}
        </Link>
      ))}
    </div>
  )
}
