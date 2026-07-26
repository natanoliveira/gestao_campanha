import { Redis } from "@upstash/redis";

// ── memory fallback for local dev (no env vars needed) ──────────────────────
const mem = new Map<string, { v: string; exp: number }>();

const memRedis = {
  get: (key: string): Promise<string | null> => {
    const e = mem.get(key);
    if (!e) return Promise.resolve(null);
    if (Date.now() > e.exp) { mem.delete(key); return Promise.resolve(null); }
    return Promise.resolve(e.v);
  },
  set: (key: string, value: string, _ex: "EX", ttl: number): Promise<void> => {
    mem.set(key, { v: value, exp: Date.now() + ttl * 1000 });
    return Promise.resolve();
  },
  del: (key: string): Promise<void> => { mem.delete(key); return Promise.resolve(); },
  incr: async (key: string): Promise<number> => {
    const e = mem.get(key);
    const count = e && Date.now() <= e.exp ? parseInt(e.v) + 1 : 1;
    mem.set(key, { v: String(count), exp: e?.exp ?? Date.now() + 60_000 });
    return count;
  },
  expire: (key: string, ttl: number): Promise<void> => {
    const e = mem.get(key);
    if (e) mem.set(key, { v: e.v, exp: Date.now() + ttl * 1000 });
    return Promise.resolve();
  },
};

// ── Upstash (HTTP — works in serverless) ────────────────────────────────────
function createUpstash() {
  const client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return {
    get: (key: string) => client.get<string>(key),
    set: (key: string, value: string, _ex: "EX", ttl: number) =>
      client.set(key, value, { ex: ttl }).then(() => {}),
    del: (key: string) => client.del(key).then(() => {}),
    incr: (key: string) => client.incr(key),
    expire: (key: string, ttl: number) => client.expire(key, ttl),
  };
}

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? createUpstash()
    : memRedis;

// ── rate limit — atomic INCR + EXPIRE ───────────────────────────────────────
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ ok: boolean; remaining: number }> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}
