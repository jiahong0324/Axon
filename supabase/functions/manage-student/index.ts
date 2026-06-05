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
    const callerRole = profile?.role || 'student'

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { action, studentId, data } = body

    if (!action) return json({ error: 'Missing action' }, 400)
    if (!['create_student', 'invite_user'].includes(action) && !studentId) return json({ error: 'Missing studentId' }, 400)

    // Verify manager privileges for strict actions
    const strictActions = ['create_student', 'change_password', 'change_email', 'send_reset_email', 'delete_account', 'deactivate', 'reactivate']
    if (strictActions.includes(action) && callerRole !== 'manager') {
      return json({ error: 'Forbidden: managers only' }, 403)
    }

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

      case 'invite_user': {
        const inviteEmail = data?.email
        let inviteRole = data?.role || 'student'
        if (callerRole !== 'manager') {
          inviteRole = 'student' // Only managers can invite other managers
        }
        if (!inviteEmail) return json({ error: 'Email is required' }, 400)

        result = await adminClient.auth.admin.inviteUserByEmail(inviteEmail, { data: { role: inviteRole } })
        
        // Ensure profile is created immediately to avoid login bugs, though auth trigger handles this
        if (!result.error && result.data?.user) {
          await adminClient.from('profiles').upsert({
            id: result.data.user.id,
            email: inviteEmail,
            role: inviteRole,
            full_name: '',
            is_active: true
          }, { onConflict: 'id' })
        }
        break
      }

      case 'send_welcome_email': {
        if (studentId !== caller.id && callerRole !== 'manager') return json({ error: 'Forbidden' }, 403)
        const { data: studentProfile } = await adminClient.from('profiles').select('email, full_name').eq('id', studentId).single()
        if (!studentProfile?.email) return json({ error: 'Student email not found' }, 404)
        
        const brevoKey = Deno.env.get('BREVO_API_KEY')
        if (!brevoKey) {
          console.error('Brevo API key not configured')
          result = { data: { success: false, message: 'Skipped: BREVO_API_KEY not configured' } }
          break
        }
        
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': brevoKey,
          },
          body: JSON.stringify({
            sender: { name: 'Axon', email: Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@axon-app.com' },
            to: [{ email: studentProfile.email, name: studentProfile.full_name || 'Student' }],
            subject: 'Welcome to Axon!',
            htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #1e293b; border-radius: 16px; padding: 40px; text-align: center; border: 1px solid #334155; }
    .logo { width: 64px; height: 64px; margin-bottom: 24px; border-radius: 16px; }
    h1 { color: #ffffff; font-size: 24px; margin-top: 0; margin-bottom: 16px; }
    p { color: #94a3b8; font-size: 16px; line-height: 1.5; margin-bottom: 32px; }
    .btn { display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 12px; font-size: 16px; }
    .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <img src="https://axon-com.vercel.app/icons/logo.png" alt="Axon" class="logo">
      <h1>Welcome to Axon, ${studentProfile.full_name || 'Student'}!</h1>
      <p>We are absolutely thrilled to have you here. Your academic life is about to get a lot more organized and productive.</p>
      <p>Dive right in and start exploring!</p>
      <a href="https://axon-com.vercel.app/login" class="btn">Go to Dashboard</a>
    </div>
    <div class="footer">
      &copy; 2026 Axon. All rights reserved.
    </div>
  </div>
</body>
</html>
            `
          })
        })
        
        if (!res.ok) {
          const errData = await res.json()
          console.error('Brevo API Error:', errData)
          return json({ error: errData.message || 'Failed to send welcome email via Brevo' }, 500)
        }
        result = { data: { success: true } }
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
        result = await adminClient.auth.resetPasswordForEmail(studentProfile.email)
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
