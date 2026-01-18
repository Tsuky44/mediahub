import React, { useEffect, useState } from 'react';
import { X, Server, Database, Network, Box, Terminal, Cpu, Info, Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface ContainerDetailsProps {
    containerId: string;
    containerName: string;
    onClose: () => void;
}

interface ContainerInfo {
    id: string;
    name: string;
    image: string;
    cmd: string;
    env: string[];
    volumes: {
        source: string;
        destination: string;
        mode: string;
        rw: boolean;
    }[];
    ports: {
        container: string;
        host: string | null;
    }[];
    labels: Record<string, string>;
    networkMode: string;
    restartPolicy: string;
    created: string;
    platform: string;
}

export default function ContainerDetails({ containerId, containerName, onClose }: ContainerDetailsProps) {
    const [details, setDetails] = useState<ContainerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'env' | 'volumes' | 'network'>('info');
    const [copiedId, setCopiedId] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/docker/${containerId}/details`);
                const data = await res.json();
                
                if (!res.ok) {
                    const errorMsg = data.error || `Error ${res.status}`;
                    const detailedMsg = res.status === 403 
                        ? `${errorMsg} (Vérifiez les permissions du proxy Docker : CONTAINERS=1)` 
                        : errorMsg;
                    throw new Error(detailedMsg);
                }
                
                setDetails(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (containerId) {
            fetchDetails();
        }
    }, [containerId]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    if (!containerId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Box className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Configuration
                                <span className="text-gray-500 text-sm font-normal">/ {containerName}</span>
                            </h2>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-48 bg-gray-900/50 border-r border-gray-700/30 p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left whitespace-nowrap",
                                activeTab === 'info' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                            )}
                        >
                            <Info className="w-4 h-4" />
                            Général
                        </button>
                        <button
                            onClick={() => setActiveTab('env')}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left whitespace-nowrap",
                                activeTab === 'env' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                            )}
                        >
                            <Terminal className="w-4 h-4" />
                            Variables (ENV)
                        </button>
                        <button
                            onClick={() => setActiveTab('volumes')}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left whitespace-nowrap",
                                activeTab === 'volumes' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                            )}
                        >
                            <Database className="w-4 h-4" />
                            Volumes
                        </button>
                        <button
                            onClick={() => setActiveTab('network')}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left whitespace-nowrap",
                                activeTab === 'network' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                            )}
                        >
                            <Network className="w-4 h-4" />
                            Réseau & Ports
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-black/20">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                <p className="text-sm">Chargement de la configuration...</p>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-full text-red-400 gap-2">
                                <Info className="w-5 h-5" />
                                <p>{error}</p>
                            </div>
                        ) : details ? (
                            <div className="space-y-6 max-w-3xl mx-auto">
                                {/* Info Tab */}
                                {activeTab === 'info' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Image</label>
                                                <p className="text-sm text-gray-200 font-mono break-all">{details.image}</p>
                                            </div>
                                            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 space-y-1 relative group">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Container ID</label>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-gray-200 font-mono">{details.id.substring(0, 12)}</p>
                                                    <button 
                                                        onClick={() => copyToClipboard(details.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                                                        title="Copier ID complet"
                                                    >
                                                        {copiedId ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Platform</label>
                                                <p className="text-sm text-gray-200">{details.platform}</p>
                                            </div>
                                            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Création</label>
                                                <p className="text-sm text-gray-200">{new Date(details.created).toLocaleString()}</p>
                                            </div>
                                            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 space-y-1 md:col-span-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Commande</label>
                                                <p className="text-sm text-gray-300 font-mono bg-black/30 p-2 rounded-lg mt-1 border border-gray-700/30">
                                                    {details.cmd || 'Aucune commande spécifique'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Env Tab */}
                                {activeTab === 'env' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase">Variables d'environnement</h3>
                                            <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-500">{details.env.length} variables</span>
                                        </div>
                                        <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-900/50 text-gray-500 font-medium">
                                                        <tr>
                                                            <th className="px-4 py-3 w-1/3">Clé</th>
                                                            <th className="px-4 py-3">Valeur</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-700/30">
                                                        {details.env.map((envStr, i) => {
                                                            const [key, ...rest] = envStr.split('=');
                                                            const value = rest.join('=');
                                                            return (
                                                                <tr key={i} className="hover:bg-gray-700/10 transition-colors">
                                                                    <td className="px-4 py-3 font-mono text-blue-400 font-medium">{key}</td>
                                                                    <td className="px-4 py-3 font-mono text-gray-300 break-all">{value}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Volumes Tab */}
                                {activeTab === 'volumes' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase">Points de montage</h3>
                                            <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-500">{details.volumes.length} montages</span>
                                        </div>
                                        <div className="space-y-3">
                                            {details.volumes.map((vol, i) => (
                                                <div key={i} className="bg-gray-800/30 rounded-xl border border-gray-700/30 p-4 flex flex-col md:flex-row md:items-center gap-4 group hover:bg-gray-800/50 transition-colors">
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                                                            <Server className="w-3 h-3" /> Hôte (Source)
                                                        </div>
                                                        <p className="text-sm font-mono text-yellow-400 break-all">{vol.source}</p>
                                                    </div>
                                                    <div className="hidden md:flex text-gray-600">
                                                        →
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                                                            <Database className="w-3 h-3" /> Conteneur (Dest)
                                                        </div>
                                                        <p className="text-sm font-mono text-green-400 break-all">{vol.destination}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx("px-2 py-1 rounded text-xs font-bold border", vol.rw ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20")}>
                                                            {vol.rw ? 'RW' : 'RO'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {details.volumes.length === 0 && (
                                                <div className="text-center py-10 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-700/30 border-dashed">
                                                    Aucun volume monté
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Network Tab */}
                                {activeTab === 'network' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Mode Réseau</label>
                                                <p className="text-sm text-gray-200 font-mono">{details.networkMode}</p>
                                            </div>
                                            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Politique de redémarrage</label>
                                                <p className="text-sm text-gray-200">{details.restartPolicy}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase">Mappage des Ports</h3>
                                            <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-900/50 text-gray-500 font-medium">
                                                        <tr>
                                                            <th className="px-4 py-3">Port Conteneur</th>
                                                            <th className="px-4 py-3">Port Hôte</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-700/30">
                                                        {details.ports.map((port, i) => (
                                                            <tr key={i} className="hover:bg-gray-700/10 transition-colors">
                                                                <td className="px-4 py-3 font-mono text-gray-300">{port.container}</td>
                                                                <td className="px-4 py-3 font-mono text-blue-400">
                                                                    {port.host ? (
                                                                        <span className="flex items-center gap-2">
                                                                            {port.host}
                                                                            <a 
                                                                                href={`http://${window.location.hostname}:${port.host}`} 
                                                                                target="_blank" 
                                                                                rel="noreferrer"
                                                                                className="text-gray-500 hover:text-white"
                                                                                title="Ouvrir"
                                                                            >
                                                                                <Info className="w-3 h-3" />
                                                                            </a>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-gray-600 italic">Non exposé</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {details.ports.length === 0 && (
                                                            <tr>
                                                                <td colSpan={2} className="px-4 py-8 text-center text-gray-500 italic">
                                                                    Aucun port exposé
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
