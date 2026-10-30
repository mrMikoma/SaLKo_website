/**
 * Counts events per key, such as failed logins per email address, and blocks
 * the key for a while once there are too many within a time window. The
 * counts live in this server process's memory: the site runs as one process,
 * and a restart forgetting them is acceptable.
 */

interface Entry {
  times: number[]; // when the events happened, oldest first
  blockedUntil: number;
}

// One store per process, whichever bundle imports this module: the login form's
// server action and NextAuth's route may load their own copies of it
const STORE_KEY = Symbol.for("salko.rateLimits");
type Stores = Map<string, Map<string, Entry>>;
const globalStores = globalThis as unknown as Record<symbol, Stores | undefined>;
const stores: Stores = (globalStores[STORE_KEY] ??= new Map());

// Forget keys that have been quiet this long, so the maps don't grow forever
const MAX_KEYS = 10_000;

export class RateLimiter {
  private readonly entries: Map<string, Entry>;

  /**
   * @param name    separates this limiter's counts from the others'
   * @param limit   events allowed within the window
   * @param windowMs the window, in milliseconds
   * @param blockMs how long the key is then blocked
   */
  constructor(
    name: string,
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly blockMs: number
  ) {
    if (!stores.has(name)) stores.set(name, new Map());
    this.entries = stores.get(name)!;
  }

  /** Milliseconds until the key may try again; 0 when it isn't blocked */
  blockedFor(key: string, now = Date.now()): number {
    const entry = this.entries.get(key);
    return entry && entry.blockedUntil > now ? entry.blockedUntil - now : 0;
  }

  /** Records an event; the one that reaches the limit blocks the key */
  hit(key: string, now = Date.now()): void {
    if (this.entries.size >= MAX_KEYS) this.prune(now);
    const entry = this.entries.get(key) ?? { times: [], blockedUntil: 0 };
    entry.times = entry.times.filter((time) => time > now - this.windowMs);
    entry.times.push(now);
    if (entry.times.length >= this.limit) {
      entry.blockedUntil = now + this.blockMs;
      entry.times = [];
    }
    this.entries.set(key, entry);
  }

  /** Forgets the key, e.g. after a successful login */
  reset(key: string): void {
    this.entries.delete(key);
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) {
      const lastEvent = entry.times.at(-1) ?? 0;
      if (entry.blockedUntil <= now && lastEvent <= now - this.windowMs) this.entries.delete(key);
    }
  }
}

/**
 * The visitor's address: Cloudflare's header first, as the site is behind
 * Cloudflare, then the proxies' X-Forwarded-For. The server's firewall lets
 * only Cloudflare reach the web ports (infra/terraform/modules/hetzner), so a
 * visitor can't set the header by skipping Cloudflare. Requests over the
 * private network can, so per-IP limits still only add to per-account ones.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** "15 minuutin" / "1 minuutin": how long to wait, in Finnish, rounded up */
export const waitText = (ms: number) => `${Math.max(1, Math.ceil(ms / 60_000))} minuutin`;
