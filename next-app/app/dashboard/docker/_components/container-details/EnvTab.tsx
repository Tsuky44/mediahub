'use client'

import type { ContainerInfo } from '../../_types/container-details'

interface EnvTabProps {
    details: ContainerInfo
}

/** Tab "Variables (ENV)" : tableau clé/valeur des variables d'environnement. */
export function EnvTab({ details }: EnvTabProps) {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    Variables d&apos;environnement
                </h3>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs font-medium text-gray-400 border border-white/5">
                    {details.env.length} variables
                </span>
            </div>
            <div className="bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl shadow-black/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-black/40 text-gray-500 font-bold uppercase text-xs border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 w-1/3">Clé</th>
                                <th className="px-6 py-4">Valeur</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {details.env.map((envStr, i) => {
                                const [key, ...rest] = envStr.split('=')
                                const value = rest.join('=')
                                return (
                                    <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-6 py-4 font-mono text-indigo-400 font-medium group-hover:text-indigo-300 transition-colors">
                                            {key}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-300 break-all group-hover:text-white transition-colors">
                                            {value}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
