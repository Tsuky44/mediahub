import { Clock, Users, Play, Film } from 'lucide-react'

interface DashboardStatsProps {
  stats: any // Type this properly later
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const overview = stats.overview || {}
  const topMovies = stats.top?.movies || []
  const topSeries = stats.top?.series || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-gray-800 shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-400">Total Hours</dt>
                  <dd>
                    <div className="text-lg font-medium text-white">{overview.totalHours || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-hidden rounded-lg bg-gray-800 shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-400">Active Users</dt>
                  <dd>
                    <div className="text-lg font-medium text-white">{overview.activeUsers || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-hidden rounded-lg bg-gray-800 shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Play className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-400">Total Plays</dt>
                  <dd>
                    <div className="text-lg font-medium text-white">{overview.totalPlays || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-hidden rounded-lg bg-gray-800 shadow">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <Film className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="truncate text-sm font-medium text-gray-400">Active Sessions</dt>
                            <dd>
                                <div className="text-lg font-medium text-white">{stats.sessions ? stats.sessions.length : 0}</div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Top Content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Movies */}
        <div className="overflow-hidden rounded-lg bg-gray-800 shadow">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-white">Top Movies</h3>
            </div>
            <div className="border-t border-gray-700">
                <ul role="list" className="divide-y divide-gray-700">
                    {topMovies.map((movie: any, idx: number) => (
                        <li key={idx} className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                                <p className="truncate text-sm font-medium text-indigo-400">{movie.name}</p>
                                <div className="ml-2 flex flex-shrink-0">
                                    <p className="inline-flex rounded-full bg-green-900 px-2 text-xs font-semibold leading-5 text-green-300">
                                        {Math.round(movie.minutes / 60)}h
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                    {topMovies.length === 0 && (
                        <li className="px-4 py-4 text-sm text-gray-500">No data</li>
                    )}
                </ul>
            </div>
        </div>

        {/* Top Series */}
        <div className="overflow-hidden rounded-lg bg-gray-800 shadow">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-white">Top Series</h3>
            </div>
            <div className="border-t border-gray-700">
                <ul role="list" className="divide-y divide-gray-700">
                    {topSeries.map((serie: any, idx: number) => (
                        <li key={idx} className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                                <p className="truncate text-sm font-medium text-indigo-400">{serie.name}</p>
                                <div className="ml-2 flex flex-shrink-0">
                                    <p className="inline-flex rounded-full bg-green-900 px-2 text-xs font-semibold leading-5 text-green-300">
                                        {Math.round(serie.minutes / 60)}h
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                    {topSeries.length === 0 && (
                        <li className="px-4 py-4 text-sm text-gray-500">No data</li>
                    )}
                </ul>
            </div>
        </div>
      </div>
    </div>
  )
}
