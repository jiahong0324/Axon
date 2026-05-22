const CACHE_NAME = 'axon-v2'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  const isHtml = e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')

  if (isHtml) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
          return response
        })
        .catch(() => caches.match(e.request) || caches.match('/index.html'))
    )
    return
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => {
      if (e.request.url.includes('/assets/')) {
        return new Response('Asset not found', { status: 404 })
      }
      return caches.match('/index.html')
    }))
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow('/reminders'))
})

// In-flight/recent notifications deduplication cache (holds key -> timestamp)
const seenNotifications = new Map()

self.addEventListener('push', e => {
  let data = { title: '📚 Axon Notification', body: 'You have an update!' }
  try {
    data = e.data ? e.data.json() : data
  } catch {
    data = { title: '📚 Axon Notification', body: e.data ? e.data.text() : 'You have an update!' }
  }

  // Deduplicate inside the active service worker instance memory
  const now = Date.now()
  // Purge entries older than 10 seconds
  for (const [key, time] of seenNotifications.entries()) {
    if (now - time > 10000) {
      seenNotifications.delete(key)
    }
  }

  const dupKey = `${data.title}|${data.body}`
  if (seenNotifications.has(dupKey)) {
    console.log('Skipping duplicate push (in-memory cache):', data.title, data.body)
    return
  }
  seenNotifications.set(dupKey, now)

  const options = {
    body: data.body,
    icon: '/icons/logo.png',
    badge: '/icons/logo.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.url || '/'
  }

  e.waitUntil(
    self.registration.getNotifications().then(notifications => {
      // Additional fallback: check visible notifications on system tray
      const isDuplicate = notifications.some(n => n.title === data.title && n.body === data.body)
      if (isDuplicate) {
        console.log('Skipping duplicate push notification (active tray):', data.title, data.body)
        return
      }
      return self.registration.showNotification(data.title, options)
    })
  )
})
