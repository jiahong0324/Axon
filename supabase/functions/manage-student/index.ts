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

function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false
  const trimmed = email.trim()
  if (!trimmed || trimmed.length > 254) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) return false
  if (trimmed.toLowerCase().endsWith('.local')) return false
  return true
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { action, studentId, data, userToken } = body

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const jwt = userToken || authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(jwt)
    if (callerError || !caller) return json({ error: 'Unauthorized' }, 401)

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', caller.id).single()
    const callerRole = profile?.role || 'student'

    if (!action) return json({ error: 'Missing action' }, 400)
    if (!['create_student', 'invite_user', 'send_promotional_email', 'cleanup_activity'].includes(action) && !studentId) return json({ error: 'Missing studentId' }, 400)

    // Verify manager privileges for strict actions
    const strictActions = ['create_student', 'get_student_detail', 'change_password', 'change_email', 'send_reset_email', 'delete_account', 'deactivate', 'reactivate', 'send_promotional_email', 'cleanup_activity']
    if (strictActions.includes(action) && callerRole !== 'manager') {
      return json({ error: 'Forbidden: managers only' }, 403)
    }

    let result

    switch (action) {
      case 'get_student_detail': {
        const { data: targetUser, error: uErr } = await adminClient.auth.admin.getUserById(studentId)
        if (uErr) return json({ error: uErr.message }, 404)

        const meta = targetUser?.user?.user_metadata || {}

        const { data: chats } = await adminClient
          .from('student_ai_chats')
          .select('*')
          .eq('user_id', studentId)
          .eq('is_manager', false)
          .order('created_at', { ascending: false })

        const { data: classes } = await adminClient
          .from('classes')
          .select('*')
          .eq('user_id', studentId)

        const { data: exams } = await adminClient
          .from('exams')
          .select('*')
          .eq('user_id', studentId)

        const { data: examResults } = await adminClient
          .from('exam_results')
          .select('*')
          .eq('student_id', studentId)

        const { data: reminders } = await adminClient
          .from('reminders')
          .select('*')
          .eq('user_id', studentId)
          .order('reminder_time', { ascending: true })

        const rawPrefs = meta.preferences || {}
        const accountInfo = {
          id: targetUser?.user?.id || studentId,
          email: targetUser?.user?.email || '',
          email_confirmed_at: targetUser?.user?.email_confirmed_at || targetUser?.user?.confirmed_at || null,
          last_sign_in_at: targetUser?.user?.last_sign_in_at || null,
          created_at: targetUser?.user?.created_at || null,
          updated_at: targetUser?.user?.updated_at || null,
          phone: targetUser?.user?.phone || null,
          app_metadata: targetUser?.user?.app_metadata || {}
        }

        const finalChats = [...(chats || [])]
        const metaChats = Array.isArray(meta.axon_ai_chats) ? meta.axon_ai_chats : []
        for (let i = 0; i < metaChats.length; i++) {
          const mc = metaChats[i]
          const mcContent = (mc.content || '').trim()
          const mcRole = mc.role || 'user'
          const exists = finalChats.some((fc: any) =>
            fc.role === mcRole &&
            ((fc.content || '').trim() === mcContent || (mc.image && fc.image === mc.image))
          )
          if (!exists) {
            finalChats.push({
              id: `meta-chat-${i}-${Date.now()}`,
              user_id: studentId,
              role: mcRole,
              content: mc.content || '',
              image: mc.image || null,
              created_at: mc.created_at || new Date().toISOString()
            })
          }
        }
        finalChats.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

        // Fetch nutrition goals & logs
        let dbNutritionGoals = null
        let dbNutritionLogs: any[] = []
        try {
          const [goalsRes, logsRes] = await Promise.all([
            adminClient.from('nutrition_goals').select('*').eq('user_id', studentId).maybeSingle(),
            adminClient.from('nutrition_logs').select('*').eq('user_id', studentId).order('created_at', { ascending: false })
          ])
          dbNutritionGoals = goalsRes?.data || null
          dbNutritionLogs = logsRes?.data || []
        } catch (e) {
          console.warn('manage-student edge nutrition fetch fallback:', e)
        }

        const resolvedNutritionGoals = dbNutritionGoals
          ? {
              calories: Number(dbNutritionGoals.calories) || 2000,
              protein: Number(dbNutritionGoals.protein) || 120,
              carbs: Number(dbNutritionGoals.carbs) || 250,
              fats: Number(dbNutritionGoals.fats) || 65
            }
          : (meta.axon_nutrition_goals || null)

        const resolvedNutritionLogs = (dbNutritionLogs && dbNutritionLogs.length > 0)
          ? dbNutritionLogs.map((row: any) => ({
              id: row.id,
              user_id: row.user_id,
              date: row.log_date,
              meal_type: row.meal_type || 'Lunch',
              meal_time: row.meal_time || '',
              name: row.name,
              calories: Number(row.calories) || 0,
              protein: Number(row.protein) || 0,
              carbs: Number(row.carbs) || 0,
              fats: Number(row.fats) || 0,
              notes: row.notes || '',
              image_url: row.image_url || '',
              created_at: row.created_at
            }))
          : (meta.axon_nutrition_logs || [])

        result = {
          data: {
            metadata: meta,
            accountInfo,
            preferences: rawPrefs,
            linkedTimetables: meta.linked_timetables || [],
            examResultsSemesters: meta.axon_exam_results_semesters || [],
            semesterSettings: {
              name: meta.semester_name || rawPrefs.axon_semester_name || '',
              startDate: meta.semester_start_date || rawPrefs.axon_semester_start_date || '',
              endDate: meta.semester_end_date || rawPrefs.axon_semester_end_date || ''
            },
            chats: finalChats,
            classes: classes || [],
            exams: exams || [],
            examResults: examResults || [],
            reminders: reminders || [],
            nutritionGoals: resolvedNutritionGoals,
            nutritionLogs: resolvedNutritionLogs
          }
        }
        break
      }

      case 'cleanup_activity': {
        try {
          await adminClient
            .from('activity_log')
            .delete()
            .in('entity_type', ['axon_linked_timetables', 'axon_exam_results_semesters'])

          await adminClient
            .from('activity_log')
            .delete()
            .like('action', 'SYNC_%')

          await adminClient
            .from('activity_log')
            .delete()
            .like('entity_name', '[{%')
        } catch (e) {
          console.warn('cleanup_activity error:', e)
        }
        result = { data: { success: true } }
        break
      }

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
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root { color-scheme: light only; supported-color-schemes: light; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a !important; background-image: linear-gradient(#0f172a, #0f172a) !important; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0f172a !important; background-image: linear-gradient(#0f172a, #0f172a) !important; }
    .card { background-color: #1e293b !important; background-image: linear-gradient(#1e293b, #1e293b) !important; border-radius: 16px; padding: 40px; text-align: center; border: 1px solid #334155 !important; }
    .logo { width: 64px; height: 64px; margin-bottom: 24px; border-radius: 16px; display: inline-block; }
    h1 { color: #ffffff !important; font-size: 24px; margin-top: 0; margin-bottom: 16px; }
    p { color: #94a3b8 !important; font-size: 16px; line-height: 1.5; margin-bottom: 32px; }
    .btn { display: inline-block; background-color: #3b82f6 !important; background-image: linear-gradient(#3b82f6, #3b82f6) !important; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 12px; font-size: 16px; }
    .footer { text-align: center; margin-top: 32px; color: #64748b !important; font-size: 14px; }
    @media (prefers-color-scheme: dark) {
      body, .container { background-color: #0f172a !important; background-image: linear-gradient(#0f172a, #0f172a) !important; }
      .card { background-color: #1e293b !important; background-image: linear-gradient(#1e293b, #1e293b) !important; border: 1px solid #334155 !important; }
      h1 { color: #ffffff !important; }
      p { color: #94a3b8 !important; }
      .footer { color: #64748b !important; }
    }
    [data-ogsc] body, [data-ogsb] body, [data-ogsc] .container, [data-ogsb] .container { background-color: #0f172a !important; background-image: linear-gradient(#0f172a, #0f172a) !important; }
    [data-ogsc] .card, [data-ogsb] .card { background-color: #1e293b !important; background-image: linear-gradient(#1e293b, #1e293b) !important; border: 1px solid #334155 !important; }
    [data-ogsc] h1 { color: #ffffff !important; }
    [data-ogsc] p { color: #94a3b8 !important; }
    [data-ogsc] .footer { color: #64748b !important; }
  </style>
</head>
<body style="background-color: #0f172a !important; background-image: linear-gradient(#0f172a, #0f172a) !important; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div class="container" style="max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0f172a !important; background-image: linear-gradient(#0f172a, #0f172a) !important;">
    <div class="card" style="background-color: #1e293b !important; background-image: linear-gradient(#1e293b, #1e293b) !important; border-radius: 16px; padding: 40px; text-align: center; border: 1px solid #334155 !important;">
      <img src="https://axon-com.vercel.app/icons/logo.png" alt="Axon" class="logo" style="width: 64px; height: 64px; margin-bottom: 24px; border-radius: 16px; display: inline-block;">
      <h1 data-ogsc="color: #ffffff;" style="color: #ffffff !important; font-size: 24px; margin-top: 0; margin-bottom: 16px;">Welcome to Axon, ${studentProfile.full_name || 'Student'}!</h1>
      <p data-ogsc="color: #94a3b8;" style="color: #94a3b8 !important; font-size: 16px; line-height: 1.5; margin-bottom: 32px;">We are absolutely thrilled to have you here. Your academic life is about to get a lot more organized and productive.</p>
      <p data-ogsc="color: #94a3b8;" style="color: #94a3b8 !important; font-size: 16px; line-height: 1.5; margin-bottom: 32px;">Dive right in and start exploring!</p>
      <a href="https://axon-com.vercel.app/login" class="btn" style="display: inline-block; background-color: #3b82f6 !important; background-image: linear-gradient(#3b82f6, #3b82f6) !important; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 12px; font-size: 16px;"><span data-ogsc="color: #ffffff;" style="color: #ffffff !important;">Go to Dashboard</span></a>
    </div>
    <div class="footer" data-ogsc="color: #64748b;" style="text-align: center; margin-top: 32px; color: #64748b !important; font-size: 14px;">
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

      case 'send_login_email': {
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
            subject: 'New Login Alert - Axon',
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
    .btn { display: inline-block; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 12px; font-size: 16px; }
    .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <img src="https://axon-com.vercel.app/icons/logo.png" alt="Axon" class="logo">
      <h1>New Login Alert</h1>
      <p>Hi ${studentProfile.full_name || 'Student'},</p>
      <p>We detected a new login to your Axon account. If this was you, no further action is needed.</p>
      <p>If you did not authorize this login, please reset your password immediately or contact your administrator.</p>
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
          return json({ error: errData.message || 'Failed to send login email via Brevo' }, 500)
        }
        result = { data: { success: true } }
        break
      }

      case 'send_promotional_email': {
        const brevoKey = Deno.env.get('BREVO_API_KEY')
        if (!brevoKey) return json({ error: 'BREVO_API_KEY not configured' }, 500)

        const { subject, htmlContent, message, audience, emails } = data || {}
        if (!subject || !subject.trim()) return json({ error: 'Subject is required' }, 400)

        const recipientMap = new Map<string, { email: string; name?: string }>()

        if (audience === 'all') {
          const { data: students, error: fetchError } = await adminClient
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('is_active', true)
          
          if (fetchError || !students) return json({ error: 'Failed to fetch students from database' }, 500)

          // Backfill emails from auth.users for any profiles where email column in profiles is missing
          const authUserMap = new Map<string, string>()
          try {
            const { data: authData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
            if (authData?.users) {
              for (const u of authData.users) {
                if (u.id && u.email && !u.is_anonymous) {
                  authUserMap.set(u.id, u.email.trim())
                }
              }
            }
          } catch (authErr) {
            console.warn('Could not list auth users for email backfill:', authErr)
          }

          for (const s of students) {
            let email = (s.email || '').trim()
            if (!email && s.id && authUserMap.has(s.id)) {
              email = authUserMap.get(s.id)!
            }

            if (isValidEmail(email)) {
              const lower = email.toLowerCase()
              if (!recipientMap.has(lower)) {
                const name = (s.full_name || '').trim()
                recipientMap.set(lower, {
                  email: lower,
                  ...(name ? { name } : {})
                })
              }
            }
          }
        } else if (Array.isArray(emails) && emails.length > 0) {
          for (const item of emails) {
            const rawEmail = typeof item === 'string' ? item : item?.email
            const rawName = typeof item === 'object' && item?.name ? item.name : undefined
            if (isValidEmail(rawEmail)) {
              const lower = rawEmail.trim().toLowerCase()
              if (!recipientMap.has(lower)) {
                const name = (rawName || '').trim()
                recipientMap.set(lower, {
                  email: lower,
                  ...(name ? { name } : {})
                })
              }
            }
          }
        } else {
          return json({ error: 'No recipients specified. Provide audience="all" or an emails array.' }, 400)
        }

        const targetEmails = Array.from(recipientMap.values())

        if (targetEmails.length === 0) {
          return json({ error: 'No active recipients with valid email addresses found' }, 400)
        }

        const safeSubject = escapeHtml(subject.trim())
        const formattedMessage = escapeHtml(message || 'We have an update for you!').replace(/\n/g, '<br/>')

        const finalHtmlContent = htmlContent || `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a !important;
      background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #0f172a !important;
      background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;
    }
    .card {
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
      border-radius: 16px !important;
      padding: 40px;
      text-align: center;
      border: 1px solid #334155 !important;
    }
    .logo {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
      border-radius: 16px;
      display: inline-block;
    }
    h1 {
      color: #ffffff !important;
      font-size: 24px;
      line-height: 1.3;
      margin-top: 0;
      margin-bottom: 20px;
      font-weight: 700;
      text-align: center;
    }
    .content {
      color: #94a3b8 !important;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
      text-align: left;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #64748b !important;
      font-size: 14px;
    }

    @media (prefers-color-scheme: dark) {
      body, .container {
        background-color: #0f172a !important;
        background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;
      }
      .card {
        background-color: #1e293b !important;
        background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
        border: 1px solid #334155 !important;
        border-radius: 16px !important;
      }
      h1 {
        color: #ffffff !important;
      }
      .content, .content * {
        color: #94a3b8 !important;
      }
      .footer {
        color: #64748b !important;
      }
    }

    [data-ogsc] body, [data-ogsb] body, [data-ogsc] .container, [data-ogsb] .container {
      background-color: #0f172a !important;
      background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;
    }
    [data-ogsc] .card, [data-ogsb] .card {
      background-color: #1e293b !important;
      background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important;
      border: 1px solid #334155 !important;
      border-radius: 16px !important;
    }
    [data-ogsc] h1 {
      color: #ffffff !important;
    }
    [data-ogsc] .content, [data-ogsc] .content * {
      color: #94a3b8 !important;
    }
    [data-ogsc] .footer {
      color: #64748b !important;
    }
  </style>
</head>
<body style="background-color: #0f172a !important; background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important; margin: 0 !important; padding: 0 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div class="container" style="max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0f172a !important; background-image: linear-gradient(to bottom, #0f172a 0%, #0f172a 100%) !important;">
    <div class="card" style="background-color: #1e293b !important; background-image: linear-gradient(to bottom, #1e293b 0%, #1e293b 100%) !important; border-radius: 16px !important; border: 1px solid #334155 !important; padding: 40px; text-align: center;">
      <img src="https://axon-com.vercel.app/icons/logo.png" alt="Axon" class="logo" style="width: 64px; height: 64px; margin-bottom: 24px; border-radius: 16px; display: inline-block;">
      <h1 data-ogsc="color: #ffffff;" style="color: #ffffff !important; font-size: 24px; line-height: 1.3; margin-top: 0; margin-bottom: 20px; font-weight: 700; text-align: center;">${safeSubject}</h1>
      <div class="content" data-ogsc="color: #94a3b8;" style="color: #94a3b8 !important; font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: left;">
        ${formattedMessage}
      </div>
    </div>
    <div class="footer" data-ogsc="color: #64748b;" style="text-align: center; margin-top: 32px; color: #64748b !important; font-size: 14px;">
      &copy; 2026 Axon. All rights reserved.
    </div>
  </div>
</body>
</html>`

        // Split into chunks of 500 versions if necessary (Brevo limits 1000 max message versions)
        const chunkSize = 500
        const chunks = []
        for (let i = 0; i < targetEmails.length; i += chunkSize) {
          chunks.push(targetEmails.slice(i, i + chunkSize))
        }

        let totalSuccess = 0
        for (const chunk of chunks) {
          const messageVersions = chunk.map(recipient => {
            const toObj: { email: string; name?: string } = { email: recipient.email }
            if (recipient.name && recipient.name.trim()) {
              toObj.name = recipient.name.trim()
            }
            return {
              to: [toObj]
            }
          })

          const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': brevoKey,
            },
            body: JSON.stringify({
              sender: { name: 'Axon', email: Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@axon-app.com' },
              subject: subject.trim(),
              htmlContent: finalHtmlContent,
              textContent: (message || subject || '').trim(),
              messageVersions: messageVersions
            })
          })
          
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            console.error('Brevo API Error:', errData)
            return json({ error: errData.message || 'Failed to send promotional email via Brevo' }, 500)
          }
          totalSuccess += chunk.length
        }
        
        result = { data: { success: true, count: totalSuccess } }
        break
      }

      case 'send_academic_digest': {
        if (studentId !== caller.id && callerRole !== 'manager') return json({ error: 'Forbidden' }, 403)
        const { data: studentProfile } = await adminClient.from('profiles').select('email, full_name, university, course').eq('id', studentId).single()
        if (!studentProfile?.email) return json({ error: 'Student email not found' }, 404)
        
        const brevoKey = Deno.env.get('BREVO_API_KEY')
        if (!brevoKey) {
          console.error('Brevo API key not configured')
          return json({ error: 'Brevo API key not configured on server' }, 500)
        }

        const includeClasses = data?.classes ?? true
        const includeAssignments = data?.assignments ?? true
        const includeExams = data?.exams ?? true
        const includeResults = data?.results ?? true
        const includeExercise = data?.exercise ?? true
        const includeNutrition = data?.nutrition ?? true

        let classesData: any[] = []
        let assignmentsData: any[] = []
        let examsData: any[] = []
        let semestersData: any[] = []
        let exerciseData: any[] = []
        let nutritionData: any = null

        if (includeClasses) {
          const { data: classes } = await adminClient.from('classes').select('*').eq('user_id', studentId)
          classesData = classes || []
        }

        if (includeAssignments) {
          const { data: assignments } = await adminClient.from('assignments').select('*').eq('user_id', studentId).order('deadline')
          assignmentsData = assignments || []
        }

        if (includeExams) {
          const { data: exams } = await adminClient.from('exams').select('*').eq('user_id', studentId).order('exam_date')
          examsData = exams || []
        }

        if (includeResults) {
          const { data: sems } = await adminClient.from('student_semesters').select('*').eq('user_id', studentId).order('created_at')
          const { data: courses } = await adminClient.from('student_semester_courses').select('*').eq('user_id', studentId).order('created_at')
          semestersData = (sems || []).map(s => ({
            ...s,
            courses: (courses || []).filter(c => c.semester_id === s.id)
          }))
        }

        if (includeExercise) {
          const { data: exercises } = await adminClient.from('exercise_logs').select('*').eq('user_id', studentId).order('log_date', { ascending: false }).limit(30)
          exerciseData = exercises || []
        }

        if (includeNutrition) {
          const [goalsRes, logsRes] = await Promise.all([
            adminClient.from('nutrition_goals').select('*').eq('user_id', studentId).maybeSingle(),
            adminClient.from('nutrition_logs').select('*').eq('user_id', studentId).order('log_date', { ascending: false }).limit(30)
          ])
          nutritionData = {
            goals: goalsRes?.data || null,
            logs: logsRes?.data || []
          }
        }

        const htmlContent = buildAcademicDigestHtml({
          fullName: studentProfile.full_name || 'Student',
          email: studentProfile.email,
          university: studentProfile.university,
          course: studentProfile.course,
          includeClasses,
          classes: classesData,
          includeAssignments,
          assignments: assignmentsData,
          includeExams,
          exams: examsData,
          includeResults,
          semesters: semestersData,
          includeExercise,
          exercises: exerciseData,
          includeNutrition,
          nutrition: nutritionData
        })

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': brevoKey,
          },
          body: JSON.stringify({
            sender: { name: 'Axon', email: Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@axon-app.com' },
            to: [{ email: studentProfile.email, name: studentProfile.full_name || 'Student' }],
            subject: 'Your Axon Academic Digest',
            htmlContent: htmlContent
          })
        })
        
        if (!res.ok) {
          const errData = await res.json()
          console.error('Brevo API Error:', errData)
          return json({ error: errData.message || 'Failed to send academic digest email via Brevo' }, 500)
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

function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const [hoursStr, minutesStr] = timeStr.split(':')
  const hours = parseInt(hoursStr, 10)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHours}:${minutesStr} ${ampm}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

interface AcademicDigestParams {
  fullName: string
  email: string
  university?: string
  course?: string
  includeClasses: boolean
  classes: any[]
  includeAssignments: boolean
  assignments: any[]
  includeExams: boolean
  exams: any[]
  includeResults?: boolean
  semesters?: any[]
  includeExercise?: boolean
  exercises?: any[]
  includeNutrition?: boolean
  nutrition?: any
}

function buildAcademicDigestHtml(params: AcademicDigestParams): string {
  const { fullName, university, course, includeClasses, classes, includeAssignments, assignments, includeExams, exams, includeResults, semesters = [], includeExercise, exercises = [], includeNutrition, nutrition } = params
  const dateStr = new Date().toLocaleDateString('en-US', { dateStyle: 'long' })
  
  let classesHtml = ''
  if (includeClasses) {
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const groupedClasses: Record<string, any[]> = {}
    daysOrder.forEach(day => { groupedClasses[day] = [] })
    
    classes.forEach(c => {
      if (groupedClasses[c.day]) {
        groupedClasses[c.day].push(c)
      } else {
        groupedClasses[c.day] = [c]
      }
    })

    daysOrder.forEach(day => {
      groupedClasses[day].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
    })

    let hasAnyClasses = false
    let daysHtml = ''

    daysOrder.forEach(day => {
      const dayClasses = groupedClasses[day]
      if (dayClasses.length > 0) {
        hasAnyClasses = true
        let dayTileHtml = ''
        
        dayClasses.forEach(c => {
          const badgeColor = c.class_type === 'T' ? '#10b981' : c.class_type === 'P' ? '#8b5cf6' : '#3b82f6'
          const badgeText = c.class_type === 'L' ? 'Lecture' : c.class_type === 'T' ? 'Tutorial' : c.class_type === 'P' ? 'Practical' : c.class_type || 'Class'
          
          dayTileHtml += `
            <div style="margin-bottom: 12px; padding: 12px; border-left: 4px solid ${badgeColor}; background: #1e293b; border-radius: 8px; border-top: 1px solid #334155; border-right: 1px solid #334155; border-bottom: 1px solid #334155;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 14px; font-weight: bold; color: #ffffff;">${c.subject}</span>
                <span style="font-size: 10px; background: rgba(59, 130, 246, 0.1); color: ${badgeColor}; padding: 2px 8px; border-radius: 9999px; border: 1px solid rgba(59, 130, 246, 0.2); font-weight: bold;">${badgeText}</span>
              </div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                ⏱️ ${formatTime(c.start_time)} - ${formatTime(c.end_time)}
              </div>
              ${c.classroom ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">📍 Room: ${c.classroom}</div>` : ''}
              ${c.lecturer ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">👤 Instructor: ${c.lecturer}</div>` : ''}
            </div>
          `
        })

        daysHtml += `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #3b82f6; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 10px; font-size: 16px;">${day}</h3>
            ${dayTileHtml}
          </div>
        `
      }
    })

    if (!hasAnyClasses) {
      classesHtml = `
        <div style="text-align: center; padding: 24px; color: #94a3b8; background: #1e293b; border-radius: 12px; border: 1px solid #334155; margin-bottom: 24px;">
          📅 No classes in your weekly timetable.
        </div>
      `
    } else {
      classesHtml = `
        <div style="background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 16px;">📅 Weekly Timetable</h2>
          ${daysHtml}
        </div>
      `
    }
  }

  let assignmentsHtml = ''
  if (includeAssignments) {
    const pendingAssignments = assignments.filter(a => a.status !== 'Done')
    
    if (pendingAssignments.length === 0) {
      assignmentsHtml = `
        <div style="background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 16px;">📋 Pending Assignments</h2>
          <div style="text-align: center; padding: 24px; color: #10b981; background: rgba(16, 185, 129, 0.05); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">
            ✅ All caught up! No pending assignments.
          </div>
        </div>
      `
    } else {
      let itemsHtml = ''
      pendingAssignments.forEach(a => {
        const priorityColor = a.priority === 'High' ? '#ef4444' : a.priority === 'Medium' ? '#f59e0b' : '#3b82f6'
        itemsHtml += `
          <div style="padding: 12px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: bold; color: #ffffff; font-size: 14px;">${a.title}</span>
              <span style="font-size: 10px; background: rgba(239, 68, 68, 0.1); color: ${priorityColor}; padding: 2px 8px; border-radius: 9999px; border: 1px solid ${priorityColor}33; font-weight: bold;">${a.priority} Priority</span>
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Subject: ${a.subject}</div>
            <div style="font-size: 12px; color: #ef4444; font-weight: bold; margin-top: 4px;">📅 Due Date: ${formatDate(a.deadline)}</div>
            ${a.notes ? `<div style="font-size: 12px; color: #64748b; margin-top: 6px; font-style: italic; border-top: 1px dashed #334155; padding-top: 6px;">Note: ${a.notes}</div>` : ''}
          </div>
        `
      })

      assignmentsHtml = `
        <div style="background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 16px;">📋 Pending Assignments</h2>
          ${itemsHtml}
        </div>
      `
    }
  }

  let examsHtml = ''
  if (includeExams) {
    const todayStr = new Date().toISOString().split('T')[0]
    const upcomingExams = exams.filter(e => e.exam_date >= todayStr)
    
    if (upcomingExams.length === 0) {
      examsHtml = `
        <div style="background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 16px;">📖 Upcoming Exams</h2>
          <div style="text-align: center; padding: 24px; color: #94a3b8; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
            📖 No upcoming exams scheduled.
          </div>
        </div>
      `
    } else {
      let itemsHtml = ''
      upcomingExams.forEach(e => {
        itemsHtml += `
          <div style="padding: 12px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: bold; color: #ffffff; font-size: 14px;">${e.subject}</span>
              <span style="font-size: 10px; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; padding: 2px 8px; border-radius: 9999px; border: 1px solid rgba(139, 92, 246, 0.2); font-weight: bold;">${e.exam_type}</span>
            </div>
            <div style="font-size: 12px; color: #ef4444; font-weight: bold; margin-top: 4px;">📅 Exam Date: ${formatDate(e.exam_date)}</div>
            ${e.start_time ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">⏱️ Time: ${formatTime(e.start_time)} ${e.end_time ? `- ${formatTime(e.end_time)}` : ''}</div>` : ''}
            ${e.venue ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">📍 Venue: ${e.venue}</div>` : ''}
            ${e.notes ? `<div style="font-size: 12px; color: #64748b; margin-top: 6px; font-style: italic; border-top: 1px dashed #334155; padding-top: 6px;">Note: ${e.notes}</div>` : ''}
          </div>
        `
      })

      examsHtml = `
        <div style="background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 16px;">📖 Upcoming Exams</h2>
          ${itemsHtml}
        </div>
      `
    }
  }

  let resultsHtml = ''
  if (includeResults && semesters.length > 0) {
    let semRows = ''
    semesters.forEach(sem => {
      let coursesList = ''
      ;(sem.courses || []).forEach((c: any) => {
        coursesList += `
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #334155; font-size: 12px;">
            <span style="color: #e2e8f0;">${c.course_code ? c.course_code + ' - ' : ''}${c.course_name}</span>
            <span style="color: #38bdf8; font-weight: bold;">Grade: ${c.grade} (${c.credit_hours} cr)</span>
          </div>
        `
      })
      semRows += `
        <div style="margin-bottom: 14px; padding: 12px; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
          <div style="font-weight: bold; color: #ffffff; font-size: 14px; margin-bottom: 8px;">🎓 ${sem.name}</div>
          ${coursesList || '<div style="font-size: 11px; color: #64748b;">No courses listed</div>'}
        </div>
      `
    })
    resultsHtml = `
      <div style="background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 16px;">🏆 Academic Results & Semester Records</h2>
        ${semRows}
      </div>
    `
  }

  let exercisesHtml = ''
  if (includeExercise && exercises.length > 0) {
    let itemsHtml = ''
    exercises.forEach(l => {
      itemsHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; margin-bottom: 8px;">
          <div>
            <span style="font-weight: bold; color: #ffffff; font-size: 14px;">${l.activity_type || 'Gym'}</span>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">📅 Date: ${formatDate(l.log_date)}</div>
          </div>
          <span style="font-size: 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(16, 185, 129, 0.2); font-weight: bold;">+${l.xp_earned || 20} XP</span>
        </div>
      `
    })
    exercisesHtml = `
      <div style="background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 16px;">🏋️ Workout & Habit Logs</h2>
        ${itemsHtml}
      </div>
    `
  } else if (includeExercise) {
    exercisesHtml = `
      <div style="background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 16px;">🏋️ Workout & Habit Logs</h2>
        <div style="text-align: center; padding: 24px; color: #94a3b8; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
          🏋️ No recent workout check-ins logged.
        </div>
      </div>
    `
  }

  let nutritionHtml = ''
  if (includeNutrition && nutrition) {
    const goals = nutrition.goals || { calories: 2000, protein: 120, carbs: 250, fats: 65 }
    const logs = nutrition.logs || []
    let mealItemsHtml = ''
    logs.slice(0, 15).forEach((l: any) => {
      mealItemsHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; margin-bottom: 8px;">
          <div>
            <span style="font-weight: bold; color: #ffffff; font-size: 14px;">${l.name || 'Meal'}</span>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">🍽️ ${l.meal_type || 'Lunch'} · 📅 ${formatDate(l.log_date || l.date)}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">P: ${l.protein || 0}g · C: ${l.carbs || 0}g · F: ${l.fats || 0}g</div>
          </div>
          <span style="font-size: 12px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(245, 158, 11, 0.2); font-weight: bold;">${l.calories || 0} kcal</span>
        </div>
      `
    })

    nutritionHtml = `
      <div style="background: #111827; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 6px;">🍽️ Diet & Nutrition Intake</h2>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 14px;">Daily Targets: <strong>${goals.calories} kcal</strong> · P: <strong>${goals.protein}g</strong> · C: <strong>${goals.carbs}g</strong> · F: <strong>${goals.fats}g</strong></div>
        ${mealItemsHtml || '<div style="text-align: center; padding: 20px; color: #94a3b8; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">No recent meal intake logged.</div>'}
      </div>
    `
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; }
    .logo { width: 56px; height: 56px; margin-bottom: 20px; border-radius: 12px; }
    h1 { color: #ffffff; font-size: 24px; margin-top: 0; margin-bottom: 8px; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 12px; }
    .profile-card { background: #111827; border: 1px solid #334155; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://axon-com.vercel.app/icons/logo.png" alt="Axon" class="logo">
        <h1>Academic Planner Digest</h1>
        <div class="subtitle">Weekly planner summary compiled on ${dateStr}</div>
      </div>
      
      <div class="profile-card">
        <div style="font-weight: bold; color: #ffffff; font-size: 15px; margin-bottom: 4px;">👤 ${fullName}</div>
        ${university ? `<div style="font-size: 12px; color: #94a3b8;">🏫 ${university}</div>` : ''}
        ${course ? `<div style="font-size: 12px; color: #94a3b8;">📚 ${course}</div>` : ''}
      </div>

      ${classesHtml}
      ${assignmentsHtml}
      ${examsHtml}
      ${resultsHtml}
      ${exercisesHtml}
      ${nutritionHtml}
      
      <div style="text-align: center; margin-top: 32px; border-top: 1px solid #334155; padding-top: 20px;">
        <a href="https://axon-com.vercel.app/login" style="display: inline-block; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 10px; font-size: 14px;">Open Axon App</a>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 Axon. All rights reserved. <br>
      You received this because you requested a copy of your academic planner from your account settings.
    </div>
  </div>
</body>
</html>
  `
}

