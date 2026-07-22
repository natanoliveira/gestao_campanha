// ponytail: memoryCache para dev local; trocar por Upstash quando REDIS_URL estiver configurada em prod

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function memGet(key: string): Promise<string | null> {
  const entry = memoryCache.get(key);
  if (!entry) return Promise.resolve(null);
  if (Date.now() > entry.expiresAt) { memoryCache.delete(key); return Promise.resolve(null); }
  return Promise.resolve(entry.value);
}

function memSet(key: string, value: string, _ex: "EX", ttl: number): Promise<void> {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  return Promise.resolve();
}

function memDel(key: string): Promise<void> {
  memoryCache.delete(key);
  return Promise.resolve();
}

export const redis = { get: memGet, set: memSet, del: memDel };

// ponytail: sliding window simples; upgrade para Lua script atômico se precisar exatidão sob concorrência
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; remaining: number }> {
  const raw = await redis.get(key);
  const count = raw ? parseInt(raw) + 1 : 1;
  if (count === 1) await redis.set(key, "1", "EX", windowSec);
  else await redis.set(key, String(count), "EX", windowSec);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}
