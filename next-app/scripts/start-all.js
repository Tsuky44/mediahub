const { spawn } = require('child_process');
const http = require('http');
const net = require('net');

// ---------------------------------------------------------
// 1. CONFIGURATION DES PORTS
// ---------------------------------------------------------
// Le proxy principal écoutera sur le port exposé à l'extérieur (ex: 3008)
const PROXY_PORT = parseInt(process.env.PORT || '3008', 10);
// Next.js tournera en interne sur le port 3006
const NEXT_PORT = 3006;
// Le Tracker tournera en interne sur le port 3005
const TRACKER_PORT = parseInt(process.env.TRACKER_WS_PORT || '3005', 10);

console.log(`[Orchestrator] Configuration des ports :`);
console.log(`  - Proxy Principal (Public)  : ${PROXY_PORT}`);
console.log(`  - Serveur Next.js (Interne) : ${NEXT_PORT}`);
console.log(`  - Tracker (Interne)         : ${TRACKER_PORT}`);

// ---------------------------------------------------------
// 2. DÉMARRAGE DES SOUS-PROCESSUS
// ---------------------------------------------------------
const processes = {};

function startChildProcess(name, command, args, extraEnv = {}) {
  console.log(`[Orchestrator] Démarrage de '${name}' : ${command} ${args.join(' ')}`);
  
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  });

  child.on('close', (code) => {
    console.error(`[Orchestrator] Le processus '${name}' s'est arrêté avec le code ${code}`);
    // Si l'un des services s'arrête, on arrête tout l'orchestrateur pour que Docker redémarre le conteneur
    process.exit(code || 1);
  });

  processes[name] = child;
  return child;
}

// Lancer le tracker (port 3005)
const trackerProcess = startChildProcess(
  'tracker', 
  'node_modules/.bin/tsx', 
  ['scripts/emby-tracker.ts'], 
  { TRACKER_WS_PORT: TRACKER_PORT.toString() }
);

// Lancer l'application Next.js (port interne 3006)
const appProcess = startChildProcess(
  'app', 
  'node', 
  ['server.js'], 
  { PORT: NEXT_PORT.toString() }
);

// ---------------------------------------------------------
// 3. REVERSE PROXY INTÉGRÉ AVEC http-proxy (HTTP + WEBSOCKETS)
// ---------------------------------------------------------
// Ce proxy permet de n'exposer qu'un seul port (3008) à l'extérieur.
// Il redirige automatiquement :
// - /socket.io/* vers le Tracker (WebSocket & Polling)
// - Tout le reste vers Next.js
const httpProxy = require('http-proxy');

// Créer l'instance de proxy
const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true
});

const proxyServer = http.createServer((req, res) => {
  const isSocketIo = req.url.startsWith('/socket.io');
  const targetPort = isSocketIo ? TRACKER_PORT : NEXT_PORT;
  const target = `http://127.0.0.1:${targetPort}`;

  proxy.web(req, res, { target }, (err) => {
    console.error(`[Proxy HTTP Error] Impossible de joindre ${isSocketIo ? 'Tracker' : 'Next.js'} (${target}) : ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
    }
  });
});

// Gérer l'Upgrade HTTP vers WebSocket pour Socket.io
proxyServer.on('upgrade', (req, socket, head) => {
  const isSocketIo = req.url.startsWith('/socket.io');
  const targetPort = isSocketIo ? TRACKER_PORT : NEXT_PORT;
  const target = `http://127.0.0.1:${targetPort}`;

  proxy.ws(req, socket, head, { target }, (err) => {
    console.error(`[Proxy Upgrade Error] Échec de la redirection WebSocket vers le port ${targetPort} : ${err.message}`);
    socket.end();
  });
});

proxyServer.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[Orchestrator] Reverse Proxy robuste démarré avec succès sur le port ${PROXY_PORT}`);
});

// ---------------------------------------------------------
// 4. GESTION DES SIGNAUX D'ARRÊT
// ---------------------------------------------------------
const handleShutdown = (signal) => {
  console.log(`[Orchestrator] Signal ${signal} reçu. Arrêt propre des services...`);
  
  if (proxyServer) {
    proxyServer.close();
  }
  
  if (processes.tracker) {
    processes.tracker.kill(signal);
  }
  if (processes.app) {
    processes.app.kill(signal);
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
