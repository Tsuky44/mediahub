import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { DocumentIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const share = await prisma.fileShare.findUnique({
        where: { token }
    });

    if (!share) {
        notFound();
    }

    // Check expiration
    const isExpired = share.expiresAt && share.expiresAt < new Date();
    const fileName = share.filePath.split('/').pop() || 'Fichier';

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                        <DocumentIcon className="w-10 h-10 text-indigo-500" />
                    </div>
                    
                    <h1 className="text-2xl font-bold text-white mb-2 truncate w-full">
                        {fileName}
                    </h1>
                    <p className="text-gray-400 text-sm mb-8">
                        Un fichier a été partagé avec vous
                    </p>

                    {isExpired ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center text-red-400 mb-6">
                            <ExclamationTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-sm">Ce lien de partage a expiré.</span>
                        </div>
                    ) : (
                        <a 
                            href={`/api/share/download?token=${token}`}
                            className="w-full flex items-center justify-center px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            <ArrowDownTrayIcon className="w-6 h-6 mr-3" />
                            Télécharger le fichier
                        </a>
                    )}

                    <div className="mt-8 pt-8 border-t border-gray-800 w-full">
                        <p className="text-xs text-gray-500">
                            Partagé via Emby Dashboard
                        </p>
                    </div>
                </div>
            </div>
            
            <Link 
                href="/"
                className="mt-8 text-gray-500 hover:text-gray-400 text-sm font-medium transition-colors"
            >
                Retour à l'accueil
            </Link>
        </div>
    );
}
