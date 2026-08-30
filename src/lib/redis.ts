/*
  Redis guardrails for the shared Groq key (Phase E).

  Once signup is open, every user shares ONE Groq API key. Three things then stop
  one person from spoiling it for everyone — and none of them is about tenancy
  (RLS already isolates rows; caching per-user rows in Redis would be a leak risk
  if a key were ever built wrong, so we deliberately don't):

    1. per-user rate limits on the two AI entry points — `parseLog` is cheap-ish,
       `transcribe` uploads audio and is the costly one, so it gets the tighter
       daily cap;
    2. a global daily circuit breaker on the key itself, so one user can't burn
       the whole quota;
    3. idempotency keys, so a retried `saveIntents` can't double-write.

  Backed by Upstash Redis over its REST API — HTTP, so there's no TCP
  connection-pool problem on serverless, and it has a free tier. We talk to the
  REST endpoint with plain `fetch` rather than adding `@upstash/redis` +
  `@upstash/ratelimit`: it keeps this module dependency-free (nothing new in
  package.json / the lockfile), and the weighted sliding-window estimate below is
  the same math `@upstash/ratelimit`'s `slidingWindow` uses.

  DEGRADES TO A NO-OP WHEN UNCONFIGURED — exactly as `isGroqConfigured()` does.
  With no Upstash env vars set (local dev, demo, or a deploy that hasn't wired
  Redis yet), every limiter returns "allowed" and idempotency is a pass-through,
  so the AI flow behaves precisely as it did before Phase E. Redis is a guardrail,
  never a gate you need in order to function.

  FAIL-OPEN ON ERROR. A limiter must never take down the feature it guards: if
  Redis is unreachable or slow, we allow the request rather than block everyone.
  Blocking the shared key would be a worse outcome than briefly letting the caps
  slip. Every network path is time-boxed and swallows its error into an "allow".

  SERVER-ONLY: reads private env (`UPSTASH_REDIS_REST_URL` / `_TOKEN`), so import
  this from Server Actions / Route Handlers only — never a "use client" module.
  The project doesn't install the `server-only` package; keep the boundary by
  convention, as `groq.ts` and the data layer do.
*/

