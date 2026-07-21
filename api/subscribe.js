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
    const deviceId = subscription.deviceId

    // 1. If a deviceId is provided, delete all other push subscription records for this user
    // on the same device/browser context but with a different endpoint.
    // Also, delete legacy subscriptions for this user that have no deviceId.
    if (deviceId) {
      const deleteSameDevice = supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .neq('endpoint', endpoint)
        .eq('subscription->>deviceId', deviceId)

      const deleteLegacyDevices = supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .neq('endpoint', endpoint)
        .is('subscription->>deviceId', null)

      const [resSame, resLegacy] = await Promise.all([deleteSameDevice, deleteLegacyDevices])

      if (resSame.error) {
        console.error('Supabase error deleting same-device subscriptions:', resSame.error)
      }
      if (resLegacy.error) {
        console.error('Supabase error deleting legacy subscriptions:', resLegacy.error)
      }
    }

    // 2. Preserve server-side delivery history when the app refreshes an
    // existing browser subscription. The client intentionally sends only the
    // Web Push keys and preferences, so it must not reset deduplication state.
    const { data: existing, error: existingError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .maybeSingle()

    if (existingError) {
      console.error('Supabase error reading existing push subscription:', existingError)
      return res.status(500).json({ error: existingError.message })
    }

    const existingState = existing?.subscription?._notification_state
    const subscriptionToStore = existingState && !subscription._notification_state
      ? { ...subscription, _notification_state: existingState }
      : subscription

    // 3. Store or update subscription. We use an upsert matching on user_id and endpoint.
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: endpoint,
        subscription: subscriptionToStore,
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
