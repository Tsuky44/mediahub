'use client'

import { useState } from 'react'
import { X, Box, Info } from 'lucide-react'
import type { ContainerDetailsTab } from '../_types/container-details'
import { useContainerDetails } from '../_hooks/useContainerDetails'
import { DetailsSidebarTabs } from './container-details/DetailsSidebarTabs'
import { InfoTab } from './container-details/InfoTab'
import { EnvTab } from './container-details/EnvTab'
import { VolumesTab } from './container-details/VolumesTab'
import { NetworkTab } from './container-details/NetworkTab'
import { AccessDeniedModal } from './container-details/AccessDeniedModal'

interface ContainerDetailsProps {
    containerId: string
    containerName: string
    onClose: () => void
    canReadDetails?: boolean
}

export default function ContainerDetails({
    containerId,
    containerName,
    onClose,
    canReadDetails = false,
}: ContainerDetailsProps) {
    const [activeTab, setActiveTab] = useState<ContainerDetailsTab>('info')
    const { details, loading, error } = useContainerDetails(canReadDetails ? containerId : '')

    if (!canReadDetails) {
        return (
            <AccessDeniedModal
                message="Vous n'avez pas la permission de voir la configuration de ce conteneur."
                onClose={onClose}
            />
        )
    }

    if (!containerId) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/10 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-white/10 shadow-lg shadow-indigo-500/20">
                            <Box className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                                Configuration
                                <span className="px-2.5 py-1 rounded-xl bg-white/5 text-sm font-bold text-gray-300 border border-white/5 shadow-inner">
                                    {containerName}
                                </span>
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 text-gray-400 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-10">
                    <DetailsSidebarTabs activeTab={activeTab} onChange={setActiveTab} />

                    <div className="flex-1 overflow-y-auto p-6 bg-transparent relative scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                <p className="text-sm font-bold animate-pulse text-indigo-400">
                                    Chargement de la configuration...
                                </p>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl flex flex-col items-center gap-4 max-w-sm text-center backdrop-blur-md">
                                    <div className="p-4 bg-red-500/20 rounded-2xl shadow-lg shadow-red-500/10">
                                        <Info className="w-8 h-8 text-red-400" />
                                    </div>
                                    <h3 className="text-xl font-black text-red-400">Erreur de chargement</h3>
                                    <p className="text-sm text-red-300/80 font-medium">{error}</p>
                                </div>
                            </div>
                        ) : details ? (
                            <div className="space-y-6 max-w-4xl mx-auto">
                                {activeTab === 'info' && <InfoTab details={details} />}
                                {activeTab === 'env' && <EnvTab details={details} />}
                                {activeTab === 'volumes' && <VolumesTab details={details} />}
                                {activeTab === 'network' && <NetworkTab details={details} />}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}
