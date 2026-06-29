/**
 * Structured, leveled logger with request correlation.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('[MyModule] Something happened', { userId: 42 })
 *
 * In production logs are emitted as JSON for ingestion (Loki / Datadog / etc.)
 * In development logs are pretty-printed to the console.
 */

import { IS_DEV } from './constants';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ?? (IS_DEV ? 'debug' : 'info');
const MIN_LEVEL_NUM = LEVELS[MIN_LEVEL] ?? LEVELS.info;

/* ------------------------------------------------------------------ */
// AsyncLocalStorage allows us to attach a correlationId to a request
// without passing it manually through every function.
// Only available server-side to avoid client-side errors
const isServer = typeof window === 'undefined';

let correlationStore: any = null;

if (isServer) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const asyncHooks = eval('require')('async_hooks');
    correlationStore = new asyncHooks.AsyncLocalStorage();
  } catch {
    // Fallback if async_hooks not available
  }
}

export function withCorrelation<T>(fn: () => T, correlationId?: string): T {
  const cid = correlationId ?? generateCorrelationId();
  if (correlationStore) {
    return correlationStore.run({ correlationId: cid }, fn);
  }
  return fn();
}

export function withCorrelationAsync<T>(fn: () => Promise<T>, correlationId?: string): Promise<T> {
  const cid = correlationId ?? generateCorrelationId();
  if (correlationStore) {
    return correlationStore.run({ correlationId: cid }, fn);
  }
  return fn();
}

export function getCorrelationId(): string | undefined {
  return correlationStore?.getStore()?.correlationId;
}

/* ------------------------------------------------------------------ */

function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= MIN_LEVEL_NUM;
}

function formatLog(level: LogLevel, args: unknown[]): { message: string; meta?: Record<string, unknown> } {
  // Heuristic: if the last argument is a plain object, treat it as metadata
  const last = args[args.length - 1];
  const hasMeta = last !== null && typeof last === 'object' && !Array.isArray(last) && !(last instanceof Error);
  const meta: Record<string, unknown> | undefined = hasMeta ? (last as Record<string, unknown>) : undefined;
  const parts = hasMeta ? args.slice(0, -1) : args;

  // Format message parts (handle Error objects specially)
  const message = parts
    .map((p) => {
      if (p instanceof Error) return p.stack ?? p.message;
      if (typeof p === 'string') return p;
      try {
        return JSON.stringify(p);
      } catch {
        return String(p);
      }
    })
    .join(' ');

  return { message, meta };
}

function emit(level: LogLevel, formatted: { message: string; meta?: Record<string, unknown> }) {
  const { message, meta } = formatted;
  const correlationId = getCorrelationId();
  const timestamp = new Date().toISOString();

  // Production: emit JSON for easy aggregation
  if (!IS_DEV) {
    const payload: Record<string, unknown> = {
      timestamp,
      level,
      message,
      ...(correlationId ? { correlationId } : {}),
      ...(meta ?? {}),
    };
    // Use console[level] so stderr stays for warn/error
    const dest = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    dest(JSON.stringify(payload));
    return;
  }

  // Development: pretty-print
  const color =
    level === 'error' ? '\x1b[31m' :
    level === 'warn' ? '\x1b[33m' :
    level === 'debug' ? '\x1b[2m' :
    '\x1b[36m';
  const reset = '\x1b[0m';
  const prefix = `${timestamp} ${color}[${level.toUpperCase()}]${reset}`;
  const cid = correlationId ? `\x1b[2m[${correlationId}]\x1b[0m` : '';
  const metaStr = meta && Object.keys(meta).length ? `\n  → ${JSON.stringify(meta)}` : '';

  const dest = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  dest(prefix, cid, message, metaStr);
}

/* ------------------------------------------------------------------ */

function log(level: LogLevel, ...args: unknown[]) {
  if (!shouldLog(level)) return;
  const formatted = formatLog(level, args);
  emit(level, formatted);
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
  /** Log but only in dev; no-op in prod */
  dev: (...args: unknown[]) => {
    if (IS_DEV) log('debug', ...args);
  },
};

/** Convenience export for the common pattern `if (isDev) console.log(...)` */
export const logDev = IS_DEV
  ? (...args: unknown[]) => logger.debug(...args)
  : () => {};
