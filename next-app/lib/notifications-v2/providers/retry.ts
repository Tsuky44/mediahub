/**
 * Retry with exponential backoff + jitter.
 * Pure function, no external deps, easy to unit test.
 */

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  /** Return false to stop retrying (e.g. on 4xx client errors). */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<{ value: T; attempts: number }> {
  let attempt = 0
  let lastErr: unknown

  while (attempt < opts.maxAttempts) {
    attempt++
    try {
      const value = await fn()
      return { value, attempts: attempt }
    } catch (err) {
      lastErr = err
      const keepGoing = opts.shouldRetry ? opts.shouldRetry(err, attempt) : true
      if (!keepGoing || attempt >= opts.maxAttempts) break

      const exp = opts.baseDelayMs * Math.pow(2, attempt - 1)
      const capped = Math.min(exp, opts.maxDelayMs)
      const jitter = Math.random() * 0.3 * capped
      const delay = Math.floor(capped + jitter)

      opts.onRetry?.(err, attempt, delay)
      await sleep(delay)
    }
  }

  throw lastErr
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
