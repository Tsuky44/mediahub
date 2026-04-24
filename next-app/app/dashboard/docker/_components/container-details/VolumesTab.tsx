'use client'

import clsx from 'clsx'
import { Database, Server } from 'lucide-react'
import type { ContainerInfo, ContainerVolume } from '../../_types/container-details'

function VolumeRow({ volume }: { volume: ContainerVolume }) {
    return (
        <div className="bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 p-6 flex flex-col md:flex-row md:items-center gap-6 group hover:bg-white/[0.03] transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-black/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex-1 space-y-2 relative z-10">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    <Server className="w-3.5 h-3.5" /> Hôte (Source)
                </div>
                <p className="text-sm font-mono text-gray-300 break-all bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner group-hover:border-white/10 transition-colors">
                    {volume.source}
                </p>
            </div>

            <div className="hidden md:flex text-gray-600 relative z-10">
                <div className="p-2 rounded-full bg-white/5 border border-white/5 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </div>
            </div>

            <div className="flex-1 space-y-2 relative z-10">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <Database className="w-3.5 h-3.5" /> Conteneur (Dest)
                </div>
                <p className="text-sm font-mono text-gray-300 break-all bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner group-hover:border-white/10 transition-colors">
                    {volume.destination}
                </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center relative z-10">
                <span
                    className={clsx(
                        'px-3 py-1.5 rounded-xl text-xs font-black border shadow-lg backdrop-blur-md',
                        volume.rw
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/10'
                    )}
                >
                    {volume.rw ? 'RW' : 'RO'}
                </span>
            </div>
        </div>
    )
}

interface VolumesTabProps {
    details: ContainerInfo
}

/** Tab "Volumes" : liste des points de montage source -> destination. */
export function VolumesTab({ details }: VolumesTabProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4" /> Points de montage
                </h3>
                <span className="px-3 py-1 rounded-xl bg-indigo-500/10 text-xs font-bold text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                    {details.volumes.length} montages
                </span>
            </div>
            <div className="space-y-4">
                {details.volumes.map((vol, i) => (
                    <VolumeRow key={i} volume={vol} />
                ))}
                {details.volumes.length === 0 && (
                    <div className="text-center py-16 text-gray-500 bg-white/5 rounded-3xl border border-white/5 border-dashed flex flex-col items-center gap-4">
                        <div className="p-4 bg-white/5 rounded-full">
                            <Database className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="font-medium">Aucun volume monté</p>
                    </div>
                )}
            </div>
        </div>
    )
}
