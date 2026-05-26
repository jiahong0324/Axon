import { supabase } from './supabase'

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function saveSubscriptionToServer(subscription, userId) {
  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userId })
    })
    return response.ok
  } catch (error) {
    console.error('Error saving subscription to API:', error)
    return false
  }
}

export async function registerPushSubscription(user) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const existingSubscription = await reg.pushManager.getSubscription()
    
    // Generate or retrieve a persistent client device ID
    let deviceId = localStorage.getItem('axon_device_id')
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem('axon_device_id', deviceId)
    }

    if (existingSubscription) {
      const subObj = existingSubscription.toJSON()
      subObj.deviceId = deviceId
      subObj.preferences = {
        axon_notify_minutes: localStorage.getItem('axon_notify_minutes') || '10',
        axon_class_notify: localStorage.getItem('axon_class_notify') !== 'false',
        axon_exam_notify: localStorage.getItem('axon_exam_notify') !== 'false'
      }
      const ok = await saveSubscriptionToServer(subObj, user.id)
      if (ok) return existingSubscription
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.warn('VITE_VAPID_PUBLIC_KEY is not defined in frontend env.')
      return null
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)
    const newSubscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    })

    const subObj = newSubscription.toJSON()
    subObj.deviceId = deviceId
    subObj.preferences = {
      axon_notify_minutes: localStorage.getItem('axon_notify_minutes') || '10',
      axon_class_notify: localStorage.getItem('axon_class_notify') !== 'false',
      axon_exam_notify: localStorage.getItem('axon_exam_notify') !== 'false'
    }
    const ok = await saveSubscriptionToServer(subObj, user.id)
    if (ok) return newSubscription
    return null
  } catch (error) {
    console.error('Error registering web push subscription:', error)
    throw error
  }
}
