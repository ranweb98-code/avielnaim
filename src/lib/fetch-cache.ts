type CacheEntry<T> = {
  data: T;
  expires: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

function readStorage<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, entry: CacheEntry<T>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota or private mode */
  }
}

export function getCachedData<T>(key: string): T | null {
  const now = Date.now();
  const mem = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (mem && mem.expires > now) return mem.data;

  const stored = readStorage<T>(key);
  if (stored && stored.expires > now) {
    memoryCache.set(key, stored);
    return stored.data;
  }

  return null;
}

export async function fetchWithCache<T>(
  key: string,
  url: string,
  ttlMs = 5 * 60 * 1000
): Promise<T> {
  const cached = getCachedData<T>(key);
  if (cached !== null) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as T;
  const entry: CacheEntry<T> = { data, expires: Date.now() + ttlMs };
  memoryCache.set(key, entry);
  writeStorage(key, entry);
  return data;
}

export function invalidateCache(key: string) {
  memoryCache.delete(key);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
