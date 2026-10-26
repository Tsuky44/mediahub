/**
 * Resilient axios factory with retry, circuit breaker, and dedup.
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { logger } from '@/lib/logger';
import { RETRY, TIMEOUT } from '@/lib/constants';
import { keepAliveHttpAgent, strictHttpsAgent } from '@/lib/http-agents';

export interface ResilientClientOptions {
  baseURL: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  baseDelayMs?: number;
  serviceName?: string;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;
  dedupe?: boolean;
}

const inFlight = new Map<string, Promise<unknown>>();

function getKey(method: string, url: string, params?: unknown, data?: unknown): string {
  return `${method}|${url}|${JSON.stringify(params ?? {})}|${JSON.stringify(data ?? {})}`;
}

class CircuitBreaker {
  private failures = 0; private lastFailure = 0; private state: 'closed'|'open'|'half' = 'closed';
  constructor(private threshold: number, private resetMs: number, private name: string) {}
  check() {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetMs) { this.state = 'half'; logger.info(`[CB] ${this.name} half-open`); }
      else throw new Error(`Circuit breaker OPEN for ${this.name}`);
    }
  }
  success() { if (this.state === 'half') { this.state = 'closed'; this.failures = 0; logger.info(`[CB] ${this.name} closed`); } }
  fail() { this.failures++; this.lastFailure = Date.now(); if (this.failures >= this.threshold) { this.state = 'open'; logger.warn(`[CB] ${this.name} OPEN`); } }
}
const breakers = new Map<string, CircuitBreaker>();

function isRetryable(err: AxiosError) {
  if (!err.response) return true;
  return [408, 429, 500, 502, 503, 504].includes(err.response.status);
}

export function createAxiosClient(opts: ResilientClientOptions): AxiosInstance {
  const { baseURL, headers, timeout = TIMEOUT.SONARR, retries = RETRY.MAX_ATTEMPTS - 1,
    baseDelayMs = RETRY.BASE_DELAY_MS, serviceName = 'Service',
    circuitBreakerThreshold = 5, circuitBreakerResetMs = 30_000, dedupe = true } = opts;

  const inst = axios.create({ baseURL, timeout, headers, httpAgent: keepAliveHttpAgent, httpsAgent: strictHttpsAgent });
  const breaker = breakers.get(serviceName) ?? new CircuitBreaker(circuitBreakerThreshold, circuitBreakerResetMs, serviceName);
  breakers.set(serviceName, breaker);

  inst.interceptors.response.use(
    (r) => { breaker.success(); return r; },
    async (err: AxiosError) => {
      const cfg = err.config as (AxiosRequestConfig & { __retryCount?: number }) | undefined;
      if (!cfg) { breaker.fail(); return Promise.reject(err); }
      cfg.__retryCount = cfg.__retryCount ?? 0;
      if (isRetryable(err) && cfg.__retryCount < retries) {
        cfg.__retryCount++;
        const delay = baseDelayMs * (2 ** (cfg.__retryCount - 1));
        logger.warn(`[HTTP] ${serviceName} ${cfg.method?.toUpperCase()} ${cfg.url} retry ${cfg.__retryCount}/${retries + 1} in ${delay}ms`, { status: err.response?.status });
        await new Promise((res) => setTimeout(res, delay));
        return inst.request(cfg);
      }
      breaker.fail();
      logger.error(`[HTTP] ${serviceName} ${cfg.method?.toUpperCase()} ${cfg.url} failed`, { status: err.response?.status, message: err.message });
      return Promise.reject(err);
    }
  );

  // Wrap GET for dedup. IMPORTANT: on retourne l'AxiosResponse complète
  // (et NON `res.data`) pour rester compatible avec tous les consommateurs
  // de lib/services/* qui font `const response = await client.get(...)` puis
  // `return response.data`. Auparavant le wrapper auto-unwrappait `.data`,
  // ce qui faisait que `response.data` côté appelant était `undefined`
  // → `Cannot read properties of undefined (reading 'results')` partout.
  const originalGet = inst.get.bind(inst);
  inst.get = async function<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    if (!dedupe) return originalGet<T>(url, config) as Promise<AxiosResponse<T>>;
    // baseURL inclus : deux services peuvent exposer le même chemin relatif
    const key = getKey('GET', `${baseURL}${url}`, config?.params, undefined);
    if (inFlight.has(key)) {
      logger.debug(`[HTTP] Dedup GET ${url} for ${serviceName}`);
      return inFlight.get(key) as Promise<AxiosResponse<T>>;
    }
    try { breaker.check(); } catch (e) { return Promise.reject(e); }
    const p = originalGet<T>(url, config) as Promise<AxiosResponse<T>>;
    inFlight.set(key, p);
    // then(cleanup, cleanup) et non finally() : finally() crée une promesse qui rejette
    // sans gestionnaire et déclenche des "unhandledRejection" (l'erreur reste remontée via p)
    const cleanup = () => { inFlight.delete(key); };
    p.then(cleanup, cleanup);
    return p;
  } as AxiosInstance['get'];

  return inst;
}
