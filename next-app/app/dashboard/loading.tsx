export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-gray-200"></div>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="h-6 w-6 animate-pulse rounded-full bg-gray-200"></div>
                <div className="ml-5 w-0 flex-1">
                  <div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-6 w-16 animate-pulse rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:px-6">
              <div className="h-6 w-32 animate-pulse rounded bg-gray-200"></div>
            </div>
            <div className="border-t border-gray-200 p-4">
              <div className="space-y-4">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="h-4 w-48 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-4 w-12 animate-pulse rounded bg-gray-200"></div>
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
