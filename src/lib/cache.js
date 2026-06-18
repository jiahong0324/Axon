export function readCache(key, maxAgeMs = 5 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached?.timestamp || Date.now() - cached.timestamp > maxAgeMs) return null
    return cached.value
  } catch {
    return null
  }
}

export function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), value }))
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

export function clearCache(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}
