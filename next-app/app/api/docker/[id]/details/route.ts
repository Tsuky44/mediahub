import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DockerService } from '@/lib/services/docker';
import { defineAbilityFor } from '@/lib/ability';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSession();
        
        const user = session?.user as any
        const ability = defineAbilityFor(user)

        if (!session || !ability.can('read_details', 'Docker')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const details = await DockerService.getContainerDetails(id);

        return NextResponse.json(details);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        const message = error.json?.message || error.message || 'Internal Server Error';
        
        console.error(`[API] Error in /api/docker/details for ID "${(await params).id}":`, {
            statusCode,
            message,
            error: error.json || error
        });
        
        return NextResponse.json(
            { error: message, code: statusCode }, 
            { status: statusCode }
        );
    }
}
