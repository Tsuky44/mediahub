import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const userEmail = session.user.email;
        const userName = session.user.name;
        const emailPrefix = userEmail.includes('@') ? userEmail.split('@')[0] : userEmail;

        // On cherche tous les utilisateurs qui ont cet email, ce nom ou le même préfixe d'email
        // pour trouver les instances associées
        const userRecords = await (prisma as any).user.findMany({
            where: {
                OR: [
                    { email: { contains: userEmail } }, // Utilise contains pour la flexibilité SQLite
                    { email: { startsWith: `${emailPrefix}@` } },
                    userName ? { name: { contains: userName } } : {}
                ]
            },
            include: {
                instance: true
            }
        });

        const instances = userRecords
            .map((record: any) => ({
                id: record.instance.id,
                name: record.instance.name,
                slug: record.instance.slug,
                embyUrl: record.instance.embyUrl,
                current: record.instanceId.toString() === (session.user as any).instanceId
            }))
            .filter((instance: any, index: number, self: any[]) =>
                index === self.findIndex((t) => t.id === instance.id)
            )
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        return NextResponse.json({ instances });
    } catch (error) {
        console.error('[User Instances] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
