const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

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

// ---------------------------------------------------------
// 3a. ATTENTE DES SERVICES AU DÉMARRAGE
// ---------------------------------------------------------
// Le proxy écoute tout de suite, mais Next.js et le tracker mettent quelques
// secondes à ouvrir leur port. Les onglets restés ouverts pendant une mise à jour
// relancent leurs requêtes immédiatement : au lieu de leur renvoyer une erreur
// (ECONNREFUSED / 502), on les garde en attente jusqu'à ce que le service réponde.
const STARTUP_WAIT_MAX_MS = 60_000;
const PROBE_INTERVAL_MS = 200;

const services = {
  [NEXT_PORT]: { name: 'Next.js', ready: false, waiting: [] },
  [TRACKER_PORT]: { name: 'Tracker', ready: false, waiting: [] },
};

function probe(port) {
  const service = services[port];
  const socket = net.connect(port, '127.0.0.1');
  socket.once('connect', () => {
    socket.destroy();
    service.ready = true;
    const pending = service.waiting.splice(0);
    console.log(`[Orchestrator] ${service.name} prêt${pending.length ? ` : ${pending.length} requête(s) en attente transmise(s)` : ''}`);
    pending.forEach((entry) => {
      clearTimeout(entry.timer);
      entry.run();
    });
  });
  socket.once('error', () => {
    socket.destroy();
    setTimeout(() => probe(port), PROBE_INTERVAL_MS);
  });
}
probe(NEXT_PORT);
probe(TRACKER_PORT);

/** Exécute `run` dès que le service est prêt (ou `onTimeout` s'il ne l'est jamais). */
function whenReady(port, run, onTimeout) {
  const service = services[port];
  if (service.ready) return run();
  const entry = { run };
  entry.timer = setTimeout(() => {
    service.waiting.splice(service.waiting.indexOf(entry), 1);
    onTimeout();
  }, STARTUP_WAIT_MAX_MS);
  service.waiting.push(entry);
}

// ---------------------------------------------------------
// 3b. ACTIONS SERVEUR D'UNE ANCIENNE VERSION
// ---------------------------------------------------------
// Après une mise à jour, un onglet ouvert garde l'ancien JavaScript : ses server
// actions n'existent plus (les identifiants changent à chaque build). Next.js
// répond « introuvable » mais écrit une erreur dans les logs à chaque appel.
// On répond ici exactement comme lui (404 + en-tête x-nextjs-action-not-found,
// que le client utilise pour recharger la page), sans réveiller Next.js.
const ACTION_MANIFEST = path.join(__dirname, '..', '.next', 'server', 'server-reference-manifest.json');
let knownActions = null;
try {
  const manifest = JSON.parse(fs.readFileSync(ACTION_MANIFEST, 'utf8'));
  knownActions = new Set([...Object.keys(manifest.node || {}), ...Object.keys(manifest.edge || {})]);
} catch {
  console.warn('[Orchestrator] Manifeste des server actions introuvable : filtrage désactivé');
}

let staleActionCount = 0;
let staleActionLogAt = 0;
function isStaleAction(req) {
  const actionId = req.headers['next-action'];
  if (!knownActions || typeof actionId !== 'string' || knownActions.has(actionId)) return false;
  staleActionCount++;
  // Une ligne par minute au plus, au lieu d'une erreur par requête
  if (Date.now() - staleActionLogAt > 60_000) {
    staleActionLogAt = Date.now();
    console.log(`[Proxy] ${staleActionCount} appel(s) d'une ancienne version de la page : rechargement demandé au navigateur`);
    staleActionCount = 0;
  }
  return true;
}

const proxyServer = http.createServer((req, res) => {
  const isSocketIo = req.url.startsWith('/socket.io');
  const targetPort = isSocketIo ? TRACKER_PORT : NEXT_PORT;
  const target = `http://127.0.0.1:${targetPort}`;

  if (!isSocketIo && req.method === 'POST' && isStaleAction(req)) {
    req.resume();
    res.writeHead(404, { 'Content-Type': 'text/plain', 'x-nextjs-action-not-found': '1' });
    res.end('Server action not found.');
    return;
  }

  whenReady(
    targetPort,
    () => proxy.web(req, res, { target }, (err) => {
      console.error(`[Proxy HTTP Error] Impossible de joindre ${isSocketIo ? 'Tracker' : 'Next.js'} (${target}) : ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
      }
    }),
    () => {
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'text/plain', 'Retry-After': '5' });
        res.end('Service en cours de démarrage');
      }
    }
  );
});

// Gérer l'Upgrade HTTP vers WebSocket pour Socket.io
proxyServer.on('upgrade', (req, socket, head) => {
  const isSocketIo = req.url.startsWith('/socket.io');
  const targetPort = isSocketIo ? TRACKER_PORT : NEXT_PORT;
  const target = `http://127.0.0.1:${targetPort}`;

  whenReady(
    targetPort,
    () => proxy.ws(req, socket, head, { target }, (err) => {
      console.error(`[Proxy Upgrade Error] Échec de la redirection WebSocket vers le port ${targetPort} : ${err.message}`);
      socket.end();
    }),
    () => socket.destroy()
  );
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
