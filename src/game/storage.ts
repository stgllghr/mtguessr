// localStorage can be missing or throw (private mode, blocked site data), so every access is guarded.
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/** Moves a saved value to a new key, if only the old key has one. */
export function migrate(oldKey: string, newKey: string): void {
  try {
    const old = localStorage.getItem(oldKey)
    if (old !== null && localStorage.getItem(newKey) === null) localStorage.setItem(newKey, old)
    localStorage.removeItem(oldKey)
  } catch {
    // Storage unavailable: nothing to move.
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Not persisting is fine; the game still works for this session.
  }
}
