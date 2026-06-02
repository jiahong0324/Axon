import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) return json({ error: 'Unauthorized' }, 401)

    const { data: profile } = await callerClient.from('profiles').select('role').eq('id', caller.id).single()
    if (profile?.role !== 'manager') return json({ error: 'Forbidden: managers only' }, 403)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { action, studentId, data } = body

    if (!action) return json({ error: 'Missing action' }, 400)
    if (action !== 'create_student' && !studentId) return json({ error: 'Missing studentId' }, 400)

    let result

    switch (action) {
      case 'create_student': {
        if (!data?.email || !data?.password || !data?.full_name) return json({ error: 'Full name, email, and password are required' }, 400)
        if (data.password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)

        result = await adminClient.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: { full_name: data.full_name }
        })
        if (result.error) break

        await adminClient.from('profiles').upsert({
          id: result.data.user.id,
          full_name: data.full_name,
          email: data.email,
          role: 'student',
          university: data.university || '',
          course: data.course || '',
          student_id: data.student_id || '',
          is_active: true
        }, { onConflict: 'id' })
        break
      }

      case 'change_password':
        if (!data?.password || data.password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)
        result = await adminClient.auth.admin.updateUserById(studentId, { password: data.password })
        break

      case 'change_email':
        if (!data?.email) return json({ error: 'Email is required' }, 400)
        result = await adminClient.auth.admin.updateUserById(studentId, { email: data.email })
        await adminClient.from('profiles').update({ email: data.email }).eq('id', studentId)
        break

      case 'send_reset_email': {
        const { data: studentProfile } = await adminClient.from('profiles').select('email').eq('id', studentId).single()
        if (!studentProfile?.email) return json({ error: 'Student email not found' }, 404)
        result = await adminClient.auth.admin.generateLink({ type: 'recovery', email: studentProfile.email })
        break
      }

      case 'delete_account':
        await Promise.all([
          adminClient.from('classes').delete().eq('user_id', studentId),
          adminClient.from('assignments').delete().eq('user_id', studentId),
          adminClient.from('exams').delete().eq('user_id', studentId),
          adminClient.from('reminders').delete().eq('user_id', studentId),
          adminClient.from('activity_log').delete().eq('user_id', studentId),
          adminClient.from('exam_results').delete().eq('student_id', studentId)
        ])
        await adminClient.from('profiles').delete().eq('id', studentId)
        result = await adminClient.auth.admin.deleteUser(studentId)
        break

      case 'deactivate':
        result = await adminClient.auth.admin.updateUserById(studentId, { ban_duration: '876600h' })
        await adminClient.from('profiles').update({ is_active: false }).eq('id', studentId)
        break

      case 'reactivate':
        result = await adminClient.auth.admin.updateUserById(studentId, { ban_duration: 'none' })
        await adminClient.from('profiles').update({ is_active: true }).eq('id', studentId)
        break

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }

    if (result?.error) return json({ error: result.error.message }, 400)
    return json({ success: true, data: result?.data ?? null })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
