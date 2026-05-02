import { useContainerStats } from './stats/useContainerStats'
import { StatsAccessDenied } from './stats/StatsAccessDenied'
import { StatsModalHeader } from './stats/StatsModalHeader'
import { StatsLoading } from './stats/StatsLoading'
import { StatsError } from './stats/StatsError'
import { CpuStatCard } from './stats/CpuStatCard'
import { MemoryStatCard } from './stats/MemoryStatCard'
import { NetworkStatCard } from './stats/NetworkStatCard'
import { PidsStatCard } from './stats/PidsStatCard'

interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports?: string
  autoStart: boolean
  icon?: string
}

interface ContainerStatsProps {
  container: DockerContainer
  onClose: () => void
  canReadDetails?: boolean
}

export default function ContainerStats({ container, onClose, canReadDetails = false }: ContainerStatsProps) {
  const { stats, loading, error } = useContainerStats(container.id)

  if (!canReadDetails) {
    return <StatsAccessDenied onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        <StatsModalHeader container={container} onClose={onClose} />

        <div className="p-6 md:p-8 relative z-10">
          {loading && !stats ? (
            <StatsLoading />
          ) : error ? (
            <StatsError message={error} />
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CpuStatCard cpu={stats.cpu} />
              <MemoryStatCard memory={stats.memory} />
              <NetworkStatCard network={stats.network} />
              <PidsStatCard pids={stats.pids} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
