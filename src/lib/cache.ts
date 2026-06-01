// Lightweight in-memory cache with TTL. Used by both client and server callers.
// Shared by being module-singleton in each runtime (browser/node).

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function withCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires > now) {
    return hit.value;
  }
  const value = await loader();
  // Skip caching empty/failed results so the next caller can retry promptly
  // instead of being pinned to a null for the full TTL window.
  if (value !== null && value !== undefined) {
    store.set(key, { value, expires: now + ttlMs });
  }
  return value;
}

export function invalidate(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
