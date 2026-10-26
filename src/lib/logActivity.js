import { supabase } from './supabase'
import { detectClientEnvironment } from './telemetry'

export async function logActivity(action, entityType, entityName, customUserId = null, extraMetadata = {}) {
  try {
    let targetUserId = customUserId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      targetUserId = user.id
    }

    const env = detectClientEnvironment()

    await supabase.from('activity_log').insert({
      user_id: targetUserId,
      action,
      entity_type: entityType,
      entity_name: entityName,
      metadata: {
        device_type: env.deviceType,
        browser: env.browser,
        os: env.os,
        ...extraMetadata
      }
    })
  } catch {
    // Activity logging should never block student workflows.
  }
}
