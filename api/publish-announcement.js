import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wyvwflunwzdbluqrwyuz.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const adminSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Configure Web Push VAPID keys
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:developer@axon-pwa.com', vapidPublicKey, vapidPrivateKey)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' })
    }

    // Verify caller session
    const { data: { user: caller }, error: authErr } = await adminSupabase.auth.getUser(token)
    if (authErr || !caller) {
      return res.status(401).json({ error: 'Unauthorized caller session' })
    }

    // Verify manager role
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()

    if (profile?.role !== 'manager') {
      return res.status(403).json({ error: 'Forbidden: manager privilege required' })
    }

    const {
      title,
      message,
      type = 'info',
      expires_at = null,
      target_type = 'all', // 'all' | 'individual' | 'group'
      target_ids = [],
      target_group = '',
      channels = { in_app: true, push: true, email: false }
    } = req.body || {}

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Announcement title is required' })
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Announcement message is required' })
    }

    // 1. Insert announcement record into Supabase
    const announcementPayload = {
      manager_id: caller.id,
      title: title.trim(),
      message: message.trim(),
      type,
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
      target_type,
      target_ids: target_type === 'individual' ? target_ids : null,
      target_group: target_type === 'group' ? target_group : null,
      channels
    }

    let insertedAnnouncement = null
    const { data: inserted, error: insertError } = await adminSupabase
      .from('announcements')
      .insert(announcementPayload)
      .select()
      .maybeSingle()

    if (insertError) {
      // If table lacks new columns yet, fallback to inserting core columns
      console.warn('Inserting announcement with full schema failed, trying core columns fallback:', insertError.message)
      const fallbackPayload = {
        manager_id: caller.id,
        title: title.trim(),
        message: message.trim(),
        type,
        expires_at: expires_at ? new Date(expires_at).toISOString() : null
      }
      const { data: fallbackInserted, error: fallbackError } = await adminSupabase
        .from('announcements')
        .insert(fallbackPayload)
        .select()
        .maybeSingle()

      if (fallbackError) {
        return res.status(500).json({ error: fallbackError.message })
      }
      insertedAnnouncement = fallbackInserted
    } else {
      insertedAnnouncement = inserted
    }

    let pushStats = { sent: 0, failed: 0, totalSubscriptions: 0 }

    // 2. Dispatch Web Push notifications if channel 'push' is enabled
    if (channels.push && vapidPublicKey && vapidPrivateKey) {
      try {
        let query = adminSupabase.from('push_subscriptions').select('*')
        
        // Filter subscriptions based on audience target
        if (target_type === 'individual' && Array.isArray(target_ids) && target_ids.length > 0) {
          query = query.in('user_id', target_ids)
        } else if (target_type === 'group' && target_group) {
          // Find matching student user IDs by course or university
          const { data: groupProfiles } = await adminSupabase
            .from('profiles')
            .select('id')
            .or(`course.eq.${target_group},university.eq.${target_group}`)
          
          const groupUserIds = (groupProfiles || []).map(p => p.id)
          if (groupUserIds.length > 0) {
            query = query.in('user_id', groupUserIds)
          } else {
            // Group has no students
            query = query.in('user_id', ['00000000-0000-0000-0000-000000000000'])
          }
        }

        const { data: subscriptions, error: subError } = await query
        if (!subError && subscriptions && subscriptions.length > 0) {
          // Deduplicate subscriptions by user_id and deviceId/endpoint
          const deduped = new Map()
          for (const sub of subscriptions) {
            const deviceId = sub.subscription?.deviceId || sub.endpoint || sub.id
            const key = `${sub.user_id}_${deviceId}`
            const existing = deduped.get(key)
            if (!existing || (sub.updated_at || '') > (existing.updated_at || '')) {
              deduped.set(key, sub)
            }
          }
          const uniqueSubs = Array.from(deduped.values())
          pushStats.totalSubscriptions = uniqueSubs.length

          const pushPayload = JSON.stringify({
            id: `announcement_${insertedAnnouncement?.id || Date.now()}`,
            title: `📢 ${title.trim()}`,
            body: message.trim(),
            url: '/home'
          })

          const sendPromises = uniqueSubs.map(async sub => {
            try {
              await webpush.sendNotification(
                sub.subscription,
                pushPayload,
                { TTL: 86400, urgency: 'high' }
              )
              pushStats.sent++
            } catch (err) {
              pushStats.failed++
              if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription has expired / uninstalled
                await adminSupabase.from('push_subscriptions').delete().eq('id', sub.id).catch(() => {})
              }
            }
          })

          await Promise.allSettled(sendPromises)
        }
      } catch (pushErr) {
        console.error('Push dispatch error:', pushErr)
      }
    }

    return res.status(200).json({
      success: true,
      announcement: insertedAnnouncement,
      pushStats
    })
  } catch (error) {
    console.error('Publish announcement error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
