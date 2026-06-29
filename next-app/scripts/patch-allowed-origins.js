/**
 * Patch runtime des allowedOrigins (Server Actions).
 *
 * En mode `output: 'standalone'`, la config Next.js est figée au moment du
 * build dans `.next/required-server-files.json`. Les variables d'environnement
 * lues dans `next.config.ts` (NEXTAUTH_URL, ALLOWED_ORIGINS) n'ont donc aucun
 * effet sur les déploiements Docker. Ce script injecte les origines du runtime
 * dans ce fichier AVANT le démarrage du serveur, ce qui corrige l'erreur :
 * "`x-forwarded-host` header does not match `origin` header... Invalid Server Actions request."
 */
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '.next', 'required-server-files.json');
const SERVER_FILE = path.join(__dirname, '..', 'server.js');

function collectRuntimeOrigins() {
  const origins = [];

  if (process.env.NEXTAUTH_URL) {
    try {
      const url = new URL(process.env.NEXTAUTH_URL);
      origins.push(url.host); // ex: tv.yonix.me ou localhost:3008
      origins.push(url.hostname); // ex: tv.yonix.me
    } catch {
      console.warn('[patch-allowed-origins] NEXTAUTH_URL invalide, ignorée.');
    }
  }

  if (process.env.ALLOWED_ORIGINS) {
    origins.push(
      ...process.env.ALLOWED_ORIGINS.split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    );
  }

  return origins;
}

function mergeOrigins(config, runtimeOrigins) {
  config.experimental = config.experimental || {};
  config.experimental.serverActions = config.experimental.serverActions || {};
  const existing = config.experimental.serverActions.allowedOrigins || [];
  const merged = Array.from(new Set([...existing, ...runtimeOrigins]));
  config.experimental.serverActions.allowedOrigins = merged;
  return merged;
}

// Cible 1 : .next/required-server-files.json (lu par le serveur standalone).
function patchRequiredServerFiles(runtimeOrigins) {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.warn(`[patch-allowed-origins] Fichier introuvable : ${CONFIG_FILE} — skip.`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  data.config = data.config || {};
  const merged = mergeOrigins(data.config, runtimeOrigins);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data));
  console.log(`[patch-allowed-origins] required-server-files.json → allowedOrigins = ${merged.join(', ')}`);
}

// Cible 2 : server.js inline la config dans __NEXT_PRIVATE_STANDALONE_CONFIG
// (selon la version de Next). On patche aussi cette copie.
function patchStandaloneServer(runtimeOrigins) {
  if (!fs.existsSync(SERVER_FILE)) {
    return;
  }
  const source = fs.readFileSync(SERVER_FILE, 'utf8');
  const match = source.match(/^const nextConfig = (\{.*\})\s*$/m);
  if (!match) {
    console.log('[patch-allowed-origins] Pas de config inline dans server.js — skip.');
    return;
  }
  const config = JSON.parse(match[1]);
  const merged = mergeOrigins(config, runtimeOrigins);
  const patched = source.replace(match[0], `const nextConfig = ${JSON.stringify(config)}`);
  fs.writeFileSync(SERVER_FILE, patched);
  console.log(`[patch-allowed-origins] server.js → allowedOrigins = ${merged.join(', ')}`);
}

function main() {
  const runtimeOrigins = collectRuntimeOrigins();
  if (runtimeOrigins.length === 0) {
    console.log('[patch-allowed-origins] Aucune origine runtime à injecter (NEXTAUTH_URL / ALLOWED_ORIGINS absents).');
    return;
  }
  patchRequiredServerFiles(runtimeOrigins);
  patchStandaloneServer(runtimeOrigins);
}

try {
  main();
} catch (err) {
  console.error('[patch-allowed-origins] Échec du patch (non bloquant) :', err.message);
}
