/**
 * In-process, fixed-window rate limiting.
 *
 * Counters live in a module-level `Map`, so they are **per server instance**:
 * a limit is exact on a single process (local dev, a single container) and a
 * multiple of it when several instances run side by side. That is a deliberate
 * trade — the alternative is shared infrastructure (Redis), which this app does
 * not have. Managed Auth's own server-side limiter remains the backstop, and
 * the durable limits live in FastAPI (`apps/api/src/api/services/rate_limit.py`).
 *
 * Keys are recycled in place when their window elapses; the map is swept when
 * it grows past `MAX_KEYS` so distinct keys cannot grow it without bound.
 */

export type RateLimitRule = {
  /** Requests allowed per window. */
  limit: number;
  /** Window length, in milliseconds. */
  windowMs: number;
};

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; limit: number; retryAfterSeconds: number };

type Window = { hits: number; resetAt: number };

const windows = new Map<string, Window>();

/** Flush the map before it grows past this many live keys. */
const MAX_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) {
      windows.delete(key);
    }
  }
}

/**
 * Record one hit for `key` and report whether it is still within `rule`.
 *
 * `now` is injectable so the behaviour is testable without timers.
 */
export function consume(
  key: string,
  rule: RateLimitRule,
  now: number = Date.now(),
): RateLimitDecision {
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_KEYS) {
      sweep(now);
    }
    windows.set(key, { hits: 1, resetAt: now + rule.windowMs });
    return { allowed: true };
  }

  existing.hits += 1;
  if (existing.hits > rule.limit) {
    return {
      allowed: false,
      limit: rule.limit,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }

  return { allowed: true };
}
