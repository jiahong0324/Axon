import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wyvwflunwzdbluqrwyuz.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dndmbHVud3pkYmx1cXJ3eXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTIyNjYsImV4cCI6MjA5NDg4ODI2Nn0.veVnNd6P5S0Rnk1brPuGYlQ-sNL3LCBCxTMzdJEhkRM'

const supabase = createClient(supabaseUrl, supabaseKey)

// Configure VAPID keys
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('Error: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in your environment.')
  console.error('Please run `npx vercel env pull .env.local` to get your production keys, then run `node --env-file=.env.local send-announcement.js`.')
  process.exit(1)
}

webpush.setVapidDetails(
  'mailto:developer@axon-pwa.com',
  vapidPublicKey,
  vapidPrivateKey
)

async function sendAnnouncement() {
  console.log('Fetching push subscriptions...')
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (error) {
    console.error('Error fetching subscriptions:', error)
    return
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No subscriptions found.')
    return
  }

  console.log(`Found ${subscriptions.length} subscriptions. Sending notifications...`)

  const payload = JSON.stringify({
    title: 'Install Axon as an App',
    body: 'Add to home screen and use it as an APP for the best experience!',
    url: '/'
  })

  let successCount = 0
  let failureCount = 0

  const pushPromises = subscriptions.map(sub => {
    return webpush.sendNotification(sub.subscription, payload)
      .then(() => {
        successCount++
      })
      .catch(async (err) => {
        failureCount++
        console.error(`Failed to send push to subscription ${sub.id}:`, err.statusCode)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          console.log(`Cleaned up expired subscription: ${sub.id}`)
        }
      })
  })

  await Promise.all(pushPromises)
  console.log(`\nAnnouncement Sent!`)
  console.log(`Success: ${successCount}`)
  console.log(`Failures: ${failureCount}`)
}

sendAnnouncement()
