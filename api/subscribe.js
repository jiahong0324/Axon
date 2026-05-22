import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { subscription, userId } = req.body || {}
  if (!subscription || !userId) {
    return res.status(400).json({ error: 'Missing subscription or userId' })
  }

  try {
    const endpoint = subscription.endpoint
    // Store or update subscription. We use an upsert matching on user_id and endpoint.
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: endpoint,
        subscription: subscription,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,endpoint' })

    if (error) {
      console.error('Supabase error saving subscription:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error handling subscription:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
