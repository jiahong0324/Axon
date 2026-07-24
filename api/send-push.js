import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const TIME_ZONE = 'Asia/Kuala_Lumpur'
// The cron job should run every minute. This window lets a delayed/cold-started
// invocation catch up instead of losing a notification forever.
const configuredLateMinutes = Number(process.env.PUSH_MAX_LATE_MINUTES || 10)
const MAX_LATE_MINUTES = Number.isFinite(configuredLateMinutes) ? Math.max(1, configuredLateMinutes) : 10
const NOTIFICATION_STATE_RETENTION_MS = 8 * 24 * 60 * 60 * 1000

const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:developer@axon-pwa.com', vapidPublicKey, vapidPrivateKey)
}

function getZonedParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour12: false,
    hourCycle: 'h23',
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(date)

  const get = type => parts.find(part => part.type === type)?.value
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour')
  const minute = get('minute')

  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday: get('weekday'),
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    minutes: Number(hour) * 60 + Number(minute)
  }
}

function zonedDate(dateString, timeString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || '') || !/^\d{2}:\d{2}$/.test(timeString || '')) {
    return null
  }

  const date = new Date(`${dateString}T${timeString}:00+08:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function isDue(nowMs, scheduledAt, maxLateMinutes = MAX_LATE_MINUTES) {
  if (!scheduledAt) return false
  const lateByMs = nowMs - scheduledAt.getTime()
  return lateByMs >= 0 && lateByMs <= maxLateMinutes * 60 * 1000
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function preferenceEnabled(value, fallback = true) {
  if (value === undefined || value === null) return fallback
  return value !== false && value !== 'false'
}

function getNotificationState(subscription) {
  const current = subscription._notification_state
  const state = current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {}
  const cutoff = Date.now() - NOTIFICATION_STATE_RETENTION_MS

  Object.entries(state).forEach(([key, sentAt]) => {
    if (!Number.isFinite(Number(sentAt)) || Number(sentAt) < cutoff) delete state[key]
  })

  return state
}

function notificationKey(id, date) {
  return `${id}_${date}`
}

async function processSubscription(sub, context) {
  const subObject = sub.subscription || {}
  const prefs = subObject.preferences || {}
  const notifyMinutes = Math.max(0, parseInt(prefs.axon_notify_minutes || '10', 10) || 10)
  const attendanceMinutes = Math.max(0, parseInt(prefs.axon_attendance_minutes || '10', 10) || 10)
  const classNotify = preferenceEnabled(prefs.axon_class_notify)
  const examNotify = preferenceEnabled(prefs.axon_exam_notify)
  const attendanceNotify = preferenceEnabled(prefs.axon_attendance_notify)
  const subPayloads = []

  const pushPayload = (payload, key) => subPayloads.push({ ...payload, key })

  // A. Reminders: compare against a delivery window rather than an exact
  // database time, so a cron invocation delayed by a few minutes catches up.
  const userReminders = context.reminders.filter(reminder => reminder.user_id === sub.user_id)
  userReminders.forEach(reminder => {
    const reminderAt = zonedDate(context.todayDate, reminder.reminder_time)
    if (!isDue(context.nowMs, reminderAt)) return

    if ((reminder.repeat_type || '').toLowerCase() === 'weekly' && reminder.created_at) {
      const createdWeekday = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        weekday: 'long'
      }).format(new Date(reminder.created_at))
      if (createdWeekday !== context.todayDay) return
    }

    pushPayload({
      title: '📚 Axon Reminder',
      body: reminder.title,
      url: '/reminders',
      reminderObj: reminder
    }, notificationKey(`reminder_${reminder.id}`, context.todayDate))
  })

  // B. Classes: notify when the scheduled lead time has passed, up to the
  // configured late window.
  if (classNotify) {
    context.todayClasses
      .filter(cls => cls.user_id === sub.user_id)
      .forEach(cls => {
        const classAt = zonedDate(context.todayDate, cls.start_time)
        if (!classAt) return
        const notifyAt = new Date(classAt.getTime() - notifyMinutes * 60 * 1000)
        if (!isDue(context.nowMs, notifyAt)) return

        pushPayload({
          title: `Class starting in ${notifyMinutes} min!`,
          body: `${cls.subject} [${cls.class_type}] at ${cls.classroom || 'TBA'}`,
          url: '/'
        }, notificationKey(`class_${cls.id}`, context.todayDate))
      })
  }

  // C. Exams: use the configured start time, or 08:00 as the existing fallback.
  if (examNotify) {
    context.todayExams
      .filter(exam => exam.user_id === sub.user_id)
      .forEach(exam => {
        const examAt = zonedDate(context.todayDate, exam.start_time || '08:00')
        if (!examAt) return
        const notifyAt = new Date(examAt.getTime() - notifyMinutes * 60 * 1000)
        if (!isDue(context.nowMs, notifyAt)) return

        pushPayload({
          title: exam.start_time ? `Exam starting in ${notifyMinutes} min!` : 'Exam Today!',
          body: `${exam.subject} ${exam.exam_type} at ${exam.venue || 'TBA'}`,
          url: '/exams'
        }, notificationKey(`exam_${exam.id}`, context.todayDate))
      })
  }

  // D. Attendance reminders.
  if (attendanceNotify) {
    context.todayClasses
      .filter(cls => cls.user_id === sub.user_id)
      .forEach(cls => {
        const classEndAt = zonedDate(context.todayDate, cls.end_time)
        if (!classEndAt) return
        const notifyAt = new Date(classEndAt.getTime() - attendanceMinutes * 60 * 1000)
        if (!isDue(context.nowMs, notifyAt)) return

        pushPayload({
          title: 'Attendance Reminder!',
          body: `${cls.subject} is ending in ${attendanceMinutes} min. Don't forget to take the attendance code!`,
          url: '/'
        }, notificationKey(`attendance_${cls.id}`, context.todayDate))
      })
  }

  // E. Daily deadline countdowns. Keep the original 09:00 delivery time, but
  // allow a delayed cron invocation to deliver within the late window.
  const dailyDigestAt = zonedDate(context.todayDate, '09:00')
  if (isDue(context.nowMs, dailyDigestAt)) {
    const leadTime = prefs.reminderLeadTime || '3 days'
    const leadDays = leadTime === '1 day' ? 1 : leadTime === '1 week' ? 7 : 3
    const targetDate = addDays(context.todayDate, leadDays)

    if (preferenceEnabled(prefs.assignmentReminders)) {
      context.assignments
        .filter(assignment => assignment.user_id === sub.user_id && assignment.deadline === targetDate)
        .forEach(assignment => pushPayload({
          title: `Assignment due in ${leadDays} ${leadDays === 1 ? 'day' : 'days'}!`,
          body: `${assignment.title} (${assignment.subject})`,
          url: '/assignments'
        }, notificationKey(`assignment_due_${assignment.id}`, context.todayDate)))
    }

    if (preferenceEnabled(prefs.examAlerts)) {
      context.upcomingExams
        .filter(exam => exam.user_id === sub.user_id && exam.exam_date === targetDate)
        .forEach(exam => pushPayload({
          title: `Exam in ${leadDays} ${leadDays === 1 ? 'day' : 'days'}!`,
          body: `${exam.subject} ${exam.exam_type} is coming up.`,
          url: '/exams'
        }, notificationKey(`exam_countdown_${exam.id}`, context.todayDate)))
    }
  }

  const sentState = getNotificationState(subObject)
  const unsentPayloads = subPayloads.filter(payload => !sentState[payload.key])
  if (unsentPayloads.length === 0) return { sentCount: 0, expired: false }

  let sentCount = 0
  let expired = false

  for (const payload of unsentPayloads) {
    try {
      await webpush.sendNotification(
        subObject,
        JSON.stringify({
          id: payload.key,
          title: payload.title,
          body: payload.body,
          url: payload.url
        }),
        // High urgency helps mobile push services wake a sleeping device. TTL
        // also lets the provider deliver shortly after a temporary disconnect.
        { TTL: 600, urgency: 'high' }
      )

      sentState[payload.key] = Date.now()
      sentCount += 1

      if (payload.reminderObj && (payload.reminderObj.repeat_type || '').toLowerCase() === 'once') {
        await supabase
          .from('reminders')
          .update({ is_active: false })
          .eq('id', payload.reminderObj.id)
      }
    } catch (error) {
      console.error(`Failed to send push to subscription ${sub.id}:`, error)
      if (error.statusCode === 404 || error.statusCode === 410) expired = true
    }
  }

  if (expired) {
    await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    return { sentCount, expired: true }
  }

  if (sentCount > 0) {
    subObject._notification_state = sentState
    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update({ subscription: subObject, updated_at: new Date().toISOString() })
      .eq('id', sub.id)

    if (updateError) console.error(`Failed to persist notification state for ${sub.id}:`, updateError)
  }

  return { sentCount, expired: false }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized trigger' })
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured on server' })
  }

  try {
    const now = new Date()
    const nowParts = getZonedParts(now)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subError) {
      console.error('Supabase error fetching subscriptions:', subError)
      return res.status(500).json({ error: subError.message })
    }

    if (!subscriptions?.length) {
      return res.status(200).json({ success: true, sentCount: 0, message: 'No active push subscriptions found' })
    }

    const [remindersResult, classesResult, examsResult, assignmentsResult] = await Promise.all([
      supabase.from('reminders').select('*').eq('is_active', true),
      supabase.from('classes').select('*').eq('day', nowParts.weekday),
      supabase.from('exams').select('*').eq('exam_date', nowParts.date),
      supabase.from('assignments').select('*').neq('status', 'Done')
    ])

    const queryError = [remindersResult, classesResult, examsResult, assignmentsResult]
      .map(result => result.error)
      .find(Boolean)
    if (queryError) {
      console.error('Supabase error fetching notification data:', queryError)
      return res.status(500).json({ error: queryError.message })
    }

    const { data: upcomingExams, error: upcomingExamError } = await supabase
      .from('exams')
      .select('*')
      .gte('exam_date', nowParts.date)
    if (upcomingExamError) {
      console.error('Supabase error fetching upcoming exams:', upcomingExamError)
      return res.status(500).json({ error: upcomingExamError.message })
    }

    const context = {
      nowMs: now.getTime(),
      todayDate: nowParts.date,
      todayDay: nowParts.weekday,
      reminders: remindersResult.data || [],
      todayClasses: classesResult.data || [],
      todayExams: examsResult.data || [],
      upcomingExams: upcomingExams || [],
      assignments: assignmentsResult.data || []
    }

    // Deduplicate subscriptions: keep only the most recently updated subscription
    // per user+device combination to prevent duplicate notifications.
    const deduped = new Map()
    for (const sub of subscriptions) {
      const deviceId = sub.subscription?.deviceId || sub.endpoint || sub.id
      const key = `${sub.user_id}_${deviceId}`
      const existing = deduped.get(key)
      if (!existing || (sub.updated_at || '') > (existing.updated_at || '')) {
        deduped.set(key, sub)
      }
    }
    const uniqueSubscriptions = Array.from(deduped.values())

    const results = await Promise.all(uniqueSubscriptions.map(sub => processSubscription(sub, context)))
    const sentCount = results.reduce((total, result) => total + result.sentCount, 0)
    const expiredCount = results.filter(result => result.expired).length

    return res.status(200).json({
      success: true,
      sentCount,
      expiredCount,
      checkedAt: now.toISOString(),
      timeZone: TIME_ZONE,
      maxLateMinutes: MAX_LATE_MINUTES
    })
  } catch (error) {
    console.error('Push notification cron failed:', error)
    return res.status(500).json({ error: error.message })
  }
}
