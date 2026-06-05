import { supabase } from './supabase'
import { registerPushSubscription } from './pushNotifications'

export const DEFAULT_PREFERENCES = {
  axon_notify_minutes: '10',
  axon_class_notify: 'true',
  axon_exam_notify: 'true',
  assignmentReminders: 'true',
  examAlerts: 'true',
  reminderLeadTime: '3 days',
  aiLanguage: 'English',
  aiStyle: 'Casual',
  dailyTipEnabled: 'true',
  firstDay: 'Monday',
  timeFormat: '24hr',
  theme: 'dark',
  accentColor: 'blue',
  fontSize: 'medium',
  compactMode: 'false'
}

export async function syncPreferences(user) {
  if (!user) return

  const remotePrefs = user.user_metadata?.preferences || {}
  const mergedPrefs = { ...DEFAULT_PREFERENCES, ...remotePrefs }
  let needsUpload = false

  // Sync to local storage
  Object.keys(mergedPrefs).forEach(key => {
    const remoteVal = mergedPrefs[key]
    const localVal = localStorage.getItem(key)

    if (localVal === null) {
      // Local doesn't have it, set from merged (remote or default)
      localStorage.setItem(key, String(remoteVal))
      needsUpload = true // Ensure everything is uploaded if it's new
    } else if (remotePrefs[key] === undefined) {
      // Local has a value but remote doesn't have this key yet, prepare upload
      mergedPrefs[key] = localVal
      needsUpload = true
    } else if (localVal !== String(remoteVal)) {
      // Local and remote differ, update local storage with the remote database value
      localStorage.setItem(key, String(remoteVal))
    }
  })

  // Dispatch custom events to keep ThemeProvider and other settings state in sync dynamically
  window.dispatchEvent(new CustomEvent('preferences-synced'))

  if (needsUpload) {
    try {
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          preferences: mergedPrefs
        }
      })
    } catch (err) {
      console.error('Error uploading default preferences:', err)
    }
  }

  // Auto-register/update push subscription with the newly synced preferences
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      await registerPushSubscription(user)
    }
  } catch (err) {
    console.error('Error auto-registering push subscription during sync:', err)
  }
}

export async function updatePreference(user, key, value) {
  const strValue = String(value)
  // 1. Save locally in localStorage
  localStorage.setItem(key, strValue)

  // 2. Trigger custom events for real-time appearance context updates if needed
  if (key === 'theme') window.dispatchEvent(new CustomEvent('theme-changed', { detail: strValue }))
  if (key === 'accentColor') window.dispatchEvent(new CustomEvent('accent-changed', { detail: strValue }))
  if (key === 'fontSize') window.dispatchEvent(new CustomEvent('font-size-changed', { detail: strValue }))
  if (key === 'compactMode') window.dispatchEvent(new CustomEvent('compact-changed', { detail: strValue === 'true' }))

  // 3. Save remotely in Supabase User Metadata
  let currentUser = user
  if (!currentUser) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      currentUser = authUser
    } catch (err) {
      console.error('Error fetching user for preference sync:', err)
    }
  }

  if (currentUser) {
    try {
      const existingPrefs = currentUser.user_metadata?.preferences || {}
      const newPrefs = { ...existingPrefs, [key]: strValue }
      
      await supabase.auth.updateUser({
        data: {
          ...currentUser.user_metadata,
          preferences: newPrefs
        }
      })
    } catch (err) {
      console.error(`Failed to update remote preference ${key}:`, err)
    }

    // 4. Update the push notification server if notification-related settings change
    if (['axon_notify_minutes', 'axon_class_notify', 'axon_exam_notify'].includes(key)) {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          await registerPushSubscription(currentUser)
        }
      } catch (err) {
        console.error('Failed to sync push subscription on preference update:', err)
      }
    }
  }
}
