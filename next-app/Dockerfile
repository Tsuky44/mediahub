FROM node:20.18.3-alpine AS base
# pnpm est installé une seule fois ici via npm (plus résilient que corepack,
# qui tente un round-trip registry à chaque `corepack enable`). La couche est
# mise en cache et réutilisée par les stages suivants.
RUN npm install -g pnpm@9.15.0

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++ curl sqlite-dev openssl-dev
WORKDIR /app

# Les modules natifs (better-sqlite3) compilent avec node-gyp, qui télécharge par
# défaut les headers Node depuis le réseau. Dans Docker BuildKit / WSL2 le DNS peut
# échouer (getaddrinfo EAI_AGAIN). On pré-télécharge les headers avec retries et on
# force node-gyp à les utiliser localement (plus de requête réseau au build).
RUN NODE_VERSION="$(node -p process.versions.node)" \
  && set -e; ok=0; \
  for i in 1 2 3 4 5; do \
    curl -fsSL --retry 3 --retry-delay 2 --connect-timeout 30 \
      "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-headers.tar.gz" \
      -o /tmp/node-headers.tar.gz && ok=1 && break; \
    echo "node headers download attempt $i failed, retrying..."; sleep 5; \
  done; \
  if [ "$ok" -ne 1 ]; then echo "Failed to download Node headers" && exit 1; fi; \
  tar -xzf /tmp/node-headers.tar.gz -C /usr/local --strip-components=1 \
  && rm /tmp/node-headers.tar.gz

ENV npm_config_disturl=https://nodejs.org/dist
ENV npm_config_nodedir=/usr/local
ENV PREBUILD_INSTALL_TIMEOUT=300000
ENV npm_config_build_from_source=false

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN set -e; \
  for i in 1 2 3; do \
    if [ -f pnpm-lock.yaml ]; then pnpm i --no-frozen-lockfile && exit 0; \
    elif [ -f yarn.lock ]; then yarn --frozen-lockfile && exit 0; \
    elif [ -f package-lock.json ]; then npm ci && exit 0; \
    else echo "Lockfile not found." && exit 1; \
    fi; \
    echo "Dependency install attempt $i failed, retrying..."; sleep 10; \
  done; \
  echo "Dependency install failed after 3 attempts" && exit 1

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl python3 make g++ curl
ENV DATABASE_URL="file:./db.sqlite"
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max_old_space_size=3072"
ENV NEXT_PHASE=phase-production-build

RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm run build; \
  elif [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  else npm run build; \
  fi

# No need to copy init script - using direct SQL in entrypoint.sh

# Dépendances de PRODUCTION uniquement pour l'image finale.
# On repart des node_modules déjà installés (modules natifs déjà compilés) et on
# retire les devDependencies (TypeScript, ESLint, Tailwind…) ainsi que le
# compilateur SWC (~110 Mo) qui ne sert qu'au build : le serveur standalone de
# Next ne l'utilise jamais à l'exécution.
FROM deps AS prod-deps
RUN pnpm prune --prod \
  && rm -rf node_modules/.pnpm/@next+swc-*

# Base d'exécution : Node seul (pnpm n'est utile qu'au build)
FROM node:20.18.3-alpine AS runtime-base

# Assemblage de /app dans une étape à part : l'image finale n'en reçoit qu'UNE
# copie (avant, les node_modules du standalone puis ceux du build étaient
# empilés dans deux couches successives).
FROM runtime-base AS assemble
WORKDIR /app
COPY --from=builder /app/public ./public
RUN mkdir .next
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Dossier de la base (créée au premier démarrage par Drizzle, jamais embarquée dans l'image)
RUN mkdir -p data/db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
# Changelog local : affiché dans « Mise à jour » (le dépôt GitHub est privé)
COPY --from=builder /app/CHANGELOG.md ./CHANGELOG.md
# node_modules de production (dont tsx et les dépendances du tracker)
COPY --from=prod-deps /app/node_modules ./node_modules
# Ensure Unix line endings and executable permission
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

# Production image
FROM runtime-base AS runner
WORKDIR /app

# OpenSSL/SQLite (better-sqlite3) et certificats.
# Retirés : docker-cli (l'app parle à Docker via l'API/socket avec dockerode, jamais
# via la CLI) et Chromium + polices (ne servaient qu'au scraping des stats des
# trackers, fonctionnalité supprimée).
RUN apk add --no-cache \
  openssl \
  sqlite \
  ca-certificates

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Application assemblée (une seule couche)
COPY --from=assemble --chown=nextjs:nodejs /app ./

USER nextjs

EXPOSE 3008

ENV PORT=3008
ENV HOSTNAME="0.0.0.0"
# Fix for OpenSSL legacy provider error with smb2
ENV NODE_OPTIONS="--openssl-legacy-provider"

CMD ["./entrypoint.sh"]
