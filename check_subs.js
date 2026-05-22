import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wyvwflunwzdbluqrwyuz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dndmbHVud3pkYmx1cXJ3eXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTIyNjYsImV4cCI6MjA5NDg4ODI2Nn0.veVnNd6P5S0Rnk1brPuGYlQ-sNL3LCBCxTMzdJEhkRM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('push_subscriptions').select('*')
  console.log('Error:', error)
  console.log('Subscriptions:', data?.length)
  if (data) {
    console.log(JSON.stringify(data, null, 2))
  }
}
check()
