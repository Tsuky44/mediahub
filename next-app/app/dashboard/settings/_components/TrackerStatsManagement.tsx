'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTrackerConfigs } from '../_hooks/useTrackerConfigs'
import { buildEmptyTrackerForm } from '../_utils/tracker-labels'
import type { TrackerConfig, TrackerFormData } from '../_types/tracker'
import { TrackerStatsGrid } from './trackers/TrackerStatsGrid'
import { TrackerActionsBar } from './trackers/TrackerActionsBar'
import { TrackerForm } from './trackers/TrackerForm'
import { TrackerList } from './trackers/TrackerList'

export function TrackerStatsManagement() {
    const {
        trackers,
        stats,
        loading,
        refreshing,
        importing,
        testingId,
        reload,
        add,
        update,
        remove,
        test,
        importFromProwlarr,
        debugProwlarr,
    } = useTrackerConfigs()

    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<TrackerFormData>(buildEmptyTrackerForm())

    const resetForm = () => {
        setFormData(buildEmptyTrackerForm())
        setEditingId(null)
        setShowForm(false)
    }

    const startEdit = (tracker: TrackerConfig) => {
        setFormData({
            name: tracker.name,
            type: tracker.type,
            baseUrl: tracker.baseUrl,
            apiKey: '',
            username: tracker.username || '',
            password: '',
            passkey: '',
            enabled: tracker.enabled,
        })
        setEditingId(tracker.id)
        setShowForm(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const ok = editingId ? await update(editingId, formData) : await add(formData)
        if (ok) resetForm()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <TrackerStatsGrid stats={stats} refreshing={refreshing} onRefresh={reload} />

            <div className="bg-gray-900/50 rounded-xl border border-white/10 p-6">
                <TrackerActionsBar
                    showForm={showForm}
                    importing={importing}
                    onToggleForm={() => (showForm ? resetForm() : setShowForm(true))}
                    onImport={importFromProwlarr}
                    onDebug={debugProwlarr}
                />

                {showForm && (
                    <TrackerForm
                        formData={formData}
                        editingId={editingId}
                        onChange={setFormData}
                        onSubmit={handleSubmit}
                        onCancel={resetForm}
                    />
                )}

                <TrackerList
                    trackers={trackers}
                    testingId={testingId}
                    onTest={test}
                    onEdit={startEdit}
                    onDelete={remove}
                />
            </div>
        </div>
    )
}
