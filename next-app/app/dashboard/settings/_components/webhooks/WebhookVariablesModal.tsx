'use client'

import { Info, XCircle } from 'lucide-react'

interface VariableRowProps {
    name: string
    description: string
}

function VariableRow({ name, description }: VariableRowProps) {
    return (
        <div>
            <code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{${name}}`}</code>{' '}
            <span className="text-xs text-gray-400">{description}</span>
        </div>
    )
}

interface VariableSectionProps {
    title: string
    titleColor: string
    variables: VariableRowProps[]
}

function VariableSection({ title, titleColor, variables }: VariableSectionProps) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className={`bg-black/40 px-4 py-2 border-b border-white/10 font-medium text-sm ${titleColor}`}>
                {title}
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {variables.map(v => (
                    <VariableRow key={v.name} name={v.name} description={v.description} />
                ))}
            </div>
        </div>
    )
}

interface WebhookVariablesModalProps {
    onClose: () => void
}

/** Modale d'aide : liste des variables utilisables dans les templates de webhook. */
export function WebhookVariablesModal({ onClose }: WebhookVariablesModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Info size={20} className="text-indigo-400" />
                        Variables de Template
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XCircle size={24} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <p className="text-sm text-gray-300">
                        Vous pouvez utiliser ces variables dans vos templates. Elles seront automatiquement remplacées
                        par les vraies valeurs lors de l&apos;envoi de la notification.
                    </p>

                    <div className="space-y-4">
                        <VariableSection
                            title="Informations Générales"
                            titleColor="text-indigo-300"
                            variables={[
                                { name: 'title', description: 'Titre du film ou de la série' },
                                { name: 'message', description: 'Message système par défaut' },
                                { name: 'user', description: "Nom ou Ping de l'utilisateur" },
                            ]}
                        />

                        <VariableSection
                            title="Informations du Média (TMDB)"
                            titleColor="text-emerald-300"
                            variables={[
                                { name: 'overview', description: 'Résumé (synopsis)' },
                                { name: 'year', description: 'Année de sortie' },
                                { name: 'rating', description: 'Note (ex: 8.5)' },
                                { name: 'genres', description: 'Genres (ex: Action, Drame)' },
                                { name: 'episodes', description: 'Saison/Episode (ex: S01E01)' },
                                { name: 'poster', description: "Lien URL de l'affiche (image)" },
                            ]}
                        />

                        <VariableSection
                            title="Informations Techniques (Radarr/Sonarr)"
                            titleColor="text-blue-300"
                            variables={[
                                { name: 'quality', description: 'Qualité (ex: Bluray-1080p)' },
                                { name: 'size', description: 'Taille du fichier (ex: 4.2 GB)' },
                                { name: 'indexer', description: 'Indexeur/Tracker (ex: YGG)' },
                                { name: 'release', description: 'Nom de la release (fichier)' },
                            ]}
                        />

                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-indigo-300 mb-2">Astuces de formatage</h4>
                            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside ml-4">
                                <li>
                                    <strong>WhatsApp :</strong> Utilisez <code>*texte*</code> pour le gras,{' '}
                                    <code>_texte_</code> pour l&apos;italique, <code>~texte~</code> pour barré.
                                </li>
                                <li>
                                    <strong>Discord :</strong> Utilisez <code>**texte**</code> pour le gras,{' '}
                                    <code>*texte*</code> pour l&apos;italique.
                                </li>
                                <li>
                                    L&apos;affiche du film/série est toujours envoyée automatiquement avec le message si
                                    elle est disponible.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-white/10 bg-black/40 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    )
}
