import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Download, Loader2, Server, Activity, ChevronDown, ChevronUp, Check, AlertCircle, Terminal, XCircle } from 'lucide-react'
import { useSystemUpdate } from './system-update/useSystemUpdate'
import { ContainerStatusCard } from './system-update/ContainerStatusCard'

export const SystemUpdate = () => {
    const { loading, updating, status, updateLogs, updateState, updateStep, progressPercent, progressCurrentMB, progressTotalMB, checkUpdate, performUpdate } = useSystemUpdate()
    const [selectedTag, setSelectedTag] = useState<string>('')
    const [expandedChangelog, setExpandedChangelog] = useState<string | null>(null)
    const [showTerminal, setShowTerminal] = useState(false)
    const terminalEndRef = useRef<HTMLDivElement>(null)

    const hasUpdates = status && (status.app.updateAvailable || (status.tracker?.updateAvailable))
    
    // Extract unique clean tags for selection
    const availableTags = status?.app.availableTags || []
    
    // Sort and filter tags to keep unique ones
    const cleanTags = Array.from(new Set(availableTags))
        .filter(tag => tag === 'latest' || /^v?\d+\.\d+\.\d+$/.test(tag))

    const handleVersionSwitch = () => {
        if (!selectedTag) return
        setShowTerminal(true)
        performUpdate(selectedTag)
    }

    const handleFastUpdate = () => {
        setShowTerminal(true)
        performUpdate()
    }

    const toggleChangelog = (ver: string) => {
        setExpandedChangelog(expandedChangelog === ver ? null : ver)
    }

    // Scroll to bottom of terminal whenever logs change
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [updateLogs, showTerminal])

    // Automatically open terminal if updating starts
    useEffect(() => {
        if (updating) {
            setShowTerminal(true)
        }
    }, [updating])

    return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl mt-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <RefreshCw size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white">Mise à jour du système</h3>
                        <p className="text-sm text-gray-400">Gérer les mises à jour et versions des conteneurs (App & Tracker)</p>
                    </div>
                </div>

                {!showTerminal && (
                    <button
                        onClick={() => checkUpdate(true)}
                        disabled={loading || updating}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer text-sm"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                        Vérifier
                    </button>
                )}
            </div>

            {/* Terminal Live logs view */}
            {showTerminal && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-t-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
                            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                            <span className="text-xs font-mono text-zinc-400 ml-2 flex items-center gap-1.5">
                                <Terminal size={12} />
                                Console de Mise à jour
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {updateState === 'in_progress' && (
                                <span className="text-xs text-yellow-500 flex items-center gap-1.5 font-mono">
                                    <Loader2 className="animate-spin" size={12} />
                                    Mise à jour...
                                </span>
                            )}
                            {updateState === 'success' && (
                                <span className="text-xs text-green-500 flex items-center gap-1.5 font-mono">
                                    <Check size={12} />
                                    Succès
                                </span>
                            )}
                            {updateState.startsWith('failed') && (
                                <span className="text-xs text-red-500 flex items-center gap-1.5 font-mono">
                                    <AlertCircle size={12} />
                                    Échec
                                </span>
                            )}
                            
                            {!updating && updateState !== 'in_progress' && (
                                <button 
                                    onClick={() => setShowTerminal(false)}
                                    className="text-zinc-400 hover:text-white transition-colors text-xs font-mono flex items-center gap-1 cursor-pointer bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded"
                                >
                                    <XCircle size={12} />
                                    Fermer la console
                                </button>
                            )}
                        </div>
                    </div>

                    {updating && updateStep && (
                        <div className="px-4 py-2.5 bg-zinc-900/80 border-x border-zinc-800">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-mono font-semibold text-zinc-200 uppercase tracking-wider">
                                    {updateStep === 'determining_tag' && 'Étape 1/5 — Détermination du tag'}
                                    {updateStep === 'identifying_container' && 'Étape 1/5 — Identification du conteneur'}
                                    {updateStep === 'download_app' && 'Étape 2/5 — Téléchargement App'}
                                    {updateStep === 'download_tracker' && 'Étape 3/5 — Téléchargement Tracker'}
                                    {updateStep === 'creating_companion' && 'Étape 4/5 — Création du compagnon'}
                                    {updateStep === 'companion_running' && 'Étape 5/5 — Lancement du compagnon'}
                                    {!['determining_tag','identifying_container','download_app','download_tracker','creating_companion','companion_running'].includes(updateStep) && updateStep}
                                </span>
                                {progressPercent > 0 && (
                                    <span className="text-[11px] font-mono text-blue-400 font-semibold">{progressPercent}% ({progressCurrentMB}MB / {progressTotalMB}MB)</span>
                                )}
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="bg-black/90 border-x border-b border-zinc-800 rounded-b-xl p-4 font-mono text-xs text-zinc-300 h-80 overflow-y-auto leading-relaxed select-text shadow-inner">
                        <div className="whitespace-pre-wrap">
                            {updateLogs || "Initialisation de la console..."}
                        </div>
                        <div ref={terminalEndRef} />
                    </div>

                    {updateState === 'success' && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg p-3 text-sm flex items-start gap-2.5">
                            <Check size={18} className="mt-0.5 shrink-0" />
                            <div>
                                <span className="font-semibold block">Installation terminée avec succès !</span>
                                <span className="text-xs text-zinc-400">Le conteneur redémarre. Cette page va se recharger automatiquement dès que l'application sera de retour en ligne...</span>
                            </div>
                        </div>
                    )}

                    {updateState === 'failed_rollback' && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-3 text-sm flex items-start gap-2.5">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <div>
                                <span className="font-semibold block">Mise à jour avortée (Rollback de sécurité)</span>
                                <span className="text-xs text-zinc-400">Une erreur est survenue lors du démarrage de la nouvelle version. L'ancien conteneur a été automatiquement restauré pour éviter toute interruption de service. Consultez la console ci-dessus pour plus de détails.</span>
                            </div>
                        </div>
                    )}

                    {updateState === 'failed_critical' && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm flex items-start gap-2.5">
                            <XCircle size={18} className="mt-0.5 shrink-0" />
                            <div>
                                <span className="font-semibold block">Erreur Critique</span>
                                <span className="text-xs text-zinc-400">Le système est actuellement instable et le rollback automatique a échoué. Veuillez vous connecter en SSH sur votre serveur hôte et inspecter l'état de votre conteneur avec <code>docker ps</code>.</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!showTerminal && status && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Conteneurs Actuels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ContainerStatusCard status={status.app} icon={Server} />
                        {status.tracker && <ContainerStatusCard status={status.tracker} icon={Activity} />}
                    </div>

                    {/* Gestion des versions (Upgrade & Downgrade) */}
                    <div className="bg-black/25 rounded-xl p-5 border border-white/5 space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-medium">
                            <AlertCircle size={18} />
                            <span>Changer de version (Rollback / Upgrade)</span>
                        </div>
                        <p className="text-xs text-gray-400">
                            Sélectionnez n'importe quel tag d'image publié sur GitHub Container Registry. 
                            L'application et le tracker seront recréés automatiquement avec cette version en conservant toutes vos données.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                            <div className="w-full sm:w-64">
                                <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1 font-medium">Tag cible</label>
                                <select
                                    value={selectedTag}
                                    onChange={(e) => setSelectedTag(e.target.value)}
                                    disabled={updating || loading}
                                    className="w-full px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                                >
                                    <option value="">-- Choisir une version --</option>
                                    {cleanTags.map((tag) => (
                                        <option key={tag} value={tag}>
                                            {tag} {tag === status.app.currentVersion ? '(Actuelle)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleVersionSwitch}
                                disabled={updating || !selectedTag || selectedTag === status.app.currentVersion}
                                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-900/10 disabled:shadow-none"
                            >
                                {updating ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                Basculer sur cette version
                            </button>
                        </div>
                    </div>

                    {/* Bouton de mise à jour rapide */}
                    {hasUpdates && (
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleFastUpdate}
                                disabled={updating}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2 font-medium cursor-pointer"
                            >
                                {updating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                Installer la mise à jour ({status.app.latestVersion})
                            </button>
                        </div>
                    )}

                    {/* Changelog Section */}
                    {status.changelog && status.changelog.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Notes de mise à jour</h4>
                            
                            <div className="space-y-2">
                                {status.changelog.map((entry) => {
                                    const isExpanded = expandedChangelog === entry.version
                                    const isCurrent = 'v' + entry.version === status.app.currentVersion
                                    
                                    return (
                                        <div 
                                            key={entry.version} 
                                            className="border border-white/5 bg-black/10 rounded-lg overflow-hidden transition-all duration-200"
                                        >
                                            <button
                                                onClick={() => toggleChangelog(entry.version)}
                                                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-medium text-white text-sm">
                                                        v{entry.version}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{entry.date}</span>
                                                    {isCurrent && (
                                                        <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                            </button>

                                            {isExpanded && (
                                                <div className="px-4 pb-4 pt-1 border-t border-white/5 bg-black/5 space-y-3 text-sm animate-in fade-in slide-in-from-top-1 duration-150">
                                                    {entry.changes.added && entry.changes.added.length > 0 && (
                                                        <div className="space-y-1">
                                                            <div className="text-xs font-semibold text-green-400 uppercase tracking-wider mt-1">Nouveautés</div>
                                                            <ul className="list-disc list-inside text-gray-300 pl-2 space-y-0.5 text-xs">
                                                                {entry.changes.added.map((item, idx) => (
                                                                    <li key={idx}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {entry.changes.changed && entry.changes.changed.length > 0 && (
                                                        <div className="space-y-1">
                                                            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mt-1">Changements</div>
                                                            <ul className="list-disc list-inside text-gray-300 pl-2 space-y-0.5 text-xs">
                                                                {entry.changes.changed.map((item, idx) => (
                                                                    <li key={idx}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {entry.changes.fixed && entry.changes.fixed.length > 0 && (
                                                        <div className="space-y-1">
                                                            <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mt-1">Corrections</div>
                                                            <ul className="list-disc list-inside text-gray-300 pl-2 space-y-0.5 text-xs">
                                                                {entry.changes.fixed.map((item, idx) => (
                                                                    <li key={idx}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {entry.changes.security && entry.changes.security.length > 0 && (
                                                        <div className="space-y-1">
                                                            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mt-1">Sécurité</div>
                                                            <ul className="list-disc list-inside text-gray-300 pl-2 space-y-0.5 text-xs">
                                                                {entry.changes.security.map((item, idx) => (
                                                                    <li key={idx}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
