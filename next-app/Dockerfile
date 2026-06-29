FROM node:20.18.3-alpine AS base
# pnpm est installé une seule fois ici via npm (plus résilient que corepack,
# qui tente un round-trip registry à chaque `corepack enable`). La couche est
# mise en cache et réutilisée par les stages suivants.
RUN npm install -g pnpm@9.15.0

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++ curl
WORKDIR /app

# Pre-populate node-gyp headers cache from official nodejs.org/dist so that
# native modules (better-sqlite3, cpu-features) do not attempt to fetch from
# unofficial-builds.nodejs.org (which is unreachable inside Docker BuildKit).
RUN node -e "process.stdout.write(process.version.slice(1))" > /tmp/node_ver.txt \
  && NODE_VER=$(cat /tmp/node_ver.txt) \
  && mkdir -p /root/.cache/node-gyp/${NODE_VER} \
  && curl -fsSL https://nodejs.org/dist/v${NODE_VER}/node-v${NODE_VER}-headers.tar.gz \
     | tar -xz --strip-components=1 -C /root/.cache/node-gyp/${NODE_VER} \
  && echo "9" > /root/.cache/node-gyp/${NODE_VER}/installVersion

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm i --no-frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

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

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install OpenSSL for SQLite (better-sqlite3), Playwright dependencies, and Docker CLI
RUN apk add --no-cache \
  openssl \
  sqlite \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  font-noto \
  font-noto-cjk \
  font-noto-emoji \
  docker-cli

# Tell Playwright to use system Chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh ./entrypoint.sh

# Copy full node_modules from builder to have tsx and tracker dependencies
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Ensure Unix line endings and executable permission
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3008

ENV PORT=3008
ENV HOSTNAME="0.0.0.0"
# Fix for OpenSSL legacy provider error with smb2
ENV NODE_OPTIONS="--openssl-legacy-provider"

CMD ["./entrypoint.sh"]
