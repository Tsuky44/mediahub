'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { toast } from 'react-hot-toast'
import { AlertTriangle, FileCode2, Loader2, Rocket, Save, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import type { DockerStack } from '../../_types/docker'

interface ComposeFile {
    path: string
    name: string
    content: string
    exists: boolean
}

interface ComposeEditorModalProps {
    stack: DockerStack
    canEdit: boolean
    onClose: () => void
    onDeployed: () => void
}

/**
 * Édition des fichiers d'une stack Compose, puis redéploiement.
 *
 * Enregistrer ne suffit pas à appliquer un changement : Compose ne relit les
 * fichiers qu'au moment de recréer les conteneurs. Les deux actions sont donc
 * séparées et l'interface le dit, plutôt que de laisser croire qu'un « Enregistrer »
 * a pris effet.
 */
export function ComposeEditorModal({ stack, canEdit, onClose, onDeployed }: ComposeEditorModalProps) {
    const [files, setFiles] = useState<ComposeFile[]>([])
    const [activePath, setActivePath] = useState<string | null>(null)
    const [draft, setDraft] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [deploying, setDeploying] = useState<'up' | 'down' | null>(null)
    const [output, setOutput] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            try {
                const data = await api.get<{ files: ComposeFile[] }>(
                    `/api/docker/stacks/${encodeURIComponent(stack.project)}/files`
                )
                if (cancelled) return

                setFiles(data.files)
                setActivePath(data.files[0]?.path ?? null)
                setDraft(data.files[0]?.content ?? '')
                setLoading(false)
            } catch (err) {
                if (cancelled) return
                setError(err instanceof ApiError || err instanceof Error ? err.message : 'Lecture impossible')
                setLoading(false)
            }
        }

        void load()
        return () => {
            cancelled = true
        }
    }, [stack.project])

    const activeFile = files.find(f => f.path === activePath) ?? null
    const isDirty = activeFile !== null && draft !== activeFile.content

    const selectFile = (file: ComposeFile) => {
        if (isDirty && !confirm('Les modifications non enregistrées seront perdues. Continuer ?')) return
        setActivePath(file.path)
        setDraft(file.content)
    }

    const save = async () => {
        if (!activeFile || saving) return

        setSaving(true)
        try {
            const result = await api.put<{ backupPath: string | null }>(
                `/api/docker/stacks/${encodeURIComponent(stack.project)}/files`,
                { path: activeFile.path, content: draft }
            )

            setFiles(prev => prev.map(f => (f.path === activeFile.path ? { ...f, content: draft, exists: true } : f)))
            toast.success(
                result.backupPath
                    ? `${activeFile.name} enregistré (sauvegarde conservée)`
                    : `${activeFile.name} enregistré`
            )
        } catch (err) {
            const detail = err instanceof ApiError || err instanceof Error ? err.message : 'erreur inconnue'
            toast.error(`Enregistrement impossible : ${detail}`)
        } finally {
            setSaving(false)
        }
    }

    const deploy = async (mode: 'up' | 'down') => {
        if (deploying) return
        if (mode === 'down' && !confirm(`Arrêter et supprimer les conteneurs de « ${stack.project} » ?`)) return

        setDeploying(mode)
        setOutput(null)
        try {
            const result = await api.post<{ output?: string }>('/api/docker/stacks', {
                project: stack.project,
                action: mode,
            })
            setOutput(result.output ?? '')
            toast.success(mode === 'up' ? 'Stack redéployée' : 'Stack arrêtée')
            onDeployed()
        } catch (err) {
            const detail = err instanceof ApiError || err instanceof Error ? err.message : 'erreur inconnue'
            setOutput(detail)
            toast.error(`Déploiement impossible : ${detail}`)
        } finally {
            setDeploying(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] ring-1 ring-white/10">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-teal-500/10 rounded-xl border border-teal-500/20">
                            <FileCode2 className="w-5 h-5 text-teal-400" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-black text-white truncate">{stack.project}</h2>
                            <p className="text-[11px] text-gray-500 font-mono truncate">{stack.workingDir}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white hover:rotate-90"
                        title="Fermer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Chargement des fichiers...
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-start justify-center p-8">
                        <div className="max-w-xl bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-200 leading-relaxed">{error}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/5 overflow-x-auto">
                            {files.map(file => (
                                <button
                                    key={file.path}
                                    onClick={() => selectFile(file)}
                                    className={clsx(
                                        'px-4 py-2 rounded-t-xl text-sm font-bold transition-colors whitespace-nowrap',
                                        file.path === activePath
                                            ? 'bg-white/5 text-white border-b-2 border-teal-400'
                                            : 'text-gray-500 hover:text-gray-300',
                                    )}
                                >
                                    {file.name}
                                    {!file.exists && <span className="ml-2 text-[10px] text-gray-600">(nouveau)</span>}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            readOnly={!canEdit}
                            spellCheck={false}
                            aria-label={`Contenu de ${activeFile?.name ?? 'fichier'}`}
                            className="flex-1 bg-black/40 text-gray-200 font-mono text-sm p-6 resize-none focus:outline-none scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
                        />

                        {output !== null && (
                            <pre className="max-h-40 overflow-y-auto bg-black/60 border-t border-white/5 px-6 py-3 text-xs font-mono text-gray-400 whitespace-pre-wrap">
                                {output || '(aucune sortie)'}
                            </pre>
                        )}

                        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/5 bg-white/5 flex-wrap">
                            <p className="text-xs text-gray-500 max-w-md">
                                Enregistrer écrit le fichier. Les conteneurs ne changent qu&apos;au redéploiement.
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => deploy('down')}
                                    disabled={!canEdit || !!deploying}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/25 transition-all active:scale-95 disabled:opacity-40"
                                >
                                    {deploying === 'down' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                    down
                                </button>
                                <button
                                    onClick={() => deploy('up')}
                                    disabled={!canEdit || !!deploying}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/25 transition-all active:scale-95 disabled:opacity-40"
                                >
                                    {deploying === 'up' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                    up -d
                                </button>
                                <button
                                    onClick={save}
                                    disabled={!canEdit || !isDirty || saving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 disabled:opacity-40 shadow-lg shadow-indigo-500/20"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
