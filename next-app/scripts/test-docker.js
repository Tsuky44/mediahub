
const Docker = require('dockerode');
const fs = require('fs');

async function testDocker() {
    console.log('--- DOCKER DIAGNOSTIC ---');
    console.log('Node version:', process.version);
    console.log('User:', require('os').userInfo().username);
    
    // Check environment
    console.log('DOCKER_HOST env:', process.env.DOCKER_HOST || 'Not set');
    
    const socketPath = '/var/run/docker.sock';
    console.log(`Checking socket: ${socketPath}`);
    
    try {
        if (fs.existsSync(socketPath)) {
            const stats = fs.statSync(socketPath);
            console.log('Socket exists.');
            console.log('Permissions:', stats.mode.toString(8));
            console.log('Owner UID:', stats.uid);
            console.log('Owner GID:', stats.gid);
            
            try {
                fs.accessSync(socketPath, fs.constants.R_OK | fs.constants.W_OK);
                console.log('SUCCESS: Process has Read/Write access to socket.');
            } catch (err) {
                console.error('ERROR: Process CANNOT read/write socket:', err.message);
            }
        } else {
            console.error('ERROR: Socket file not found at', socketPath);
        }
    } catch (err) {
        console.error('ERROR checking socket file:', err.message);
    }

    console.log('\n--- ATTEMPTING CONNECTION ---');
    try {
        const docker = new Docker({ socketPath: socketPath });
        console.log('Docker client initialized.');
        
        console.log('Listing containers...');
        const containers = await docker.listContainers({ all: true });
        console.log(`SUCCESS: Found ${containers.length} containers.`);
        
        if (containers.length > 0) {
            const c = containers[0];
            console.log(`First container: ${c.Names[0]} (ID: ${c.Id.substring(0, 12)})`);
            
            // Try to inspect to verify full access
            const container = docker.getContainer(c.Id);
            const info = await container.inspect();
            console.log('Inspect success. State:', info.State.Status);
        }
        
    } catch (err) {
        console.error('CRITICAL DOCKER ERROR:', err);
        if (err.code === 'EACCES' || err.code === 'EPERM') {
            console.error('>>> PERMISSION DENIED. The container user cannot access the Docker socket.');
        }
    }
}

testDocker();
