export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="h-8 w-48 bg-gray-800 rounded-lg" />
            <div className="h-10 w-full max-w-md bg-gray-800 rounded-full" />
        </div>
        
        <div className="flex items-center justify-center border-b border-gray-800 pb-4">
            <div className="flex space-x-2 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-9 w-24 bg-gray-800 rounded-lg" />
                ))}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-gray-800 rounded-xl" />
            ))}
        </div>
    </div>
  )
}
