import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wyvwflunwzdbluqrwyuz.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || serviceRoleKey

function byteSize(obj) {
  return Buffer.byteLength(JSON.stringify(obj || {}), 'utf8')
}

async function ensureActivitySnapshot(adminSupabase, userId, action, entityType, payload) {
  if (!Array.isArray(payload) || payload.length === 0) return
  const serialized = JSON.stringify(payload)
  const { data: latest } = await adminSupabase
    .from('activity_log')
    .select('entity_name')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .order('created_at', { ascending: false })
    .limit(1)
  if (latest?.[0]?.entity_name === serialized) return
  await adminSupabase.from('activity_log').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_name: serialized
  })
}

async function archiveMetadataToTables(adminSupabase, userId, meta) {
  // 1. Linked timetables snapshot
  if (Array.isArray(meta.linked_timetables) && meta.linked_timetables.length > 0) {
    try {
      await ensureActivitySnapshot(
        adminSupabase,
        userId,
        'SYNC_LINKED_TIMETABLES',
        'axon_linked_timetables',
        meta.linked_timetables
      )
    } catch (_) {}
  }

  // 2. Exam results semesters snapshot + SQL tables
  if (Array.isArray(meta.axon_exam_results_semesters) && meta.axon_exam_results_semesters.length > 0) {
    try {
      await ensureActivitySnapshot(
        adminSupabase,
        userId,
        'SYNC_EXAM_RESULTS_SEMESTERS',
        'axon_exam_results_semesters',
        meta.axon_exam_results_semesters
      )
    } catch (_) {}

    try {
      const { data: existingSems } = await adminSupabase
        .from('student_semesters')
        .select('*')
        .eq('user_id', userId)
      const { data: existingCourses } = await adminSupabase
        .from('student_semester_courses')
        .select('*')
        .eq('user_id', userId)

      const semMap = new Map((existingSems || []).map(s => [String(s.name || '').trim().toLowerCase(), s]))
      const courseKeys = new Set((existingCourses || []).map(c =>
        `${c.semester_id}|${String(c.course_code || '').trim().toLowerCase()}|${String(c.course_name || '').trim().toLowerCase()}`
      ))

      for (const sem of meta.axon_exam_results_semesters) {
        const semName = String(sem?.name || '').trim()
        if (!semName) continue
        let targetSem = semMap.get(semName.toLowerCase())
        if (!targetSem) {
          const { data: insertedSem } = await adminSupabase
            .from('student_semesters')
            .insert({ user_id: userId, name: semName })
            .select()
            .maybeSingle()
          if (insertedSem) {
            targetSem = insertedSem
            semMap.set(semName.toLowerCase(), insertedSem)
          }
        }
        if (targetSem?.id && Array.isArray(sem.courses) && sem.courses.length > 0) {
          const missingCourses = []
          for (const c of sem.courses) {
            if (!c?.course_name) continue
            const key = `${targetSem.id}|${String(c.course_code || '').trim().toLowerCase()}|${String(c.course_name || '').trim().toLowerCase()}`
            if (!courseKeys.has(key)) {
              courseKeys.add(key)
              missingCourses.push({
                semester_id: targetSem.id,
                user_id: userId,
                course_code: c.course_code || '',
                course_name: c.course_name,
                credit_hours: Number(c.credit_hours) || 0,
                grade: c.grade || ''
              })
            }
          }
          if (missingCourses.length > 0) {
            await adminSupabase.from('student_semester_courses').insert(missingCourses)
          }
        }
      }
    } catch (_) {}
  }

  // 3. AI chat history -> student_ai_chats
  if (Array.isArray(meta.axon_ai_chats) && meta.axon_ai_chats.length > 0) {
    try {
      const { data: existingChats } = await adminSupabase
        .from('student_ai_chats')
        .select('role, content')
        .eq('user_id', userId)
        .eq('is_manager', false)
      const seen = new Set((existingChats || []).map(c => `${c.role}|${String(c.content || '').trim()}`))
      const missingChats = []
      for (const mc of meta.axon_ai_chats) {
        const content = String(mc?.content || '').trim()
        if (!content) continue
        const role = mc.role || 'user'
        const k = `${role}|${content}`
        if (!seen.has(k)) {
          seen.add(k)
          missingChats.push({
            user_id: userId,
            role,
            content,
            is_manager: false,
            created_at: mc.created_at || new Date().toISOString()
          })
        }
      }
      if (missingChats.length > 0) {
        await adminSupabase.from('student_ai_chats').insert(missingChats)
      }
    } catch (_) {}
  }

  // 4. Exercise logs & frozen dates -> exercise_logs + activity_log + profiles
  if (Array.isArray(meta.axon_exercise_logs) && meta.axon_exercise_logs.length > 0) {
    try {
      const validLogs = meta.axon_exercise_logs.filter(l => l?.log_date && l.activity_type !== 'Streak Freeze')
      for (const l of validLogs) {
        await adminSupabase.from('exercise_logs').upsert({
          user_id: userId,
          log_date: l.log_date,
          activity_type: l.activity_type || 'Gym',
          xp_earned: Number(l.xp_earned) || 20
        }, { onConflict: 'user_id,log_date' })
      }
    } catch (_) {}
  }

  if (Array.isArray(meta.axon_frozen_dates) && meta.axon_frozen_dates.length > 0) {
    try {
      const { data: exActs } = await adminSupabase
        .from('activity_log')
        .select('action')
        .eq('user_id', userId)
        .eq('entity_type', 'exercise')
      const loggedFrozen = new Set()
      ;(exActs || []).forEach(a => {
        const m = String(a.action || '').match(/Streak freeze used for missed day (\d{4}-\d{2}-\d{2})/i)
        if (m?.[1]) loggedFrozen.add(m[1])
      })
      for (const fDate of meta.axon_frozen_dates) {
        if (fDate && !loggedFrozen.has(fDate)) {
          await adminSupabase.from('activity_log').insert({
            user_id: userId,
            action: `Streak freeze used for missed day ${fDate}`,
            entity_type: 'exercise',
            entity_name: 'Streak Freeze'
          })
        }
      }
    } catch (_) {}
  }

  if (typeof meta.axon_xp_total === 'number' || typeof meta.axon_freezes === 'number') {
    try {
      const { data: prof } = await adminSupabase
        .from('profiles')
        .select('xp_total, streak_freezes_available')
        .eq('id', userId)
        .maybeSingle()
      if (prof) {
        await adminSupabase.from('profiles').update({
          xp_total: Math.max(Number(prof.xp_total) || 0, Number(meta.axon_xp_total) || 0),
          streak_freezes_available: typeof meta.axon_freezes === 'number'
            ? meta.axon_freezes
            : prof.streak_freezes_available
        }).eq('id', userId)
      }
    } catch (_) {}
  }

  // 5. Nutrition logs -> nutrition_logs
  if (Array.isArray(meta.axon_nutrition_logs) && meta.axon_nutrition_logs.length > 0) {
    try {
      const { data: existingNut } = await adminSupabase
        .from('nutrition_logs')
        .select('log_date, name, calories')
        .eq('user_id', userId)
      const seenNut = new Set((existingNut || []).map(n =>
        `${n.log_date}|${String(n.name || '').trim().toLowerCase()}|${Number(n.calories) || 0}`
      ))
      const missingNut = []
      for (const item of meta.axon_nutrition_logs) {
        if (!item?.date || !item?.name) continue
        const k = `${item.date}|${String(item.name).trim().toLowerCase()}|${Number(item.calories) || 0}`
        if (!seenNut.has(k)) {
          seenNut.add(k)
          missingNut.push({
            user_id: userId,
            log_date: item.date,
            meal_type: item.meal_type || 'Lunch',
            name: item.name,
            calories: Number(item.calories) || 0,
            protein: Number(item.protein) || 0,
            carbs: Number(item.carbs) || 0,
            fats: Number(item.fats) || 0,
            notes: item.notes || '',
            image_url: ''
          })
        }
      }
      if (missingNut.length > 0) {
        await adminSupabase.from('nutrition_logs').insert(missingNut)
      }
    } catch (_) {}
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!serviceRoleKey || !anonKey) {
    return res.status(501).json({ error: 'Server compaction credentials not configured', needsClientFallback: true })
  }

  try {
    const refreshToken = (req.body?.refresh_token || '').trim()
    if (!refreshToken) {
      return res.status(400).json({ error: 'refresh_token is required in request body' })
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify caller identity via refresh_token in body (no oversized Authorization header)
    const { data: verified, error: verifyErr } = await authClient.auth.refreshSession({ refresh_token: refreshToken })
    if (verifyErr || !verified?.user || !verified?.session) {
      return res.status(401).json({ error: verifyErr?.message || 'Invalid or expired refresh token' })
    }

    const user = verified.user
    const currentRefreshToken = verified.session.refresh_token
    const meta = user.user_metadata || {}
    const beforeBytes = byteSize(meta)

    // Archive bulky metadata into Postgres BEFORE clearing any key
    await archiveMetadataToTables(adminSupabase, user.id, meta)

    const todayStr = new Date().toISOString().slice(0, 10)
    const nullPatch = {}
    const simulated = { ...meta }

    const alwaysStripKeys = ['axon_ai_chats', 'axon_nutrition_logs', 'axon_exercise_logs', 'axon_frozen_dates']
    for (const k of alwaysStripKeys) {
      if (k in simulated && simulated[k] !== null) {
        nullPatch[k] = null
        delete simulated[k]
      }
    }

    if (Array.isArray(simulated.replacement_classes)) {
      const activeReps = simulated.replacement_classes.filter(r => !r?.date || r.date >= todayStr)
      if (activeReps.length !== simulated.replacement_classes.length) {
        nullPatch.replacement_classes = activeReps
        simulated.replacement_classes = activeReps
      }
    }

    // If still larger than 4KB, offload linked_timetables & exam_results_semesters to activity_log/SQL only
    if (byteSize(simulated) > 4096) {
      if ('linked_timetables' in simulated && simulated.linked_timetables !== null) {
        nullPatch.linked_timetables = null
        delete simulated.linked_timetables
      }
      if ('axon_exam_results_semesters' in simulated && simulated.axon_exam_results_semesters !== null) {
        nullPatch.axon_exam_results_semesters = null
        delete simulated.axon_exam_results_semesters
      }
    }

    // Extra safeguard if calculator rows or replacement classes still keep metadata > 6KB
    if (byteSize(simulated) > 6144) {
      for (const k of ['axon_quick_calculator_rows', 'axon_course_calculator_rows']) {
        if (k in simulated && simulated[k] !== null) {
          nullPatch[k] = null
          delete simulated[k]
        }
      }
    }

    if (Object.keys(nullPatch).length === 0) {
      return res.status(200).json({
        success: true,
        repaired: false,
        beforeBytes,
        afterBytes: beforeBytes,
        session: verified.session
      })
    }

    const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: nullPatch
    })
    if (updateErr) {
      return res.status(500).json({ error: updateErr.message, session: verified.session })
    }

    const { data: freshData, error: freshErr } = await authClient.auth.refreshSession({
      refresh_token: currentRefreshToken
    })

    if (freshErr || !freshData?.session) {
      return res.status(200).json({
        success: true,
        repaired: true,
        beforeBytes,
        afterBytes: byteSize(simulated),
        session: verified.session
      })
    }

    return res.status(200).json({
      success: true,
      repaired: true,
      beforeBytes,
      afterBytes: byteSize(freshData.user?.user_metadata || simulated),
      session: freshData.session
    })
  } catch (err) {
    console.error('compact-session error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
