import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function NotificationManager() {
  useEffect(() => {
    requestNotificationPermission()
    const interval = checkReminders()
    return () => clearInterval(interval)
  }, [])

  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  function checkReminders() {
    return setInterval(async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('reminder_time', currentTime)

      reminders?.forEach(r => {
        new Notification('UniMind Reminder', {
          body: r.title,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [200, 100, 200]
        })
      })
    }, 60000)
  }

  return null
}
