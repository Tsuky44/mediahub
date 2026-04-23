
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDockerSettings() {
    try {
        console.log('Checking "docker_host" setting in database...');
        
        const setting = await prisma.setting.findFirst({
            where: { key: 'docker_host' }
        });

        if (setting) {
            console.log(`Found existing setting: ${setting.value}`);
            console.log('Deleting "docker_host" setting to force usage of local /var/run/docker.sock ...');
            
            await prisma.setting.delete({
                where: { key: 'docker_host' }
            });
            
            console.log('SUCCESS: Setting deleted. The app will now default to the local socket.');
        } else {
            console.log('No "docker_host" setting found. The app is already using the default configuration (env or /var/run/docker.sock).');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

fixDockerSettings();
