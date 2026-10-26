import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const LOG_FILE = '/data/db/update.log';

// GET: Read update logs
export async function GET(req: Request) {
    try {
        const session = await getSession();
        
        // Check admin permissions
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.email, session.user.email)
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!fs.existsSync(LOG_FILE)) {
            return NextResponse.json({ 
                logs: '', 
                status: 'idle',
                message: 'Aucune mise à jour en cours ou fichier de log introuvable.' 
            });
        }

        const logs = fs.readFileSync(LOG_FILE, 'utf8');

        // Determine current state based on log content
        let status = 'in_progress';
        let message = 'Mise à jour en cours...';

        if (logs.includes('=== 🎉 Processus de mise à jour accompli avec succès ! ===')) {
            status = 'success';
            message = 'Mise à jour terminée avec succès ! Redémarrage...';
        } else if (logs.includes('✅ ROLLBACK ACCOMPLI AVEC SUCCÈS')) {
            status = 'failed_rollback';
            message = 'Échec de la mise à jour, rollback effectué de sécurité.';
        } else if (logs.includes('❌ ERREUR CATASTROPHIQUE')) {
            status = 'failed_critical';
            message = 'Échec critique de la mise à jour et du rollback. Vérifiez les conteneurs !';
        } else if (logs.includes('🚨 ERREUR CRITIQUE PENDANT LA MISE À JOUR') && !logs.includes('Rollback')) {
            status = 'failed';
            message = 'Une erreur est survenue pendant la mise à jour.';
        }

        // Parse structured progress from logs
        let step: string | null = null;
        let progressPercent = 0;
        let progressCurrentMB = 0;
        let progressTotalMB = 0;

        const logLines = logs.split('\n');
        for (let i = logLines.length - 1; i >= 0; i--) {
            const line = logLines[i];
            if (!step) {
                const stepMatch = line.match(/\[STEP\]\s*(.+)/);
                if (stepMatch) step = stepMatch[1].trim();
            }
            if (line.includes('[PROGRESS]')) {
                const progressMatch = line.match(/\[PROGRESS\]\s+\w+\s+(\d+)%\s+\((\d+)MB\/(\d+)MB\)/);
                if (progressMatch) {
                    progressPercent = parseInt(progressMatch[1], 10);
                    progressCurrentMB = parseInt(progressMatch[2], 10);
                    progressTotalMB = parseInt(progressMatch[3], 10);
                    break;
                }
            }
        }

        return NextResponse.json({ logs, status, message, step, progressPercent, progressCurrentMB, progressTotalMB });

    } catch (error: any) {
        console.error('[UpdateLogsAPI] Failed to read logs:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
