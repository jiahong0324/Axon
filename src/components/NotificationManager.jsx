import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function NotificationManager() {
  useEffect(() => {
    requestNotificationPermission()
    const interval = checkNotifications()
    return () => clearInterval(interval)
  }, [])

  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  function checkNotifications() {
    return setInterval(async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return
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
        if (sessionStorage.getItem(key)) return
        new Notification('📚 Axon Reminder', {
          body: r.title,
          icon: '/icons/logo.png',
          badge: '/icons/logo.png',
          vibrate: [200, 100, 200]
        })
        sessionStorage.setItem(key, '1')
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
          const key = `notified_class_${cls.id}_${todayDate}`
          if (sessionStorage.getItem(key)) return
          new Notification(`Class starting in ${notifyMinutes} min!`, {
            body: `${cls.subject} [${cls.class_type}] at ${cls.classroom || 'TBA'}`,
            icon: '/icons/logo.png',
            badge: '/icons/logo.png',
            vibrate: [200, 100, 200]
          })
          sessionStorage.setItem(key, '1')
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
            if (sessionStorage.getItem(key)) return
            new Notification(`Exam today - ${notifyMinutes} min reminder!`, {
              body: `${exam.subject} ${exam.exam_type} at ${exam.venue || 'TBA'}`,
              icon: '/icons/logo.png',
              badge: '/icons/logo.png',
              vibrate: [300, 100, 300, 100, 300]
            })
            sessionStorage.setItem(key, '1')
          })
        }
      }
    }, 60000)
  }

  return null
}
