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

    const pushPayloads = []

    // 2. Fetch Active Reminders due right now
    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_active', true)
      .eq('reminder_time', currentTime)

    reminders?.forEach(r => {
      pushPayloads.push({
        userId: r.user_id,
        title: '📚 Axon Reminder',
        body: r.title,
        url: '/reminders'
      })
    })

    // 3. Fetch Classes starting soon (default lead time: 10 minutes)
    // Note: To be fully precise, we can pull lead time preferences from users, but default to 10 min
    const notifyMinutes = 10
    const nowTime = new Date()
    const targetTime = new Date(nowTime.getTime() + notifyMinutes * 60000)
    const targetTimeStr = timeFormatter.format(targetTime)

    const { data: upcomingClasses } = await supabase
      .from('classes')
      .select('*')
      .eq('day', todayDay)
      .eq('start_time', targetTimeStr)

    upcomingClasses?.forEach(cls => {
      pushPayloads.push({
        userId: cls.user_id,
        title: `Class starting in ${notifyMinutes} min!`,
        body: `${cls.subject} [${cls.class_type}] at ${cls.classroom || 'TBA'}`,
        url: '/'
      })
    })

    // 4. Fetch Exams today (notify at 8:00 AM)
    if (currentTime === '08:00') {
      const { data: upcomingExams } = await supabase
        .from('exams')
        .select('*')
        .eq('exam_date', todayDate)

      upcomingExams?.forEach(exam => {
        pushPayloads.push({
          userId: exam.user_id,
          title: `Exam Today!`,
          body: `${exam.subject} ${exam.exam_type} at ${exam.venue || 'TBA'}`,
          url: '/exams'
        })
      })
    }

    if (pushPayloads.length === 0) {
      return res.status(200).json({ success: true, message: 'No push notifications to send' })
    }

    // 5. Query all active push subscriptions for targeted users
    const userIds = [...new Set(pushPayloads.map(p => p.userId))]
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'No active push subscriptions found' })
    }

    // 6. Dispatch Push Notifications
    const pushPromises = []
    
    for (const payload of pushPayloads) {
      const userSubs = subscriptions.filter(s => s.user_id === payload.userId)
      for (const sub of userSubs) {
        const subObject = sub.subscription
        const promise = webpush.sendNotification(
          subObject,
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url
          })
        ).catch(async (err) => {
          console.error(`Failed to send push to subscription ${sub.id}:`, err)
          // Clean up expired / defunct subscriptions (410 Gone / 404 Not Found)
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
