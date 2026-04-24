import { Activity, ChevronRight } from 'lucide-react'

interface StatsEmptyStateProps {
    periodTitle: string
    oldestYear: number | null
    currentYear: number | null
    sourceFilter: string
}

/** Affiche quand l'utilisateur n'a aucune donnee de visionnage pour la periode choisie. */
export function StatsEmptyState({ periodTitle, oldestYear, currentYear, sourceFilter }: StatsEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-10 max-w-2xl w-full space-y-6">
                <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Activity className="h-8 w-8 text-blue-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Aucune donnée de visionnage</h2>
                    <p className="text-gray-400 text-sm">
                        Aucune activité n&apos;a encore été enregistrée pour {periodTitle.toLowerCase()}.
                    </p>

                    {oldestYear && currentYear && oldestYear < currentYear && (
                        <div className="mt-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-300 text-sm">
                            <p>
                                Des données plus anciennes sont disponibles à partir de <strong>{oldestYear}</strong>.
                            </p>
                            <a
                                href={`?period=year&year=${oldestYear}&source=${sourceFilter}`}
                                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all"
                            >
                                Aller en {oldestYear}
                                <ChevronRight className="h-3 w-3" />
                            </a>
                        </div>
                    )}

                    <div className="mt-4 p-4 bg-black/40 rounded text-left space-y-2 border border-blue-500/20">
                        <div className="flex justify-between text-xs text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-700 pb-2 mb-2">
                            <span>État du système</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                            <span className="text-gray-500">Source:</span>
                            <code className="text-blue-400 font-mono">Tracker Local (WebSocket)</code>
                        </div>
                    </div>
                </div>
                <div className="pt-4 text-xs text-gray-500 text-left space-y-2">
                    <p className="font-semibold text-gray-400 uppercase tracking-wider">Solutions possibles :</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Vérifiez que le script de tracking est en cours d&apos;exécution</li>
                        <li>Essayez une autre période ou une autre source</li>
                        <li>Lancez une lecture pour générer des données</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
