import { notFound } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { fileShares } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ShareClient } from './ShareClient';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const [share] = await db.select().from(fileShares).where(eq(fileShares.token, token));

    if (!share) {
        notFound();
    }

    const isExpired = share.expiresAt && share.expiresAt < new Date();
    const fileName = share.filePath.split('/').pop() || 'Fichier';

    return (
        <ShareClient
            token={token}
            fileName={fileName}
            isExpired={!!isExpired}
            hasPassword={!!share.password}
        />
    );
}
