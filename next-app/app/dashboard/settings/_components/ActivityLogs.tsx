'use client'

import { useActivityLogs } from '../_hooks/useActivityLogs'
import ActivityLogsToolbar from './activity-logs/ActivityLogsToolbar'
import ActivityLogsTable from './activity-logs/ActivityLogsTable'
import ActivityLogsPagination from './activity-logs/ActivityLogsPagination'

export default function ActivityLogs() {
    const {
        logs,
        users,
        total,
        loading,
        importing,
        page,
        filters,
        totalPages,
        setPage,
        setFilter,
        importPastRequests,
    } = useActivityLogs()

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ActivityLogsToolbar
                users={users}
                filters={filters}
                importing={importing}
                onImport={importPastRequests}
                onFilterChange={setFilter}
            />

            <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
                <ActivityLogsTable logs={logs} loading={loading} />

                {!loading && (
                    <ActivityLogsPagination
                        page={page}
                        totalPages={totalPages}
                        total={total}
                        onPageChange={setPage}
                    />
                )}
            </div>
        </div>
    )
}
