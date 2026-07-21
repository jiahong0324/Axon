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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body || {}
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured on server' })
  }

  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase error fetching subscriptions:', error)
      return res.status(500).json({ error: error.message })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active push subscriptions found for this user.' })
    }

    const pushPromises = subscriptions.map(sub => {
      return webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: '🚀 Axon Test Notification',
          body: 'Success! Background push notifications are fully working on this device.',
          url: '/settings',
          id: `test_${Date.now()}`
        }),
        { TTL: 600, urgency: 'high' }
      ).catch(async (err) => {
        console.error(`Failed to send test push to subscription ${sub.id}:`, err)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      })
    })

    await Promise.all(pushPromises)
    return res.status(200).json({ success: true, message: `Test push sent to ${subscriptions.length} subscription(s).` })
  } catch (error) {
    console.error('Test push failed:', error)
    return res.status(500).json({ error: error.message })
  }
}
