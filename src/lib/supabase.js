import { createClient } from '@supabase/supabase-js'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const hasRealUrl = /^https?:\/\//.test(configuredUrl || '')

export const supabase = createClient(
  hasRealUrl ? configuredUrl : 'https://placeholder.supabase.co',
  configuredKey && configuredKey !== 'your_supabase_anon_key' ? configuredKey : 'placeholder-anon-key'
)

export const isSupabaseConfigured = hasRealUrl && configuredKey && configuredKey !== 'your_supabase_anon_key'
