const store = new Map<string, { data: unknown; ts: number }>()
const TTL = 30_000 // 30 seconds

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > TTL) { store.delete(key); return null }
  return entry.data as T
}

export function cacheSet(key: string, data: unknown) {
  store.set(key, { data, ts: Date.now() })
}

export function cacheInvalidate(pattern: string) {
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key)
  }
}
