import { createClient } from '@supabase/supabase-js'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const hasRealUrl = /^https?:\/\//.test(configuredUrl || '')

export const supabase = createClient(
  hasRealUrl ? configuredUrl : 'https://placeholder.supabase.co',
  configuredKey && configuredKey !== 'your_supabase_anon_key' ? configuredKey : 'placeholder-anon-key'
)

export const isSupabaseConfigured = hasRealUrl && configuredKey && configuredKey !== 'your_supabase_anon_key'

export async function createProfile(user, role = 'student') {
  if (!user) return

  await supabase.from('profiles').upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name || '',
    email: user.email,
    role
  }, { onConflict: 'id' })
}
