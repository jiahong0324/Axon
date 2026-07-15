import { supabase } from './supabase'

export async function logActivity(action, entityType, entityName, customUserId = null) {
  try {
    let targetUserId = customUserId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      targetUserId = user.id
    }

    await supabase.from('activity_log').insert({
      user_id: targetUserId,
      action,
      entity_type: entityType,
      entity_name: entityName
    })
  } catch {
    // Activity logging should never block student workflows.
  }
}
