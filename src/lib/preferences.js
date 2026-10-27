import { supabase } from './supabase'
import { registerPushSubscription } from './pushNotifications'
import { safeSetItem } from './safeStorage'
import { logActivity } from './logActivity'

export const PREFERENCE_LABELS = {
  theme: { name: 'Theme', format: v => v === 'dark' ? 'Dark' : v === 'light' ? 'Light' : 'System' },
  accentColor: { name: 'Accent Color', format: v => v ? v.charAt(0).toUpperCase() + v.slice(1) : v },
  fontSize: { name: 'Font Size', format: v => v ? v.charAt(0).toUpperCase() + v.slice(1) : v },
  fontFamily: { name: 'Text Style', format: v => v === 'mono' ? 'Monospace' : v === 'serif' ? 'Serif' : 'Sans-Serif' },
  compactMode: { name: 'Compact Mode', format: v => v === 'true' ? 'Enabled' : 'Disabled' },
  appLanguage: { name: 'Interface Language', format: v => v === 'zh' ? '中文' : 'English' },
  aiLanguage: { name: 'AI Language', format: v => v },
  aiStyle: { name: 'AI Style', format: v => v },
  dailyTipEnabled: { name: 'Daily AI Tip', format: v => v === 'true' ? 'Enabled' : 'Disabled' },
  firstDay: { name: 'First Day of Week', format: v => v },
  timeFormat: { name: 'Time Format', format: v => v },
  assignmentReminders: { name: 'Assignment Deadline Alerts', format: v => v === 'true' ? 'Enabled' : 'Disabled' },
  examAlerts: { name: 'Exam Alerts', format: v => v === 'true' ? 'Enabled' : 'Disabled' },
  reminderLeadTime: { name: 'Deadline Reminder Notice', format: v => v },
  axon_class_notify: { name: 'Class Starting Alerts', format: v => v === 'true' ? 'Enabled' : 'Disabled' },
  axon_exam_notify: { name: 'Exam Starting Alerts', format: v => v === 'true' ? 'Enabled' : 'Disabled' },
  axon_notify_minutes: { name: 'Class/Exam Alert Lead Time', format: v => `${v} minutes before` },
  axon_attendance_notify: { name: 'Attendance Code Reminder', format: v => v === 'true' ? 'Enabled' : 'Disabled' },
  axon_attendance_minutes: { name: 'Attendance Reminder Lead Time', format: v => `${v} minutes before` }
}

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
  compactMode: 'false',
  appLanguage: 'en',
  axon_semester_name: '',
  axon_semester_start_date: '',
  axon_semester_end_date: ''
}

export async function syncPreferences(user) {
  if (!user) return

  const remotePrefs = user.user_metadata?.preferences || {}
  const mergedPrefs = { ...DEFAULT_PREFERENCES, ...remotePrefs }
  let needsUpload = false

  // Sync to local storage
  Object.keys(mergedPrefs).forEach(key => {
    if (['axon_semester_name', 'axon_semester_start_date', 'axon_semester_end_date'].includes(key)) {
      const metaKey = key.replace('axon_', '')
      const val = user.user_metadata?.[metaKey] !== undefined
        ? String(user.user_metadata[metaKey] || '')
        : (user.user_metadata?.preferences?.[key] !== undefined ? String(user.user_metadata.preferences[key] || '') : (localStorage.getItem(key) || ''))
      safeSetItem(key, val)
      mergedPrefs[key] = val
      return
    }

    const remoteVal = mergedPrefs[key]
    const localVal = localStorage.getItem(key)

    if (localVal === null) {
      // Local doesn't have it, set from merged (remote or default)
      safeSetItem(key, String(remoteVal))
      needsUpload = true // Ensure everything is uploaded if it's new
    } else if (remotePrefs[key] === undefined) {
      // Local has a value but remote doesn't have this key yet, prepare upload
      mergedPrefs[key] = localVal
      needsUpload = true
    } else if (localVal !== String(remoteVal)) {
      // Local and remote differ, update local storage with the remote database value
      safeSetItem(key, String(remoteVal))
    }
  })

  // Dispatch custom events to keep ThemeProvider and other settings state in sync dynamically
  window.dispatchEvent(new CustomEvent('preferences-synced'))

  if (needsUpload) {
    try {
      await supabase.auth.updateUser({
        data: {
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
  safeSetItem(key, strValue)

  // 2. Trigger custom events for real-time appearance context updates if needed
  if (key === 'theme') window.dispatchEvent(new CustomEvent('theme-changed', { detail: strValue }))
  if (key === 'accentColor') window.dispatchEvent(new CustomEvent('accent-changed', { detail: strValue }))
  if (key === 'fontSize') window.dispatchEvent(new CustomEvent('font-size-changed', { detail: strValue }))
  if (key === 'compactMode') window.dispatchEvent(new CustomEvent('compact-changed', { detail: strValue === 'true' }))
  if (key === 'appLanguage') window.dispatchEvent(new CustomEvent('language-changed', { detail: strValue }))

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
    if (['axon_notify_minutes', 'axon_class_notify', 'axon_exam_notify', 'axon_semester_start_date', 'axon_semester_end_date'].includes(key)) {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          await registerPushSubscription(currentUser)
        }
      } catch (err) {
        console.error('Failed to sync push subscription on preference update:', err)
      }
    }

    // 5. Record activity in activity_log for manager visibility
    try {
      const prefInfo = PREFERENCE_LABELS[key]
      const label = prefInfo?.name || key
      const friendlyVal = prefInfo?.format ? prefInfo.format(strValue) : strValue
      logActivity('Updated setting', 'settings', label, currentUser.id, {
        key,
        value: strValue,
        label,
        friendly_value: friendlyVal
      }).catch(() => {})
    } catch (e) {}
  }
}

export async function saveSemesterPreferences(user, { name, startDate, endDate, linkedProfiles }) {
  const nextName = String(name || '').trim()
  const nextStartDate = String(startDate || '').trim()
  const nextEndDate = String(endDate || '').trim()

  // 1. Save locally
  safeSetItem('axon_semester_name', nextName)
  safeSetItem('axon_semester_start_date', nextStartDate)
  safeSetItem('axon_semester_end_date', nextEndDate)

  // 2. Fetch fresh user if not provided
  let currentUser = user
  if (!currentUser) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      currentUser = authUser
    } catch (err) {
      console.error('Error fetching user for semester preference sync:', err)
    }
  }

  if (!currentUser) return null

  // 3. Atomically update both top-level metadata AND preferences
  const existingPrefs = currentUser.user_metadata?.preferences || {}
  const updatedPrefs = {
    ...existingPrefs,
    axon_semester_name: nextName,
    axon_semester_start_date: nextStartDate,
    axon_semester_end_date: nextEndDate
  }

  const updateData = {
    semester_name: nextName,
    semester_start_date: nextStartDate,
    semester_end_date: nextEndDate,
    preferences: updatedPrefs
  }
  if (linkedProfiles !== undefined) {
    updateData.linked_timetables = linkedProfiles
  }

  const { data, error } = await supabase.auth.updateUser({
    data: updateData
  })

  if (error) {
    console.error('Failed to atomically update semester metadata:', error)
  }

  const updatedUser = data?.user || currentUser

  // 4. Sync push subscription
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      await registerPushSubscription(updatedUser)
    }
  } catch (err) {
    console.error('Failed to sync push subscription on semester update:', err)
  }

  return updatedUser
}
