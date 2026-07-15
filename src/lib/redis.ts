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
