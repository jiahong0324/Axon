const CACHE_NAME = 'axon-v5-background-push'
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
  const targetUrl = event.notification.data || '/reminders'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url && 'focus' in client && (client.url.includes(targetUrl) || targetUrl === '/')) {
          return client.focus()
        }
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : undefined
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

  // The server persists an event id, and this tag makes a retry safe at the
  // OS tray level. Avoid doing cache/network work before showNotification:
  // a failed cache operation must never prevent a push from being displayed.
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/logo-colored.png',
    badge: '/icons/badge.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.url || '/reminders',
    color: '#000000',
    tag: data.id || `${data.title}|${data.body}`,
    renotify: false
  }))
})
