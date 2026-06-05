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
    if (!['create_student', 'invite_user', 'send_promotional_email'].includes(action) && !studentId) return json({ error: 'Missing studentId' }, 400)

    // Verify manager privileges for strict actions
    const strictActions = ['create_student', 'change_password', 'change_email', 'send_reset_email', 'delete_account', 'deactivate', 'reactivate', 'send_promotional_email']
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
    .btn { display: inline-block; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 12px; font-size: 16px; }
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
      <a href="https://axon-com.vercel.app/login" class="btn" style="color: #ffffff !important; text-decoration: none;"><span style="color: #ffffff !important;">Go to Dashboard</span></a>
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
        if (!subject) return json({ error: 'Subject is required' }, 400)

        let targetEmails: { email: string, name?: string }[] = []

        if (audience === 'all') {
          const { data: students, error: fetchError } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('is_active', true)
          
          if (fetchError || !students) return json({ error: 'Failed to fetch students' }, 500)
          targetEmails = students.map(s => ({ email: s.email, name: s.full_name || 'Student' }))
        } else if (Array.isArray(emails) && emails.length > 0) {
          targetEmails = emails.map(e => ({ email: e }))
        } else {
          return json({ error: 'No recipients specified. Provide audience="all" or an emails array.' }, 400)
        }

        if (targetEmails.length === 0) return json({ error: 'No active recipients found' }, 404)

        const finalHtmlContent = htmlContent || `
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
    p { color: #94a3b8; font-size: 16px; line-height: 1.5; margin-bottom: 32px; white-space: pre-line; }
    .footer { text-align: center; margin-top: 32px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <img src="https://axon-com.vercel.app/icons/logo.png" alt="Axon" class="logo">
      <h1>${subject}</h1>
      <p>${message || 'We have an update for you!'}</p>
    </div>
    <div class="footer">
      &copy; 2026 Axon. All rights reserved.
    </div>
  </div>
</body>
</html>
        `

        // Split into chunks of 1000 versions if necessary (Brevo limits 1000 max message versions)
        const chunkSize = 999
        let chunks = []
        for (let i = 0; i < targetEmails.length; i += chunkSize) {
          chunks.push(targetEmails.slice(i, i + chunkSize))
        }

        let totalSuccess = 0
        for (const chunk of chunks) {
          const messageVersions = chunk.map(recipient => ({
            to: [{ email: recipient.email, name: recipient.name }]
          }))

          const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': brevoKey,
            },
            body: JSON.stringify({
              sender: { name: 'Axon', email: Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@axon-app.com' },
              subject: subject,
              htmlContent: finalHtmlContent,
              messageVersions: messageVersions
            })
          })
          
          if (!res.ok) {
            const errData = await res.json()
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

        let classesData: any[] = []
        let assignmentsData: any[] = []
        let examsData: any[] = []

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
          exams: examsData
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
}

function buildAcademicDigestHtml(params: AcademicDigestParams): string {
  const { fullName, university, course, includeClasses, classes, includeAssignments, assignments, includeExams, exams } = params
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

