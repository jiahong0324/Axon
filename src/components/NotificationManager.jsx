import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { registerPushSubscription } from '../lib/pushNotifications'

export default function NotificationManager() {
  useEffect(() => {
    // Clean up historical notification tracking keys to prevent key bloat
    try {
      const todayDate = new Date().toISOString().split('T')[0]
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('notified_reminder_') || key.startsWith('notified_class_') || key.startsWith('notified_exam_'))) {
          // If the key is from a previous day, queue it for removal
          if (!key.includes(todayDate)) {
            keysToRemove.push(key)
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
    } catch (e) {
      console.error('Error cleaning up historical notification keys:', e)
    }

    async function initPush() {
      // On load, only register if permission is already granted.
      // This prevents iOS Safari from blocking programmatic alerts on load.
      if ('Notification' in window && Notification.permission === 'granted') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await registerPushSubscription(user)
        }
      }
    }
    initPush()

    const interval = checkNotifications()
    return () => clearInterval(interval)
  }, [])

  function checkNotifications() {
    return setInterval(async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return

      // If this device has an active push subscription, let the backend push service handle notifications.
      // This prevents duplicate notifications on devices running Web Push.
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          if (sub) return
        } catch (e) {
          console.error('Error checking active push subscription:', e)
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const todayDate = now.toISOString().split('T')[0]

      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('reminder_time', currentTime)

      reminders?.forEach(r => {
        const key = `notified_reminder_${r.id}_${todayDate}_${currentTime}`
        if (localStorage.getItem(key)) return
        new Notification('📚 Axon Reminder', {
          body: r.title,
          icon: '/icons/logo.png',
          badge: '/icons/logo.png',
          vibrate: [200, 100, 200]
        })
        localStorage.setItem(key, '1')
      })

      const notifyMinutes = parseInt(localStorage.getItem('axon_notify_minutes') || '10', 10)
      const classNotify = localStorage.getItem('axon_class_notify') !== 'false'
      const examNotify = localStorage.getItem('axon_exam_notify') !== 'false'
      const targetTime = new Date(now.getTime() + notifyMinutes * 60000)
      const targetTimeStr = `${String(targetTime.getHours()).padStart(2, '0')}:${String(targetTime.getMinutes()).padStart(2, '0')}`
      const todayDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]

      if (classNotify) {
        const { data: upcomingClasses } = await supabase
          .from('classes')
          .select('*')
          .eq('user_id', user.id)
          .eq('day', todayDay)
          .eq('start_time', targetTimeStr)

        upcomingClasses?.forEach(cls => {
          const key = `notified_class_${cls.id}_${todayDate}_${targetTimeStr}`
          if (localStorage.getItem(key)) return
          new Notification(`Class starting in ${notifyMinutes} min!`, {
            body: `${cls.subject} [${cls.class_type}] at ${cls.classroom || 'TBA'}`,
            icon: '/icons/logo.png',
            badge: '/icons/logo.png',
            vibrate: [200, 100, 200]
          })
          localStorage.setItem(key, '1')
        })
      }

      if (examNotify) {
        const examNotifyTime = new Date(now)
        examNotifyTime.setHours(8, 0, 0, 0)
        const examTargetTime = new Date(examNotifyTime.getTime() - notifyMinutes * 60000)
        const shouldNotifyExam = now.getHours() === examTargetTime.getHours() && now.getMinutes() === examTargetTime.getMinutes()
        if (shouldNotifyExam) {
          const { data: upcomingExams } = await supabase
            .from('exams')
            .select('*')
            .eq('user_id', user.id)
            .eq('exam_date', todayDate)

          upcomingExams?.forEach(exam => {
            const key = `notified_exam_${exam.id}_${todayDate}`
            if (localStorage.getItem(key)) return
            new Notification(`Exam today - ${notifyMinutes} min reminder!`, {
              body: `${exam.subject} ${exam.exam_type} at ${exam.venue || 'TBA'}`,
              icon: '/icons/logo.png',
              badge: '/icons/logo.png',
              vibrate: [300, 100, 300, 100, 300]
            })
            localStorage.setItem(key, '1')
          })
        }
      }
    }, 60000)
  }

  return null
}
