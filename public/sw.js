const CACHE_NAME = 'axon-v2'
const STATIC_ASSETS = ['/', '/manifest.json']

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

  // Only handle same-origin requests to prevent intercepting Supabase API or external calls
  const url = new URL(e.request.url)
  if (url.origin !== self.location.origin) return

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

const seenPushes = new Set()

self.addEventListener('push', e => {
  let data = { title: '📚 Axon Notification', body: 'You have an update!' }
  try {
    data = e.data ? e.data.json() : data
  } catch {
    data = { title: '📚 Axon Notification', body: e.data ? e.data.text() : 'You have an update!' }
  }

  const dupKey = `${data.title}|${data.body}`
  
  // 1. Synchronous In-Memory Deduplication Lock (instant thread-level mutual exclusion)
  if (seenPushes.has(dupKey)) {
    console.log('Skipping duplicate push (synchronous in-memory lock):', data.title, data.body)
    return
  }
  seenPushes.add(dupKey)
  setTimeout(() => {
    seenPushes.delete(dupKey)
  }, 60000) // retain for 60 seconds

  const options = {
    body: data.body,
    icon: '/icons/logo.png',
    badge: '/icons/logo.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.url || '/'
  }

  const dupKeyEncoded = encodeURIComponent(dupKey)
  const lockUrl = `https://axon-notification-lock.local/${dupKeyEncoded}`
  const LOCK_CACHE_NAME = 'axon-notification-locks-v1'

  e.waitUntil(
    caches.open(LOCK_CACHE_NAME).then(async cache => {
      // 2. Persistent Cache-Based Lock check
      const lockMatch = await cache.match(lockUrl)
      if (lockMatch) {
        console.log('Skipping duplicate push (persistent cache lock):', data.title, data.body)
        return
      }

      // Write the lock to cache immediately
      await cache.put(lockUrl, new Response('1', {
        headers: { 'Date': new Date().toUTCString() }
      }))

      // 3. Double check active notifications on system tray
      const notifications = await self.registration.getNotifications()
      const isDuplicate = notifications.some(n => n.title === data.title && n.body === data.body)
      if (isDuplicate) {
        console.log('Skipping duplicate push notification (active tray):', data.title, data.body)
        return
      }

      // 4. Display native system notification
      await self.registration.showNotification(data.title, options)

      // 5. Clean up old locks in the background (moved to end of flow to prevent blocking)
      try {
        const keys = await cache.keys()
        for (const req of keys) {
          const res = await cache.match(req)
          if (res) {
            const dateHeader = res.headers.get('Date')
            if (dateHeader) {
              const age = Date.now() - new Date(dateHeader).getTime()
              if (age > 300000) { // 5 minutes in milliseconds
                await cache.delete(req)
              }
            }
          }
        }
      } catch (cleanErr) {
        console.error('Error cleaning notification locks cache:', cleanErr)
      }
    })
  )
})
