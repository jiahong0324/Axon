import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { registerPushSubscription } from '../lib/pushNotifications'

export default function NotificationManager() {
  useEffect(() => {
    // Clean up historical notification tracking keys to prevent key bloat
    try {
      const localNow = new Date()
      const year = localNow.getFullYear()
      const month = String(localNow.getMonth() + 1).padStart(2, '0')
      const day = String(localNow.getDate()).padStart(2, '0')
      const todayDate = `${year}-${month}-${day}`
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('notified_reminder_') || 
          key.startsWith('notified_class_') || 
          key.startsWith('notified_exam_') ||
          key.startsWith('notified_assignment_due_') ||
          key.startsWith('notified_exam_countdown_') ||
          key.startsWith('axon_last_checked_')
        )) {
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

      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const todayDate = `${year}-${month}-${day}`
      const minuteLockKey = `axon_last_checked_${todayDate}_${currentTime}`

      // Acquire Lock: Since localStorage reads and writes are synchronous, the very first tab
      // to enter this interval will set the lock. All other tabs will read the lock, see '1',
      // and immediately exit before performing any asynchronous operations or network calls.
      if (localStorage.getItem(minuteLockKey)) {
        return
      }
      localStorage.setItem(minuteLockKey, '1')

      // If the browser supports Web Push, permission is granted, and it is successfully registered
      // on the backend, rely 100% on the server-side push service. Otherwise, fall back to this local thread.
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        if (Notification.permission === 'granted' && localStorage.getItem('axon_push_registered') === 'true') {
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
        const { data: upcomingExams } = await supabase
          .from('exams')
          .select('*')
          .eq('user_id', user.id)
          .eq('exam_date', todayDate)

        const fallbackExamTime = new Date(now)
        fallbackExamTime.setHours(8, 0, 0, 0)
        const fallbackTargetTime = new Date(fallbackExamTime.getTime() - notifyMinutes * 60000)
        const fallbackTargetTimeStr = `${String(fallbackTargetTime.getHours()).padStart(2, '0')}:${String(fallbackTargetTime.getMinutes()).padStart(2, '0')}`

        upcomingExams?.forEach(exam => {
          const isFallbackMatch = !exam.start_time && currentTime === fallbackTargetTimeStr
          const isStandardMatch = exam.start_time === targetTimeStr

          if (isFallbackMatch || isStandardMatch) {
            const key = `notified_exam_${exam.id}_${todayDate}_${currentTime}`
            if (localStorage.getItem(key)) return
            new Notification(exam.start_time ? `Exam starting in ${notifyMinutes} min!` : `Exam Today!`, {
              body: `${exam.subject} ${exam.exam_type} at ${exam.venue || 'TBA'}`,
              icon: '/icons/logo.png',
              badge: '/icons/logo.png',
              vibrate: [300, 100, 300, 100, 300]
            })
            localStorage.setItem(key, '1')
          }
        })
      }

      if (currentTime === '09:00') {
        const assignmentReminders = localStorage.getItem('assignmentReminders') !== 'false'
        const examAlertsLocal = localStorage.getItem('examAlerts') !== 'false'
        const leadTimeStr = localStorage.getItem('reminderLeadTime') || '3 days'
        const leadDays = leadTimeStr === '1 day' ? 1 : leadTimeStr === '1 week' ? 7 : 3
        
        const targetDateObj = new Date(year, parseInt(month) - 1, parseInt(day) + leadDays)
        const ty = targetDateObj.getFullYear()
        const tm = String(targetDateObj.getMonth() + 1).padStart(2, '0')
        const td = String(targetDateObj.getDate()).padStart(2, '0')
        const targetDateStr = `${ty}-${tm}-${td}`

        if (assignmentReminders) {
          const { data: assignments } = await supabase
            .from('assignments')
            .select('*')
            .eq('user_id', user.id)
            .neq('status', 'Done')
            .eq('deadline', targetDateStr)

          assignments?.forEach(a => {
            const key = `notified_assignment_due_${a.id}_${todayDate}`
            if (localStorage.getItem(key)) return
            new Notification(`Assignment due in ${leadDays} ${leadDays === 1 ? 'day' : 'days'}!`, {
              body: `${a.title} (${a.subject})`,
              icon: '/icons/logo.png',
              badge: '/icons/logo.png',
              vibrate: [200, 100, 200]
            })
            localStorage.setItem(key, '1')
          })
        }

        if (examAlertsLocal) {
          const { data: exams } = await supabase
            .from('exams')
            .select('*')
            .eq('user_id', user.id)
            .eq('exam_date', targetDateStr)

          exams?.forEach(e => {
            const key = `notified_exam_countdown_${e.id}_${todayDate}`
            if (localStorage.getItem(key)) return
            new Notification(`Exam in ${leadDays} ${leadDays === 1 ? 'day' : 'days'}!`, {
              body: `${e.subject} ${e.exam_type} is coming up.`,
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
