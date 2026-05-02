'use client'

interface MediaCardStatusProps {
  status?: string
  message?: string
}

export function MediaCardStatus({ status, message }: MediaCardStatusProps) {
  if (!status || status === 'not_available' || status === 'unknown') return null

  let colorClass = ''
  if (status === 'available') {
    colorClass = 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
  } else if (status === 'partial') {
    colorClass = 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
  } else if (status === 'pending' || status === 'processing') {
    colorClass = 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]'
  } else {
    return null
  }

  return (
    <div className={`absolute top-2 right-2 h-3 w-3 rounded-full ${colorClass} z-20`} title={message} />
  )
}
