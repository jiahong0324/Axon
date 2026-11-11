import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wyvwflunwzdbluqrwyuz.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const adminSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' })
    }

    // Verify caller session
    const { data: { user: caller }, error: authErr } = await adminSupabase.auth.getUser(token)
    if (authErr || !caller) {
      return res.status(401).json({ error: 'Unauthorized caller session' })
    }

    // Verify manager role
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()

    if (profile?.role !== 'manager') {
      return res.status(403).json({ error: 'Forbidden: manager privilege required' })
    }

    const { studentId, mode } = req.query || {}
    const body = req.body || {}
    const targetStudentId = (body.studentId || studentId || '').trim()
    const action = body.action || req.query?.action
    const postData = body.data || {}

    // Handle Admin Action POST requests
    if (req.method === 'POST' && action) {
      if (!targetStudentId) {
        return res.status(400).json({ error: 'studentId is required for this action' })
      }

      if (action === 'change_password') {
        const newPassword = postData.password || body.password
        if (!newPassword || newPassword.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters' })
        }
        const { error } = await adminSupabase.auth.admin.updateUserById(targetStudentId, { password: newPassword })
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ success: true, message: 'Password updated successfully' })
      }

      if (action === 'change_email') {
        const newEmail = (postData.email || body.email || '').trim()
        if (!newEmail) return res.status(400).json({ error: 'Email is required' })
        const { error: authErr } = await adminSupabase.auth.admin.updateUserById(targetStudentId, { email: newEmail, email_confirm: true })
        if (authErr) return res.status(400).json({ error: authErr.message })
        await adminSupabase.from('profiles').update({ email: newEmail }).eq('id', targetStudentId)
        return res.status(200).json({ success: true, message: 'Email updated successfully' })
      }

      if (action === 'send_reset_email') {
        const { data: studentProfile } = await adminSupabase.from('profiles').select('email').eq('id', targetStudentId).maybeSingle()
        const targetEmail = studentProfile?.email
        if (!targetEmail) return res.status(404).json({ error: 'Student email not found' })
        const { error } = await adminSupabase.auth.resetPasswordForEmail(targetEmail)
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ success: true, message: 'Reset email sent successfully' })
      }

      if (action === 'deactivate') {
        const { error } = await adminSupabase.from('profiles').update({ is_active: false }).eq('id', targetStudentId)
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ success: true, message: 'Account deactivated' })
      }

      if (action === 'reactivate') {
        const { error } = await adminSupabase.from('profiles').update({ is_active: true }).eq('id', targetStudentId)
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ success: true, message: 'Account reactivated' })
      }

      if (action === 'delete_account') {
        await Promise.allSettled([
          adminSupabase.from('classes').delete().eq('user_id', targetStudentId),
          adminSupabase.from('assignments').delete().eq('user_id', targetStudentId),
          adminSupabase.from('exams').delete().eq('user_id', targetStudentId),
          adminSupabase.from('reminders').delete().eq('user_id', targetStudentId),
          adminSupabase.from('activity_log').delete().eq('user_id', targetStudentId),
          adminSupabase.from('exam_results').delete().eq('student_id', targetStudentId),
          adminSupabase.from('profiles').delete().eq('id', targetStudentId)
        ])
        const { error } = await adminSupabase.auth.admin.deleteUser(targetStudentId)
        if (error) return res.status(400).json({ error: error.message })
        return res.status(200).json({ success: true, message: 'Account deleted successfully' })
      }

      if (action === 'transfer_data') {
        const toStudentId = (postData.toStudentId || body.toStudentId || '').trim()
        if (!toStudentId) return res.status(400).json({ error: 'toStudentId is required' })

        // 1. Fetch source student metadata and classes
        const [sourceUserRes, sourceClassesRes, sourceAssignmentsRes, sourceExamsRes, sourceRemindersRes] = await Promise.all([
          adminSupabase.auth.admin.getUserById(targetStudentId),
          adminSupabase.from('classes').select('*').eq('user_id', targetStudentId),
          adminSupabase.from('assignments').select('*').eq('user_id', targetStudentId),
          adminSupabase.from('exams').select('*').eq('user_id', targetStudentId),
          adminSupabase.from('reminders').select('*').eq('user_id', targetStudentId)
        ])

        const sourceMeta = sourceUserRes?.data?.user?.user_metadata || {}

        // 2. Transfer classes
        if (sourceClassesRes.data && sourceClassesRes.data.length > 0) {
          const newClasses = sourceClassesRes.data.map(c => {
            const { id, created_at, ...rest } = c
            return { ...rest, user_id: toStudentId }
          })
          await adminSupabase.from('classes').insert(newClasses)
        }

        // 3. Transfer assignments
        if (sourceAssignmentsRes.data && sourceAssignmentsRes.data.length > 0) {
          const newAssignments = sourceAssignmentsRes.data.map(a => {
            const { id, created_at, ...rest } = a
            return { ...rest, user_id: toStudentId }
          })
          await adminSupabase.from('assignments').insert(newAssignments)
        }

        // 4. Transfer exams
        if (sourceExamsRes.data && sourceExamsRes.data.length > 0) {
          const newExams = sourceExamsRes.data.map(e => {
            const { id, created_at, ...rest } = e
            return { ...rest, user_id: toStudentId }
          })
          await adminSupabase.from('exams').insert(newExams)
        }

        // 5. Transfer reminders
        if (sourceRemindersRes.data && sourceRemindersRes.data.length > 0) {
          const newReminders = sourceRemindersRes.data.map(r => {
            const { id, created_at, ...rest } = r
            return { ...rest, user_id: toStudentId }
          })
          await adminSupabase.from('reminders').insert(newReminders)
        }

        // 5b. Transfer exam results semesters & courses
        try {
          const { data: sSemesters } = await adminSupabase.from('student_semesters').select('*').eq('user_id', targetStudentId)
          if (sSemesters && sSemesters.length > 0) {
            for (const s of sSemesters) {
              const { data: createdSem } = await adminSupabase.from('student_semesters').insert({
                user_id: toStudentId,
                name: s.name
              }).select().single()

              if (createdSem) {
                const { data: sCourses } = await adminSupabase.from('student_semester_courses').select('*').eq('semester_id', s.id)
                if (sCourses && sCourses.length > 0) {
                  const newCourses = sCourses.map(c => {
                    const { id, created_at, ...rest } = c
                    return { ...rest, user_id: toStudentId, semester_id: createdSem.id }
                  })
                  await adminSupabase.from('student_semester_courses').insert(newCourses)
                }
              }
            }
          }
        } catch (_) {}

        // 6. Transfer metadata (linked_timetables, timetable_order, semester settings, etc.)
        const { data: targetUserRes } = await adminSupabase.auth.admin.getUserById(toStudentId)
        const targetMeta = targetUserRes?.user?.user_metadata || {}
        await adminSupabase.auth.admin.updateUserById(toStudentId, {
          user_metadata: {
            ...targetMeta,
            linked_timetables: sourceMeta.linked_timetables || targetMeta.linked_timetables || [],
            timetable_order: sourceMeta.timetable_order || targetMeta.timetable_order || [],
            axon_exam_results_semesters: sourceMeta.axon_exam_results_semesters || targetMeta.axon_exam_results_semesters || [],
            semester_name: sourceMeta.semester_name || targetMeta.semester_name || '',
            semester_start_date: sourceMeta.semester_start_date || targetMeta.semester_start_date || '',
            semester_end_date: sourceMeta.semester_end_date || targetMeta.semester_end_date || '',
            preferences: {
              ...(targetMeta.preferences || {}),
              ...(sourceMeta.preferences || {})
            }
          }
        })

        // 7. Update profile university & student_id on target
        const { data: sourceProfile } = await adminSupabase.from('profiles').select('*').eq('id', targetStudentId).maybeSingle()
        if (sourceProfile) {
          await adminSupabase.from('profiles').update({
            university: sourceProfile.university,
            course: sourceProfile.course,
            student_id: sourceProfile.student_id,
            xp_total: sourceProfile.xp_total || 0,
            weekly_exercise_goal: sourceProfile.weekly_exercise_goal || 4
          }).eq('id', toStudentId)
        }

        return res.status(200).json({ success: true, message: 'All student records transferred successfully' })
      }
    }

    // MODE: Fetch all chats across all students
    if (mode === 'all_chats') {
      const { data: dbChats, error: chatErr } = await adminSupabase
        .from('student_ai_chats')
        .select('*')
        .eq('is_manager', false)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (chatErr) {
        console.warn('Error fetching all student_ai_chats:', chatErr.message)
      }

      return res.status(200).json({
        success: true,
        chats: dbChats || []
      })
    }

    // MODE: Clean up raw internal sync logs from activity_log
    if (mode === 'cleanup_activity') {
      try {
        await adminSupabase
          .from('activity_log')
          .delete()
          .in('entity_type', ['axon_linked_timetables', 'axon_exam_results_semesters'])

        await adminSupabase
          .from('activity_log')
          .delete()
          .like('action', 'SYNC_%')

        await adminSupabase
          .from('activity_log')
          .delete()
          .like('entity_name', '[{%')

        await adminSupabase
          .from('activity_log')
          .delete()
          .or('action.eq.PAGE_VIEW,entity_type.eq.page')
      } catch (e) {
        console.warn('cleanup_activity error:', e)
      }

      return res.status(200).json({
        success: true,
        message: 'Purged raw internal sync logs'
      })
    }

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' })
    }

    // Fetch full student auth user record (including user_metadata)
    let targetUser = null
    try {
      const { data: userRes } = await adminSupabase.auth.admin.getUserById(studentId)
      targetUser = userRes?.user || null
    } catch (e) {
      console.warn('Failed to load user metadata via admin API:', e)
    }

    const meta = targetUser?.user_metadata || {}

    // Fetch all student chats from DB
    const { data: dbChats } = await adminSupabase
      .from('student_ai_chats')
      .select('*')
      .eq('user_id', studentId)
      .eq('is_manager', false)
      .order('created_at', { ascending: false })

    // Merge DB chats with metadata backup chats so no student queries are lost
    const finalChats = [...(dbChats || [])]
    const metaChats = Array.isArray(meta.axon_ai_chats) ? meta.axon_ai_chats : []
    for (let i = 0; i < metaChats.length; i++) {
      const mc = metaChats[i]
      const mcContent = (mc.content || '').trim()
      const mcRole = mc.role || 'user'
      const exists = finalChats.some(fc =>
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
    finalChats.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

    // Fetch live timetable classes
    const { data: classes } = await adminSupabase
      .from('classes')
      .select('*')
      .eq('user_id', studentId)

    // Fetch exams
    const { data: exams } = await adminSupabase
      .from('exams')
      .select('*')
      .eq('user_id', studentId)
      .order('exam_date')

    // Fetch exam results
    const { data: examResults } = await adminSupabase
      .from('exam_results')
      .select('*')
      .eq('student_id', studentId)

    // Fetch reminders
    const { data: reminders } = await adminSupabase
      .from('reminders')
      .select('*')
      .eq('user_id', studentId)
      .order('reminder_time', { ascending: true })

    // Fetch nutrition goals & logs
    let dbNutritionGoals = null
    let dbNutritionLogs = []
    try {
      const [goalsRes, logsRes] = await Promise.all([
        adminSupabase.from('nutrition_goals').select('*').eq('user_id', studentId).maybeSingle(),
        adminSupabase.from('nutrition_logs').select('*').eq('user_id', studentId).order('created_at', { ascending: false })
      ])
      dbNutritionGoals = goalsRes?.data || null
      dbNutritionLogs = logsRes?.data || []
    } catch (e) {
      console.warn('admin-student nutrition fetch fallback:', e)
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
      ? dbNutritionLogs.map(row => ({
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

    const rawPrefs = meta.preferences || {}
    const accountInfo = {
      id: targetUser?.id || studentId,
      email: targetUser?.email || '',
      email_confirmed_at: targetUser?.email_confirmed_at || targetUser?.confirmed_at || null,
      last_sign_in_at: targetUser?.last_sign_in_at || null,
      created_at: targetUser?.created_at || null,
      updated_at: targetUser?.updated_at || null,
      phone: targetUser?.phone || null,
      app_metadata: targetUser?.app_metadata || {}
    }

    return res.status(200).json({
      success: true,
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
    })
  } catch (err) {
    console.error('admin-student handler error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
