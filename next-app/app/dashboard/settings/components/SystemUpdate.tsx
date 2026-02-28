import { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertCircle, CheckCircle, Loader2, Server, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ContainerUpdateStatus {
    name: string;
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    imageName: string;
    error?: string;
}

interface SystemUpdateStatus {
    app: ContainerUpdateStatus;
    tracker: ContainerUpdateStatus | null;
    checkedAt: string;
}

export const SystemUpdate = () => {
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [status, setStatus] = useState<SystemUpdateStatus | null>(null);

    const checkUpdate = async (force: boolean = false) => {
        setLoading(true);
        try {
            const url = force === true ? '/api/admin/system/update?force=true' : '/api/admin/system/update';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to check for updates');
            const data = await res.json();
            setStatus(data);
            
            const hasUpdates = data.app.updateAvailable || (data.tracker && data.tracker.updateAvailable);
            
            if (hasUpdates) {
                toast.success('Mise à jour disponible !');
            } else if (force === true) {
                toast.success('Système à jour');
            }
        } catch (error) {
            console.error(error);
            toast.error('Impossible de vérifier les mises à jour');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUpdate(false);
    }, []);

    const performUpdate = async () => {
        if (!confirm('Êtes-vous sûr de vouloir mettre à jour les conteneurs ? Les services seront interrompus pendant quelques instants.')) return;
        
        setUpdating(true);
        try {
            const res = await fetch('/api/admin/system/update', { method: 'POST' });
            if (!res.ok) throw new Error('Update failed');
            
            toast.success('Mise à jour lancée ! Les conteneurs vont redémarrer...');
            // Reload page after a delay
            setTimeout(() => {
                window.location.reload();
            }, 15000); // Increased delay for multiple containers
            
        } catch (error) {
            console.error(error);
            toast.error('Échec du lancement de la mise à jour');
            setUpdating(false);
        }
    };

    const ContainerStatusCard = ({ status, icon: Icon }: { status: ContainerUpdateStatus, icon: any }) => (
        <div className="bg-black/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <Icon size={18} className="text-indigo-400" />
                <span className="font-medium text-gray-200">{status.name}</span>
                {status.error && (
                    <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded ml-auto">
                        Erreur
                    </span>
                )}
            </div>
            
            {status.error ? (
                <div className="text-sm text-red-400/80">{status.error}</div>
            ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wider">Image</span>
                        <code className="text-gray-300 text-xs break-all">{status.imageName}</code>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wider">Version</span>
                        <code className="text-blue-400 font-mono">{status.currentVersion}</code>
                    </div>
                </div>
            )}

            {status.updateAvailable && (
                 <div className="bg-green-500/10 border border-green-500/20 rounded p-2 flex items-center gap-2 mt-2">
                    <CheckCircle size={14} className="text-green-400" />
                    <div>
                        <span className="text-green-400 text-sm font-medium block">Mise à jour disponible</span>
                        <span className="text-gray-400 text-xs">Nouvelle version : {status.latestVersion}</span>
                    </div>
                </div>
            )}
            
            {!status.updateAvailable && !status.error && (
                <div className="flex items-center gap-2 text-gray-500 text-sm mt-2 pt-2 border-t border-white/5">
                    <CheckCircle size={14} className="text-green-600" />
                    À jour
                </div>
            )}
        </div>
    );

    const hasUpdates = status && (status.app.updateAvailable || (status.tracker?.updateAvailable));

    return (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <RefreshCw size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white">Mise à jour du système</h3>
                        <p className="text-sm text-gray-400">Gérer les mises à jour des conteneurs (App & Tracker)</p>
                    </div>
                </div>
                
                <button
                    onClick={() => checkUpdate(true)}
                    disabled={loading || updating}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                    Vérifier
                </button>
            </div>

            {status && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ContainerStatusCard status={status.app} icon={Server} />
                        {status.tracker && <ContainerStatusCard status={status.tracker} icon={Activity} />}
                    </div>

                    {hasUpdates && (
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={performUpdate}
                                disabled={updating}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2 font-medium"
                            >
                                {updating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                Tout mettre à jour
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
