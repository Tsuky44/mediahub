import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmbyService } from '@/lib/services/emby';

export async function POST(request: NextRequest) {
    try {
        const { username } = await request.json();

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        const inputLower = username.toLowerCase();
        const searchName = username.includes('@') ? username.split('@')[0] : username;
        const searchNameLower = searchName.toLowerCase();

        // 1. Fetch all instances
        if (!prisma || !(prisma as any).instance) {
            console.error('[Auth Discover] Prisma or Instance model not available');
            return NextResponse.json({ instances: [] });
        }
        const allInstances = await (prisma as any).instance.findMany();
        
        // 2. Check each instance for the user
        const discoveryResults = await Promise.all(allInstances.map(async (instance: any) => {
            const embyService = new EmbyService(instance.embyUrl, instance.embyApiKey);
            
            // Try to find the user in Emby by name or email
            try {
                const embyUsers = await embyService.getUsers();
                
                const foundInEmby = embyUsers.find((u: any) => {
                    const embyNameLower = (u.Name || '').toLowerCase();
                    const embyEmailLower = (u.Email || '').toLowerCase();
                    // Emby Connect Email is often in a specific field
                    const embyConnectEmail = (u.ConnectEmail || u.ConnectUserName || '').toLowerCase();
                    
                    return embyNameLower === inputLower || 
                           embyEmailLower === inputLower ||
                           embyConnectEmail === inputLower ||
                           embyNameLower === searchNameLower;
                });

                if (foundInEmby) {
                    return instance;
                }
            } catch (e) {
                // If getUsers fails, fallback to local DB
                const localUser = await (prisma as any).user.findFirst({
                    where: {
                        instanceId: instance.id,
                        OR: [
                            { name: { equals: username } },
                            { email: { equals: username } }
                        ]
                    }
                });
                if (localUser) return instance;
            }

            return null;
        }));

        // 3. Filter and return unique instances
        const instances = discoveryResults
            .filter((i): i is any => i !== null)
            .map((i) => ({
                id: i.id,
                name: i.name,
                slug: i.slug,
                embyUrl: i.embyUrl
            }))
            .filter((instance, index, self) =>
                index === self.findIndex((t) => t.id === instance.id)
            );

        return NextResponse.json({ instances });
    } catch (error) {
        console.error('[Auth Discover] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
