import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// Configure VAPID keys
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:developer@axon-pwa.com',
    vapidPublicKey,
    vapidPrivateKey
  )
}

export default async function handler(req, res) {
  // Allow trigger via GET or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Security check - can verify an API token/secret to prevent unauthorized triggers
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized trigger' })
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured on server' })
  }

  try {
    // 1. Get current time in Malaysia timezone (GMT+8)
    const options = { timeZone: 'Asia/Kuala_Lumpur', hour12: false }
    const formatter = new Intl.DateTimeFormat('en-US', { ...options, year: 'numeric', month: '2-digit', day: '2-digit' })
    const timeFormatter = new Intl.DateTimeFormat('en-US', { ...options, hour: '2-digit', minute: '2-digit' })

    const parts = formatter.formatToParts(new Date())
    const year = parts.find(p => p.type === 'year').value
    const month = parts.find(p => p.type === 'month').value
    const day = parts.find(p => p.type === 'day').value

    const todayDate = `${year}-${month}-${day}` // YYYY-MM-DD
    const currentTime = timeFormatter.format(new Date()) // HH:MM
    const todayDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]

    // 2. Fetch all active push subscriptions
    const { data: subscriptions, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subErr) {
      console.error('Supabase error fetching subscriptions:', subErr)
      return res.status(500).json({ error: subErr.message })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'No active push subscriptions found' })
    }

    // 3. Fetch all active reminders, today's classes, and today's exams across all users
    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_active', true)
      .eq('reminder_time', currentTime)

    const { data: todayClasses } = await supabase
      .from('classes')
      .select('*')
      .eq('day', todayDay)

    const { data: todayExams } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_date', todayDate)

    let assignments = []
    let upcomingExams = []
    if (currentTime === '09:00') {
      const { data: aData } = await supabase.from('assignments').select('*').neq('status', 'Done')
      if (aData) assignments = aData
      
      const { data: eData } = await supabase.from('exams').select('*').gte('exam_date', todayDate)
      if (eData) upcomingExams = eData
    }

    const pushPromises = []

    // 4. Evaluate and dispatch tailored notifications for each subscription
    for (const sub of subscriptions) {
      const subObject = sub.subscription || {}
      const prefs = subObject.preferences || {
        axon_notify_minutes: '10',
        axon_class_notify: true,
        axon_exam_notify: true
      }

      const notifyMinutes = parseInt(prefs.axon_notify_minutes || '10', 10)
      const classNotify = prefs.axon_class_notify !== false && prefs.axon_class_notify !== 'false'
      const examNotify = prefs.axon_exam_notify !== false && prefs.axon_exam_notify !== 'false'

      const subPayloads = []

      // A. Reminders (always exact time matching)
      const userReminders = reminders?.filter(r => r.user_id === sub.user_id) || []
      userReminders.forEach(r => {
        subPayloads.push({
          id: `reminder_${r.id}`,
          title: '📚 Axon Reminder',
          body: r.title,
          url: '/reminders'
        })
      })

      // B. Classes (custom lead time)
      if (classNotify) {
        const userClasses = todayClasses?.filter(cls => cls.user_id === sub.user_id) || []
        const nowTime = new Date()
        const targetTime = new Date(nowTime.getTime() + notifyMinutes * 60000)
        const targetTimeStr = timeFormatter.format(targetTime)

        userClasses.forEach(cls => {
          if (cls.start_time === targetTimeStr) {
            subPayloads.push({
              id: `class_${cls.id}`,
              title: `Class starting in ${notifyMinutes} min!`,
              body: `${cls.subject} [${cls.class_type}] at ${cls.classroom || 'TBA'}`,
              url: '/'
            })
          }
        })
      }

      // C. Exams (custom lead time from exam.start_time or 08:00 AM fallback)
      if (examNotify) {
        try {
          const userExams = todayExams?.filter(exam => exam.user_id === sub.user_id) || []
          
          // Fallback time calculation
          const fallbackExamTime = new Date(`${year}-${month}-${day}T08:00:00+08:00`)
          const fallbackTargetTime = new Date(fallbackExamTime.getTime() - notifyMinutes * 60000)
          const fallbackTargetTimeStr = timeFormatter.format(fallbackTargetTime)

          // Standard time calculation
          const nowTime = new Date()
          const targetTime = new Date(nowTime.getTime() + notifyMinutes * 60000)
          const targetTimeStr = timeFormatter.format(targetTime)

          userExams.forEach(exam => {
            const isFallbackMatch = !exam.start_time && currentTime === fallbackTargetTimeStr
            const isStandardMatch = exam.start_time === targetTimeStr

            if (isFallbackMatch || isStandardMatch) {
              subPayloads.push({
                id: `exam_${exam.id}`,
                title: exam.start_time ? `Exam starting in ${notifyMinutes} min!` : `Exam Today!`,
                body: `${exam.subject} ${exam.exam_type} at ${exam.venue || 'TBA'}`,
                url: '/exams'
              })
            }
          })
        } catch (err) {
          console.error(`Failed to evaluate exam time for sub ${sub.id}:`, err)
        }
      }

      // E. Attendance Reminders
      const attendanceNotify = prefs.axon_attendance_notify !== false && prefs.axon_attendance_notify !== 'false'
      const attendanceMinutes = parseInt(prefs.axon_attendance_minutes || '10', 10)
      
      if (attendanceNotify) {
        const userClasses = todayClasses?.filter(cls => cls.user_id === sub.user_id) || []
        const nowTime = new Date()
        const targetEndTime = new Date(nowTime.getTime() + attendanceMinutes * 60000)
        const targetEndTimeStr = timeFormatter.format(targetEndTime)

        userClasses.forEach(cls => {
          if (cls.end_time === targetEndTimeStr) {
            subPayloads.push({
              id: `attendance_${cls.id}`,
              title: `Attendance Reminder!`,
              body: `${cls.subject} is ending in ${attendanceMinutes} min. Don't forget to take the attendance code!`,
              url: '/'
            })
          }
        })
      }

      // D. Daily Deadlines (09:00 AM)
      if (currentTime === '09:00') {
        const assignmentReminders = prefs.assignmentReminders !== false && prefs.assignmentReminders !== 'false'
        const examAlerts = prefs.examAlerts !== false && prefs.examAlerts !== 'false'
        const leadTimeStr = prefs.reminderLeadTime || '3 days'
        const leadDays = leadTimeStr === '1 day' ? 1 : leadTimeStr === '1 week' ? 7 : 3
        
        // Calculate the target date string (YYYY-MM-DD)
        const targetDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day) + leadDays)
        const ty = targetDateObj.getFullYear()
        const tm = String(targetDateObj.getMonth() + 1).padStart(2, '0')
        const td = String(targetDateObj.getDate()).padStart(2, '0')
        const targetDateStr = `${ty}-${tm}-${td}`

        if (assignmentReminders) {
          const userAssignments = assignments.filter(a => a.user_id === sub.user_id)
          userAssignments.forEach(a => {
            if (a.deadline === targetDateStr) {
              subPayloads.push({
                id: `assignment_due_${a.id}_${todayDate}`,
                title: `Assignment due in ${leadDays} ${leadDays === 1 ? 'day' : 'days'}!`,
                body: `${a.title} (${a.subject})`,
                url: '/assignments'
              })
            }
          })
        }

        if (examAlerts) {
          const userExams = upcomingExams.filter(e => e.user_id === sub.user_id)
          userExams.forEach(e => {
            if (e.exam_date === targetDateStr) {
              subPayloads.push({
                id: `exam_countdown_${e.id}_${todayDate}`,
                title: `Exam in ${leadDays} ${leadDays === 1 ? 'day' : 'days'}!`,
                body: `${e.subject} ${e.exam_type} is coming up.`,
                url: '/exams'
              })
            }
          })
        }
      }

      if (subPayloads.length === 0) continue

      const lastSent = subObject._last_sent || { date: '', minute: '', ids: [] }

      // Reset tracking if date/minute changed
      if (lastSent.date !== todayDate || lastSent.minute !== currentTime) {
        lastSent.date = todayDate
        lastSent.minute = currentTime
        lastSent.ids = []
      }

      // Filter out payloads already sent to this subscription
      const unsentPayloads = subPayloads.filter(p => !lastSent.ids.includes(p.id))
      if (unsentPayloads.length === 0) {
        console.log(`All payloads already sent to subscription ${sub.id} at ${currentTime}`)
        continue
      }

      // Record as sent in the database immediately BEFORE sending to prevent race conditions
      unsentPayloads.forEach(p => lastSent.ids.push(p.id))
      subObject._last_sent = lastSent

      try {
        const { error: updateErr } = await supabase
          .from('push_subscriptions')
          .update({ subscription: subObject, updated_at: new Date().toISOString() })
          .eq('id', sub.id)
        
        if (updateErr) {
          console.error(`Failed to update subscription tracking for ${sub.id}:`, updateErr)
          continue
        }
      } catch (dbErr) {
        console.error(`DB Update catch for ${sub.id}:`, dbErr)
        continue
      }

      for (const payload of unsentPayloads) {
        const promise = webpush.sendNotification(
          subObject,
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url
          })
        ).catch(async (err) => {
          console.error(`Failed to send push to subscription ${sub.id}:`, err)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            console.log(`Cleaned up expired subscription: ${sub.id}`)
          }
        })
        pushPromises.push(promise)
      }
    }

    await Promise.all(pushPromises)
    return res.status(200).json({ success: true, sentCount: pushPromises.length })
  } catch (error) {
    console.error('Push notification cron failed:', error)
    return res.status(500).json({ error: error.message })
  }
}
