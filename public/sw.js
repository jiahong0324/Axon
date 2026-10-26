const CACHE_NAME = 'axon-v29-force-unique-heads-up'
const STATIC_ASSETS = ['/', '/manifest.json']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  const isHtml = event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')

  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => {
      if (event.request.url.includes('/assets/')) return new Response('Asset not found', { status: 404 })
      return caches.match('/index.html')
    }))
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const rawData = event.notification.data || {}
  const targetUrl = typeof rawData === 'string' ? rawData : rawData.url || '/'
  const announcementId = typeof rawData === 'object' ? rawData.announcement_id : null

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (announcementId && 'postMessage' in client) {
            client.postMessage({
              type: 'OPEN_ANNOUNCEMENT',
              announcementId
            })
          }
          if (client.url && !client.url.includes('open_announcement') && 'navigate' in client && targetUrl) {
            return client.navigate(targetUrl).then(c => c ? c.focus() : client.focus())
          }
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

self.addEventListener('push', event => {
  let data = { title: 'Axon Notification', body: 'You have an update!' }

  try {
    data = event.data ? { ...data, ...event.data.json() } : data
  } catch {
    data = { ...data, body: event.data ? event.data.text() : data.body }
  }

  const announcementId = data.announcement_id || null
  const targetUrl = data.url || (announcementId ? `/?open_announcement=${announcementId}` : '/')

  // The server persists an event id, and this unique tag ensures Android treats
  // each arrival as a brand-new notification instead of a silent text update.
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/logo-colored.png',
    badge: '/icons/badge.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      url: targetUrl,
      announcement_id: announcementId
    },
    color: '#000000',
    tag: `${data.id || 'axon'}_${Date.now()}`,
    renotify: true,
    requireInteraction: true
  }))
})
