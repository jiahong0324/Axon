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
      reminders: reminders || []
    })
  } catch (err) {
    console.error('admin-student handler error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
