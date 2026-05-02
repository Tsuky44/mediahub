'use client'

interface TrackerModalLoadingViewProps {
    message: string
}

export function TrackerModalLoadingView({ message }: TrackerModalLoadingViewProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 animate-pulse">{message}</p>
        </div>
    )
}