// ---- Config ----------------------------------------------------------------

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** Whether the guardrail layer is wired. When false, everything below no-ops. */
export function isRedisConfigured(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

/**
 * Ceiling on Groq calls per UTC day across ALL users — the circuit breaker.
 * Generous by default; tune per deployment via `GROQ_DAILY_LIMIT`. A parse costs
 * 1, a transcription costs more (audio is the expensive path) — see the callers.
 */
export const GROQ_DAILY_LIMIT = (() => {
  const n = Number(process.env.GROQ_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5000;
})();

/** How long to abort a Redis round trip after. A hung guardrail must not stall
 *  the action it guards, so we cut it and fail open. */
const REDIS_TIMEOUT_MS = 2000;

// ---- Low-level REST transport ----------------------------------------------

type RedisReply = { result?: unknown; error?: string };

/**
 * Run a pipeline of Redis commands against the Upstash REST endpoint. Returns
 * the ordered replies, or `null` when unconfigured, timed out, or errored — the
 * signal every caller reads as "fail open".
 *
 * Upstash's `/pipeline` runs the commands in order on one connection (not a
 * MULTI transaction, but good enough: our pipelines are INCR-then-EXPIRE and a
 * stray failure only costs the counter its TTL, never correctness).
 */
async function pipeline(commands: (string | number)[][]): Promise<RedisReply[] | null> {
  if (!isRedisConfigured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[redis] pipeline HTTP ${res.status}; failing open`);
      return null;
    }
    const body = (await res.json()) as RedisReply[];
    return Array.isArray(body) ? body : null;
  } catch (e) {
    // Timeout, DNS, offline — anything. The guardrail yields to the feature.
    console.warn(`[redis] pipeline unreachable; failing open`, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Coerce an Upstash reply (numbers arrive as numbers, GET as strings) to int. */
function toInt(reply: RedisReply | undefined): number {
  if (!reply || reply.error) return 0;
  const n = Number(reply.result);
  return Number.isFinite(n) ? n : 0;
}

// ---- Pure helpers (unit-tested) --------------------------------------------

/** Which fixed window a moment falls in — the divisor for the sliding estimate. */
export function windowIndex(now: number, windowMs: number): number {
  return Math.floor(now / windowMs);
}

/** The Redis key for one identifier's counter in one fixed window. */
export function windowKey(prefix: string, identifier: string, index: number): string {
  return `${prefix}:${identifier}:${index}`;
}

/**
 * Weighted sliding-window estimate — the count `@upstash/ratelimit` uses. The
 * previous fixed window's count is faded out linearly as we move through the
 * current one, so the effective rate is smooth across the boundary instead of
 * resetting to zero the instant the clock ticks over.
 *
 *   estimate = previous * (1 - elapsedFraction) + current
 *
 * `current` already includes the request being decided (we INCR first), so a
 * limit of N admits exactly N requests in an otherwise-empty window.
 */
export function slidingWindowEstimate(
  previousCount: number,
  currentCount: number,
  now: number,
  windowMs: number,
): number {
  const elapsedFraction = (now % windowMs) / windowMs;
  return previousCount * (1 - elapsedFraction) + currentCount;
}

/** The UTC day bucket (YYYY-MM-DD) a moment falls in — the circuit breaker key. */
export function utcDayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

// ---- Rate limiting ---------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in the window. `-1` means "unknown" (unconfigured / failed open). */
  remaining: number;
  limit: number;
  /** Epoch ms when the current window rolls over. `0` when unconfigured. */
  reset: number;
}

export interface RateLimitOptions {
  /** Max requests per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Key namespace, e.g. `"rl:parse"`, so different actions don't share a counter. */
  prefix: string;
}

/**
 * A per-identifier sliding-window rate limit. `identifier` is normally the user
 * id, so each user gets their own budget on the shared key.
 *
 * Fails open: unconfigured or on any Redis error the request is allowed
 * (`remaining: -1`). Note we INCR before deciding, so hammering a limit keeps
 * the counter warm and the block holds until the window drains — the desired
 * behaviour for protecting a shared resource.
 */
export async function rateLimit(
  identifier: string,
  { limit, windowSeconds, prefix }: RateLimitOptions,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  if (!isRedisConfigured()) return { allowed: true, remaining: -1, limit, reset: 0 };

  const windowMs = windowSeconds * 1000;
  const index = windowIndex(now, windowMs);
  const currentKey = windowKey(prefix, identifier, index);
  const previousKey = windowKey(prefix, identifier, index - 1);

  const replies = await pipeline([
    ["INCR", currentKey],
    // Two windows of TTL so the "previous" read is still there across a boundary.
    ["EXPIRE", currentKey, windowSeconds * 2],
    ["GET", previousKey],
  ]);

  if (!replies) return { allowed: true, remaining: -1, limit, reset: 0 };

  const currentCount = toInt(replies[0]);
  const previousCount = toInt(replies[2]);
  const estimate = slidingWindowEstimate(previousCount, currentCount, now, windowMs);
  const allowed = estimate <= limit;
  const reset = (index + 1) * windowMs;

  return { allowed, remaining: Math.max(0, Math.floor(limit - estimate)), limit, reset };
}

/** Per-user cap on `parseLog` — the cheaper text path. 20 sentences / hour. */
export function parseLogLimit(userId: string, now?: number): Promise<RateLimitResult> {
  return rateLimit(userId, { limit: 20, windowSeconds: 3600, prefix: "rl:parse" }, now);
}

/** Per-user cap on `transcribe` — the costly audio-upload path. 30 clips / day. */
export function transcribeLimit(userId: string, now?: number): Promise<RateLimitResult> {
  return rateLimit(userId, { limit: 30, windowSeconds: 86400, prefix: "rl:transcribe" }, now);
}

/**
 * Per-user cap on the AI Project Planner — milestone generation and
 * commit-vs-milestone matching (`projects/ai-actions.ts`). Its own `rl:planner`
 * bucket on purpose: planning a project and logging a sentence in Quick-Add are
 * unrelated actions a user does at different rates, so a busy logging hour must
 * not lock the planner (and vice versa). Same 20/hour cap as `parseLog`; the
 * global `groqDailyBudget` breaker still covers the shared key across both.
 */
export function plannerLimit(userId: string, now?: number): Promise<RateLimitResult> {
  return rateLimit(userId, { limit: 20, windowSeconds: 3600, prefix: "rl:planner" }, now);
}

// ---- Global circuit breaker ------------------------------------------------

export interface BudgetResult {
  /** `false` once the shared key's daily quota is spent. */
  ok: boolean;
  used: number;
  limit: number;
}

/**
 * The global daily circuit breaker on the shared Groq key. Every AI call bumps a
 * per-UTC-day counter by `cost` (a parse is 1, a transcription is dearer) and is
 * refused once the day's total would exceed `GROQ_DAILY_LIMIT` — so one user
 * cannot exhaust everyone's quota.
 *
 * Fails open (unconfigured or Redis error → `ok: true`): a guardrail outage must
 * not become an outage of the thing it guards.
 */
export async function groqDailyBudget(cost = 1, now: number = Date.now()): Promise<BudgetResult> {
  const limit = GROQ_DAILY_LIMIT;
  if (!isRedisConfigured()) return { ok: true, used: 0, limit };

  const key = `cb:groq:${utcDayKey(now)}`;
  const replies = await pipeline([
    ["INCRBY", key, cost],
    ["EXPIRE", key, 2 * 86400],
  ]);
  if (!replies) return { ok: true, used: 0, limit };

  const used = toInt(replies[0]);
  return { ok: used <= limit, used, limit };
}

// ---- Idempotency -----------------------------------------------------------

/**
 * Claim a one-shot key. Returns `true` the first time it's seen (the caller owns
 * the work) and `false` on any repeat within `ttlSeconds` — so a retried
 * `saveIntents` with the same key can't double-write.
 *
 * Fails open (unconfigured or Redis error → `true`, the claim "succeeds"):
 * better to risk a rare duplicate than to block a legitimate save when Redis is
 * down. Duplicates are also cheap here — each target write still re-checks auth,
 * RLS and the today/yesterday window.
 */
export async function claimOnce(key: string, ttlSeconds = 600): Promise<boolean> {
  if (!isRedisConfigured()) return true;

  const replies = await pipeline([["SET", `idem:${key}`, "1", "NX", "EX", ttlSeconds]]);
  if (!replies) return true;

  // Upstash returns "OK" when NX set the key, null when it already existed.
  const reply = replies[0];
  if (reply?.error) return true; // fail open
  return reply?.result === "OK";
}
