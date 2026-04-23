import React, { useEffect, useState } from 'react';
import { X, Server, Database, Network, Box, Terminal, Cpu, Info, Copy, Check, RotateCw } from 'lucide-react';
import { clsx } from 'clsx';

interface ContainerDetailsProps {
    containerId: string;
    containerName: string;
    onClose: () => void;
    canReadDetails?: boolean;
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

export default function ContainerDetails({ containerId, containerName, onClose, canReadDetails = false }: ContainerDetailsProps) {
    const [details, setDetails] = useState<ContainerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'env' | 'volumes' | 'network'>('info');
    const [copiedId, setCopiedId] = useState(false);

    if (!canReadDetails) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                <div className="bg-gray-900/90 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-red-500/5">
                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                        <X className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white mb-2">Accès Refusé</h2>
                        <p className="text-gray-400">Vous n'avez pas la permission de voir la configuration de ce conteneur.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-bold w-full"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        )
    }

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
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 bg-black/20 border-r border-white/5 p-3 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all w-full text-left whitespace-nowrap group relative overflow-hidden",
                                activeTab === 'info' 
                                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20" 
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Info className={clsx("w-5 h-5 transition-colors", activeTab === 'info' ? "text-white" : "text-gray-500 group-hover:text-white")} />
                            Général
                        </button>
                        <button
                            onClick={() => setActiveTab('env')}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all w-full text-left whitespace-nowrap group relative overflow-hidden",
                                activeTab === 'env' 
                                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20" 
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Terminal className={clsx("w-5 h-5 transition-colors", activeTab === 'env' ? "text-white" : "text-gray-500 group-hover:text-white")} />
                            Variables (ENV)
                        </button>
                        <button
                            onClick={() => setActiveTab('volumes')}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all w-full text-left whitespace-nowrap group relative overflow-hidden",
                                activeTab === 'volumes' 
                                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20" 
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Database className={clsx("w-5 h-5 transition-colors", activeTab === 'volumes' ? "text-white" : "text-gray-500 group-hover:text-white")} />
                            Volumes
                        </button>
                        <button
                            onClick={() => setActiveTab('network')}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all w-full text-left whitespace-nowrap group relative overflow-hidden",
                                activeTab === 'network' 
                                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20" 
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Network className={clsx("w-5 h-5 transition-colors", activeTab === 'network' ? "text-white" : "text-gray-500 group-hover:text-white")} />
                            Réseau & Ports
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-transparent relative scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                <p className="text-sm font-bold animate-pulse text-indigo-400">Chargement de la configuration...</p>
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
                                {/* Info Tab */}
                                {activeTab === 'info' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-6 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 space-y-3 hover:bg-white/[0.03] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                                    <Box className="w-4 h-4" /> Image
                                                </label>
                                                <p className="text-sm text-white font-mono break-all leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors shadow-inner">
                                                    {details.image}
                                                </p>
                                            </div>
                                            <div className="p-6 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 space-y-3 hover:bg-white/[0.03] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                                    <Cpu className="w-4 h-4" /> Container ID
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-white font-mono bg-black/40 p-3 rounded-xl border border-white/5 flex-1 group-hover:border-white/10 transition-colors shadow-inner">
                                                        {details.id.substring(0, 12)}
                                                    </p>
                                                    <button 
                                                        onClick={() => copyToClipboard(details.id)}
                                                        className="p-3 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-xl transition-all text-gray-500 border border-transparent hover:border-indigo-500/30 active:scale-95"
                                                        title="Copier ID complet"
                                                    >
                                                        {copiedId ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 space-y-3 hover:bg-white/[0.03] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Platform</label>
                                                <p className="text-sm text-white font-bold">{details.platform}</p>
                                            </div>
                                            <div className="p-6 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 space-y-3 hover:bg-white/[0.03] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Création</label>
                                                <p className="text-sm text-white font-bold">{new Date(details.created).toLocaleString()}</p>
                                            </div>
                                            <div className="p-6 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 space-y-3 md:col-span-2 hover:bg-white/[0.03] transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                                    <Terminal className="w-4 h-4" /> Commande
                                                </label>
                                                <p className="text-sm text-gray-300 font-mono bg-black/40 p-4 rounded-xl mt-1 border border-white/5 overflow-x-auto group-hover:border-white/10 transition-colors shadow-inner">
                                                    {details.cmd || 'Aucune commande spécifique'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Env Tab */}
                                {activeTab === 'env' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Variables d'environnement</h3>
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
                                                            const [key, ...rest] = envStr.split('=');
                                                            const value = rest.join('=');
                                                            return (
                                                                <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                                                    <td className="px-6 py-4 font-mono text-indigo-400 font-medium group-hover:text-indigo-300 transition-colors">{key}</td>
                                                                    <td className="px-6 py-4 font-mono text-gray-300 break-all group-hover:text-white transition-colors">{value}</td>
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
                                                <div key={i} className="bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 p-6 flex flex-col md:flex-row md:items-center gap-6 group hover:bg-white/[0.03] transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-black/40 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                                    
                                                    <div className="flex-1 space-y-2 relative z-10">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                                                            <Server className="w-3.5 h-3.5" /> Hôte (Source)
                                                        </div>
                                                        <p className="text-sm font-mono text-gray-300 break-all bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner group-hover:border-white/10 transition-colors">
                                                            {vol.source}
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
                                                            {vol.destination}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 self-start md:self-center relative z-10">
                                                        <span className={clsx(
                                                            "px-3 py-1.5 rounded-xl text-xs font-black border shadow-lg backdrop-blur-md", 
                                                            vol.rw 
                                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10" 
                                                                : "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/10"
                                                        )}>
                                                            {vol.rw ? 'RW' : 'RO'}
                                                        </span>
                                                    </div>
                                                </div>
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
                                )}

                                {/* Network Tab */}
                                {activeTab === 'network' && (
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
                                                                                    href={`http://${window.location.hostname}:${port.host}`} 
                                                                                    target="_blank" 
                                                                                    rel="noreferrer"
                                                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                                                                    title="Ouvrir dans un nouvel onglet"
                                                                                >
                                                                                    <Info className="w-4 h-4" />
                                                                                </a>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-600 italic text-xs bg-white/5 px-2 py-1 rounded-lg">Non exposé</span>
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
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
