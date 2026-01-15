export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-gray-800/50 border border-gray-700/30"></div>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-gray-800/30 border border-gray-700/30 shadow-sm p-5">
            <div className="flex items-center">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-700/50"></div>
              <div className="ml-5 w-0 flex-1">
                <div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-700/50"></div>
                <div className="h-6 w-16 animate-pulse rounded bg-gray-700/50"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-gray-800/30 border border-gray-700/30 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-800/50">
              <div className="h-6 w-32 animate-pulse rounded bg-gray-700/50"></div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-7 animate-pulse rounded bg-gray-700/50 flex-shrink-0" />
                        <div className="h-4 w-full max-w-[200px] animate-pulse rounded bg-gray-700/50" />
                    </div>
                    <div className="h-6 w-20 animate-pulse rounded-full bg-gray-700/50" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
