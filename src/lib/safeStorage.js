/**
 * Safe localStorage wrapper that handles iOS/WebKit QuotaExceededError gracefully.
 * Automatically purges bloated caches and prevents unhandled crashes.
 */

export function purgeStorageBloat() {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    // 1. Remove known heavy cache keys first
    const heavyKeys = [
      'aiChat',
      'aiManagerChat',
      'axon_client_page_views',
      'daily_study_plan_content',
      'axon_exercise_ai_plan_content',
      'axon_exercise_data_global'
    ]
    for (const key of heavyKeys) {
      try {
        localStorage.removeItem(key)
      } catch (e) {}
    }

    // 2. Scan all localStorage keys to clean cached dashboards & strip bloated thumbnails
    const keysToClean = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) keysToClean.push(k)
    }

    for (const key of keysToClean) {
      // NEVER touch user authentication session tokens
      if (key.startsWith('sb-') || key.includes('supabase') || key === 'theme' || key === 'appLanguage') {
        continue
      }

      // Clear home dashboard and classes caches
      if (key.startsWith('axon_home_dashboard_') || key.startsWith('axon_classes_cache_')) {
        try {
          localStorage.removeItem(key)
        } catch (e) {}
        continue
      }

      // Strip heavy base64 image_url strings from nutrition logs
      if (key.startsWith('axon_nutrition_logs_')) {
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const logs = JSON.parse(raw)
            if (Array.isArray(logs)) {
              // Keep only the most recent 3 thumbnails, strip images from all older logs
              const stripped = logs.map((l, idx) => (idx < 3 ? l : { ...l, image_url: '' }))
              localStorage.setItem(key, JSON.stringify(stripped))
            }
          }
        } catch (e) {
          try {
            localStorage.removeItem(key)
          } catch (e2) {}
        }
      }
    }
  } catch (err) {
    console.warn('purgeStorageBloat error:', err)
  }
}

export function safeSetItem(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) return false

  try {
    localStorage.setItem(key, value)
    return true
  } catch (err) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      String(err?.message || '').toLowerCase().includes('quota')

    if (isQuota) {
      console.warn(`LocalStorage quota exceeded on key "${key}". Purging bloated caches...`)
      purgeStorageBloat()

      try {
        localStorage.setItem(key, value)
        return true
      } catch (retryErr) {
        console.warn(`LocalStorage still exceeded quota after purge for "${key}". Failing safely without crash.`)
        return false
      }
    }

    console.warn(`LocalStorage setItem error on "${key}":`, err)
    return false
  }
}

export function safeGetItem(key, fallback = null) {
  if (typeof window === 'undefined' || !window.localStorage) return fallback
  try {
    const val = localStorage.getItem(key)
    return val !== null ? val : fallback
  } catch (err) {
    return fallback
  }
}

export function safeRemoveItem(key) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.removeItem(key)
  } catch (err) {}
}
