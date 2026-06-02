import { supabase } from './supabase'

export async function logActivity(action, entityType, entityName) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('activity_log').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_name: entityName
    })
  } catch {
    // Activity logging should never block student workflows.
  }
}
