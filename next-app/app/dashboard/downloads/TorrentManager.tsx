'use client'

import { useState, useEffect } from 'react'
import { getTorrents, addTorrent, deleteTorrents, pauseTorrents, resumeTorrents } from './actions'
import { Torrent } from '@/lib/services/qbittorrent'
import { Plus, Trash2, Pause, Play, Download, Upload, Clock, FileDown, HardDrive, Search } from 'lucide-react'
import clsx from 'clsx'

export function TorrentManager() {
    const [torrents, setTorrents] = useState<Torrent[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [torrentToDelete, setTorrentToDelete] = useState<{hash: string, name: string} | null>(null)
    const [addMode, setAddMode] = useState<'url' | 'file'>('url')
    const [newTorrentUrl, setNewTorrentUrl] = useState('')
    const [torrentFiles, setTorrentFiles] = useState<FileList | null>(null)
    const [selectedTorrents, setSelectedTorrents] = useState<string[]>([])
    const [refreshInterval, setRefreshInterval] = useState(2000)

    const fetchTorrents = async () => {
        const data = await getTorrents(filter)
        setTorrents(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchTorrents()
        const interval = setInterval(fetchTorrents, refreshInterval)
        return () => clearInterval(interval)
    }, [filter, refreshInterval])

    const formatSpeed = (bytes: number) => {
        if (bytes === 0) return '0 B/s'
        const k = 1024
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatEta = (seconds: number) => {
        if (seconds === 8640000) return '∞' // qBittorrent returns this for unknown
        if (seconds <= 0) return 'Done'
        
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        
        if (h > 24) return '> 1d'
        if (h > 0) return `${h}h ${m}m`
        return `${m}m ${seconds % 60}s`
    }

    const getProgressBarColor = (state: string) => {
        if (state.includes('error')) return 'bg-red-500'
        if (state.includes('pause')) return 'bg-gray-500'
        if (state === 'uploading' || state === 'stalledUP') return 'bg-green-500'
        if (state === 'downloading' || state === 'stalledDL') return 'bg-blue-500'
        if (state === 'metaDL') return 'bg-yellow-500'
        return 'bg-indigo-500'
    }

    const handleAddTorrent = async (e: React.FormEvent) => {
        e.preventDefault()
        
        const formData = new FormData()
        
        if (addMode === 'url' && newTorrentUrl) {
            formData.append('urls', newTorrentUrl)
        } else if (addMode === 'file' && torrentFiles && torrentFiles.length > 0) {
            for (let i = 0; i < torrentFiles.length; i++) {
                formData.append('torrents', torrentFiles[i])
            }
        } else {
            return
        }
        
        const res = await addTorrent(formData)
        if (res.success) {
            setNewTorrentUrl('')
            setTorrentFiles(null)
            setIsAddModalOpen(false)
            fetchTorrents()
        } else {
            alert('Failed to add torrent')
        }
    }

    const handleDeleteClick = (torrent: {hash: string, name: string}) => {
        setTorrentToDelete(torrent)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async (deleteFiles: boolean) => {
        if (!torrentToDelete) return
        
        const res = await deleteTorrents([torrentToDelete.hash], deleteFiles)
        if (res.success) {
            fetchTorrents()
            setIsDeleteModalOpen(false)
            setTorrentToDelete(null)
        }
    }

    const handlePause = async (hash: string) => {
        await pauseTorrents([hash])
        fetchTorrents()
    }

    const handleResume = async (hash: string) => {
        await resumeTorrents([hash])
        fetchTorrents()
    }

    const filteredTorrents = torrents.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto items-start sm:items-center">
                    <div className="flex flex-wrap gap-2 pb-2 sm:pb-0 w-full sm:w-auto">
                        {['all', 'downloading', 'completed', 'paused', 'active', 'inactive'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={clsx(
                                    'px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors whitespace-nowrap',
                                    filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher..."
                            className="w-full pl-9 pr-4 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>
                
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg transition-all w-full sm:w-auto justify-center"
                >
                    <Plus className="h-5 w-5" />
                    Ajouter Torrent
                </button>
            </div>

            {/* Torrent List - Card Layout for Mobile / Table for Desktop */}
            <div className="grid gap-4">
                {loading && torrents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Chargement...</div>
                ) : filteredTorrents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        {searchQuery ? 'Aucun torrent trouvé pour cette recherche' : 'Aucun torrent trouvé'}
                    </div>
                ) : (
                    filteredTorrents.map((torrent) => (
                        <div key={torrent.hash} className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-sm hover:border-gray-600 transition-colors">
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-white truncate" title={torrent.name}>{torrent.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                            <span className={clsx(
                                                'px-1.5 py-0.5 rounded capitalize',
                                                torrent.state.includes('pause') ? 'bg-yellow-900/50 text-yellow-300' :
                                                torrent.state.includes('error') ? 'bg-red-900/50 text-red-300' :
                                                torrent.state === 'uploading' || torrent.progress === 1 ? 'bg-green-900/50 text-green-300' :
                                                'bg-blue-900/50 text-blue-300'
                                            )}>
                                                {torrent.state}
                                            </span>
                                            <span>{formatSize(torrent.size)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        {torrent.state.includes('pause') ? (
                                            <button onClick={() => handleResume(torrent.hash)} className="p-2 text-green-400 hover:bg-gray-700 rounded-full" title="Resume">
                                                <Play className="h-5 w-5" />
                                            </button>
                                        ) : (
                                            <button onClick={() => handlePause(torrent.hash)} className="p-2 text-yellow-400 hover:bg-gray-700 rounded-full" title="Pause">
                                                <Pause className="h-5 w-5" />
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteClick(torrent)} className="p-2 text-red-400 hover:bg-gray-700 rounded-full" title="Delete">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className={clsx("h-full transition-all duration-500", getProgressBarColor(torrent.state))}
                                        style={{ width: `${(torrent.progress * 100).toFixed(1)}%` }}
                                    />
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        <Download className="h-3.5 w-3.5 text-blue-400" />
                                        <span>{formatSpeed(torrent.dlspeed)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Upload className="h-3.5 w-3.5 text-green-400" />
                                        <span>{formatSpeed(torrent.upspeed)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-yellow-400" />
                                        <span>{formatEta(torrent.eta)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500">{(torrent.progress * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Torrent Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-4">Ajouter un Torrent</h2>
                        
                        {/* Tabs for URL/File */}
                        <div className="flex space-x-4 mb-4 border-b border-gray-700 pb-2">
                            <button
                                onClick={() => setAddMode('url')}
                                className={clsx(
                                    'text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors',
                                    addMode === 'url' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
                                )}
                            >
                                Lien Magnet / URL
                            </button>
                            <button
                                onClick={() => setAddMode('file')}
                                className={clsx(
                                    'text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors',
                                    addMode === 'file' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
                                )}
                            >
                                Fichier .torrent
                            </button>
                        </div>

                        <form onSubmit={handleAddTorrent} className="space-y-4">
                            {addMode === 'url' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Lien Magnet ou URL</label>
                                    <textarea
                                        value={newTorrentUrl}
                                        onChange={(e) => setNewTorrentUrl(e.target.value)}
                                        placeholder="magnet:?xt=urn:btih:..."
                                        className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                        required
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Fichier .torrent</label>
                                    <div className="flex items-center justify-center w-full">
                                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-750 transition-colors">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <FileDown className="w-8 h-8 mb-3 text-gray-400" />
                                                <p className="mb-2 text-sm text-gray-400">
                                                    <span className="font-semibold">Cliquez pour upload</span>
                                                </p>
                                                <p className="text-xs text-gray-500">.torrent uniquement</p>
                                                {torrentFiles && torrentFiles.length > 0 && (
                                                    <p className="mt-2 text-sm text-indigo-400 font-medium truncate max-w-[200px]">
                                                        {torrentFiles[0].name}
                                                    </p>
                                                )}
                                            </div>
                                            <input 
                                                id="dropzone-file" 
                                                type="file" 
                                                className="hidden" 
                                                accept=".torrent"
                                                onChange={(e) => setTorrentFiles(e.target.files)}
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg transition-colors"
                                >
                                    Ajouter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && torrentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-2">Supprimer le torrent</h2>
                        <p className="text-gray-400 mb-6">
                            Voulez-vous supprimer <span className="text-white font-medium">"{torrentToDelete.name}"</span> ?
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => confirmDelete(false)}
                                className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Supprimer le torrent uniquement
                            </button>
                            
                            <button
                                onClick={() => confirmDelete(true)}
                                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <HardDrive className="h-4 w-4" />
                                Supprimer torrent + fichiers
                            </button>
                            
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false)
                                    setTorrentToDelete(null)
                                }}
                                className="w-full px-4 py-2 text-gray-400 hover:text-white mt-2"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
