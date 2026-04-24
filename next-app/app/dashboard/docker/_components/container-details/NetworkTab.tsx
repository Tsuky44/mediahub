'use client'

import { Network, RotateCw, Server, Info } from 'lucide-react'
import type { ContainerInfo } from '../../_types/container-details'

interface NetworkTabProps {
    details: ContainerInfo
}

/** Tab "Réseau & Ports" : mode réseau, politique de redémarrage, mappage des ports. */
export function NetworkTab({ details }: NetworkTabProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 space-y-3 hover:bg-white/[0.03] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        <Network className="w-4 h-4" /> Mode Réseau
                    </label>
                    <p className="text-sm text-white font-medium font-mono bg-black/40 p-3 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors shadow-inner">
                        {details.networkMode}
                    </p>
                </div>
                <div className="p-6 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 space-y-3 hover:bg-white/[0.03] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        <RotateCw className="w-4 h-4" /> Politique de redémarrage
                    </label>
                    <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors shadow-inner">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse"></div>
                        <p className="text-sm text-white font-medium capitalize">{details.restartPolicy}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Server className="w-4 h-4" /> Mappage des Ports
                    </h3>
                    <span className="px-3 py-1 rounded-xl bg-indigo-500/10 text-xs font-bold text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                        {details.ports.length} ports
                    </span>
                </div>

                <div className="bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl shadow-black/20">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-black/40 text-gray-500 font-bold uppercase text-xs border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 w-1/2">Port Conteneur</th>
                                    <th className="px-6 py-4 w-1/2">Port Hôte</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {details.ports.map((port, i) => (
                                    <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-6 py-4 font-mono text-gray-300">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors"></div>
                                                {port.container}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-indigo-400 font-medium">
                                            {port.host ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 text-indigo-300 group-hover:text-indigo-200 transition-colors">
                                                        {port.host}
                                                    </span>
                                                    <a
                                                        href={`http://${typeof window !== 'undefined' ? window.location.hostname : ''}:${port.host}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                                        title="Ouvrir dans un nouvel onglet"
                                                    >
                                                        <Info className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 italic text-xs bg-white/5 px-2 py-1 rounded-lg">
                                                    Non exposé
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {details.ports.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-50">
                                                <Network className="w-8 h-8 text-gray-600" />
                                                <span className="text-gray-500 font-medium italic">Aucun port exposé</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
