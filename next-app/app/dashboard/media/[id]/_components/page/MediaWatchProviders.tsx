interface MediaWatchProvidersProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: any[]
}

export default function MediaWatchProviders({
  providers,
}: MediaWatchProvidersProps) {
  if (providers.length === 0) return null
  return (
    <div className="px-4 py-3 flex items-center justify-between border-t border-white/5 bg-white/[0.02] rounded-b-xl">
      <span className="text-gray-500 text-[11px] font-bold">
        Disponible sur
      </span>
      <div className="flex gap-2">
        {providers.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (provider: any) => (
            <div key={provider.provider_id} className="group relative">
              <img
                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                alt={provider.provider_name}
                className="w-5 h-5 rounded-md shadow-md border border-white/10 group-hover:scale-110 transition duration-300"
              />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-xl">
                {provider.provider_name}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
