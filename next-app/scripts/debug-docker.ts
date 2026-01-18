
import Docker from 'dockerode';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDocker() {
    console.log('--- Debugging Docker Connection & Actions ---');

    try {
        // 1. Get Settings
        const setting = await prisma.setting.findFirst({
            where: { key: 'docker_host' }
        });

        console.log('Database Setting for docker_host:', setting?.value);
        const dockerHost = setting?.value || process.env.DOCKER_HOST || '/var/run/docker.sock';
        console.log('Using Docker Host:', dockerHost);

        // 2. Initialize Dockerode
        const options: any = {};
        if (dockerHost.startsWith('tcp://')) {
            const url = new URL(dockerHost.replace('tcp://', 'http://'));
            options.host = url.hostname;
            options.port = url.port;
        } else {
            options.socketPath = dockerHost;
        }

        console.log('Dockerode Options:', options);
        const docker = new Docker(options);

        // 3. List Containers
        console.log('\nListing containers...');
        const containers = await docker.listContainers({ all: true });
        console.log(`Found ${containers.length} containers.`);
        
        if (containers.length > 0) {
            console.log('First 3 containers:');
            containers.slice(0, 3).forEach(c => console.log(`- [${c.State}] ${c.Names[0]} (ID: ${c.Id.substring(0, 12)})`));

            // 4. Try to Inspect a specific container (e.g., the first one)
            const targetContainer = containers[0];
            // Name often comes with a slash, e.g. "/my-container"
            let name = targetContainer.Names[0]; 
            if (name.startsWith('/')) name = name.substring(1);

            console.log(`\nAttempting to inspect container by Name: "${name}"`);
            const containerByName = docker.getContainer(name);
            try {
                const info = await containerByName.inspect();
                console.log('Inspect by Name SUCCESS. ID:', info.Id);
            } catch (err: any) {
                console.error('Inspect by Name FAILED:', err.message);
            }

            console.log(`\nAttempting to inspect container by ID: "${targetContainer.Id}"`);
            const containerById = docker.getContainer(targetContainer.Id);
            try {
                const info = await containerById.inspect();
                console.log('Inspect by ID SUCCESS. ID:', info.Id);
            } catch (err: any) {
                console.error('Inspect by ID FAILED:', err.message);
            }

        } else {
            console.log('No containers found to test actions.');
        }

    } catch (error: any) {
        console.error('Debug Script Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugDocker();
