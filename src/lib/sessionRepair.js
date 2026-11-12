import { supabase } from './supabase'

export const METADATA_INLINE_LIMIT_BYTES = 2500
export const METADATA_COMPACT_THRESHOLD_BYTES = 4096

const BULKY_ALWAYS_CLEAR_KEYS = [
  'axon_ai_chats',
  'axon_nutrition_logs',
  'axon_exercise_logs',
  'axon_frozen_dates'
]

let inFlightRepair = null
let lastRepairAttemptAt = 0

export function estimateMetadataBytes(meta) {
  try {
    return new TextEncoder().encode(JSON.stringify(meta || {})).length
  } catch {
    return JSON.stringify(meta || {}).length
  }
}

export function isMetadataBloated(user) {
  const meta = user?.user_metadata
  if (!meta || typeof meta !== 'object') return false
  if (estimateMetadataBytes(meta) > METADATA_COMPACT_THRESHOLD_BYTES) return true
  return BULKY_ALWAYS_CLEAR_KEYS.some(k => Array.isArray(meta[k]) && meta[k].length > 0)
}

export function isBadRequestError(err) {
  if (!err) return false
  const msg = String(err.message || err.error || err || '')
  return err.status === 400 || msg === 'Bad Request' || /bad request|header.*large|headersoverflow/i.test(msg)
}

function safeParseJsonArray(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function backupUserMetadataToLocalStorage(user) {
  if (!user?.id || typeof localStorage === 'undefined') return
  const uid = user.id
  const meta = user.user_metadata || {}

  try {
    if (Array.isArray(meta.linked_timetables) && meta.linked_timetables.length > 0) {
      const existing = safeParseJsonArray(localStorage.getItem(`axon_linked_timetables_${uid}`))
      const seen = new Set(existing.map(p => p?.id || p?.name))
      const merged = [...existing]
      meta.linked_timetables.forEach(p => {
        if (p && !seen.has(p.id || p.name)) {
          seen.add(p.id || p.name)
          merged.push(p)
        }
      })
      localStorage.setItem(`axon_linked_timetables_${uid}`, JSON.stringify(merged))
    }

    if (Array.isArray(meta.axon_exam_results_semesters) && meta.axon_exam_results_semesters.length > 0) {
      const existing = safeParseJsonArray(
        localStorage.getItem(`axon_exam_results_semesters_${uid}`) || localStorage.getItem('axon_exam_results_semesters')
      )
      const seen = new Set(existing.map(s => String(s?.name || '').trim().toLowerCase()))
      const merged = [...existing]
      meta.axon_exam_results_semesters.forEach(s => {
        const key = String(s?.name || '').trim().toLowerCase()
        if (key && !seen.has(key)) {
          seen.add(key)
          merged.push(s)
        }
      })
      localStorage.setItem(`axon_exam_results_semesters_${uid}`, JSON.stringify(merged))
      localStorage.setItem('axon_exam_results_semesters', JSON.stringify(merged))
    }

    if (Array.isArray(meta.axon_nutrition_logs) && meta.axon_nutrition_logs.length > 0) {
      const existing = safeParseJsonArray(localStorage.getItem(`axon_nutrition_logs_${uid}`))
      const seen = new Set(existing.map(l => l?.id || `${l?.date}|${l?.name}`))
      const merged = [...existing]
      meta.axon_nutrition_logs.forEach(l => {
        const key = l?.id || `${l?.date}|${l?.name}`
        if (l && !seen.has(key)) {
          seen.add(key)
          merged.push(l)
        }
      })
      localStorage.setItem(`axon_nutrition_logs_${uid}`, JSON.stringify(merged))
    }

    if (meta.axon_nutrition_goals && !localStorage.getItem(`axon_nutrition_goals_${uid}`)) {
      localStorage.setItem(`axon_nutrition_goals_${uid}`, JSON.stringify(meta.axon_nutrition_goals))
    }

    if (Array.isArray(meta.axon_exercise_logs) && meta.axon_exercise_logs.length > 0 && !localStorage.getItem(`axon_exercise_data_${uid}`)) {
      localStorage.setItem(`axon_exercise_data_${uid}`, JSON.stringify({
        logs: meta.axon_exercise_logs,
        weeklyGoal: meta.axon_weekly_goal || 4,
        xpTotal: meta.axon_xp_total || 0,
        freezesAvailable: meta.axon_freezes ?? 1,
        frozenDates: meta.axon_frozen_dates || []
      }))
    }

    if (Array.isArray(meta.axon_ai_chats) && meta.axon_ai_chats.length > 0) {
      const existing = safeParseJsonArray(localStorage.getItem('aiChat'))
      if (existing.length <= 1) {
        localStorage.setItem('aiChat', JSON.stringify(meta.axon_ai_chats))
      }
    }
  } catch (e) {
    console.warn('Metadata local backup warning:', e)
  }
}

async function archiveClientSnapshots(user, linkedSnapshot, semSnapshot) {
  if (!user?.id) return
  if (Array.isArray(linkedSnapshot) && linkedSnapshot.length > 0) {
    try {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'SYNC_LINKED_TIMETABLES',
        entity_type: 'axon_linked_timetables',
        entity_name: JSON.stringify(linkedSnapshot)
      })
    } catch (_) {}
  }
  if (Array.isArray(semSnapshot) && semSnapshot.length > 0) {
    try {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'SYNC_EXAM_RESULTS_SEMESTERS',
        entity_type: 'axon_exam_results_semesters',
        entity_name: JSON.stringify(semSnapshot)
      })
    } catch (_) {}
  }
}

export async function compactSessionIfNeeded(sessionInput = null, { force = false } = {}) {
  if (inFlightRepair) return inFlightRepair

  const now = Date.now()
  if (!force && now - lastRepairAttemptAt < 10_000) {
    return { repaired: false, session: sessionInput }
  }

  inFlightRepair = (async () => {
    try {
      let activeSession = sessionInput
      if (!activeSession) {
        const { data } = await supabase.auth.getSession()
        activeSession = data?.session || null
      }
      if (!activeSession?.user) {
        return { repaired: false, session: activeSession }
      }

      const meta = activeSession.user.user_metadata || {}
      const shouldCompact = force || isMetadataBloated(activeSession.user)
      if (!shouldCompact) {
        return { repaired: false, session: activeSession }
      }

      lastRepairAttemptAt = Date.now()
      backupUserMetadataToLocalStorage(activeSession.user)

      // 1. Try server-side atomic archive + compaction via refresh_token in body (bypasses header limits)
      if (activeSession.refresh_token) {
        try {
          const res = await fetch('/api/compact-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: activeSession.refresh_token })
          })
          const payload = await res.json().catch(() => null)
          if (payload?.session?.access_token && payload?.session?.refresh_token) {
            await supabase.auth.setSession({
              access_token: payload.session.access_token,
              refresh_token: payload.session.refresh_token
            })
            return {
              repaired: Boolean(payload.repaired),
              session: payload.session,
              user: payload.session.user
            }
          }
        } catch (apiErr) {
          console.warn('Server session compaction fallback to client:', apiErr)
        }
      }

      // 2. Client-side fallback (GoTrue /auth/v1/user + refreshSession)
      const linkedSnapshot = Array.isArray(meta.linked_timetables) ? meta.linked_timetables : null
      const semSnapshot = Array.isArray(meta.axon_exam_results_semesters) ? meta.axon_exam_results_semesters : null
      const simulated = { ...meta }
      const patch = {}

      for (const k of BULKY_ALWAYS_CLEAR_KEYS) {
        if (k in simulated && simulated[k] !== null) {
          patch[k] = null
          delete simulated[k]
        }
      }

      const todayStr = new Date().toISOString().slice(0, 10)
      if (Array.isArray(simulated.replacement_classes)) {
        const activeReps = simulated.replacement_classes.filter(r => !r?.date || r.date >= todayStr)
        if (activeReps.length !== simulated.replacement_classes.length) {
          patch.replacement_classes = activeReps
          simulated.replacement_classes = activeReps
        }
      }

      if (estimateMetadataBytes(simulated) > METADATA_COMPACT_THRESHOLD_BYTES) {
        if ('linked_timetables' in simulated && simulated.linked_timetables !== null) {
          patch.linked_timetables = null
          delete simulated.linked_timetables
        }
        if ('axon_exam_results_semesters' in simulated && simulated.axon_exam_results_semesters !== null) {
          patch.axon_exam_results_semesters = null
          delete simulated.axon_exam_results_semesters
        }
      }

      if (estimateMetadataBytes(simulated) > 6144) {
        for (const k of ['axon_quick_calculator_rows', 'axon_course_calculator_rows']) {
          if (k in simulated && simulated[k] !== null) {
            patch[k] = null
            delete simulated[k]
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await supabase.auth.updateUser({ data: patch })
        const { data: refreshed } = await supabase.auth.refreshSession()
        const finalSession = refreshed?.session || activeSession
        await archiveClientSnapshots(finalSession.user || activeSession.user, linkedSnapshot, semSnapshot)
        return { repaired: true, session: finalSession, user: finalSession.user }
      }

      return { repaired: false, session: activeSession }
    } catch (err) {
      console.error('Session compaction failed:', err)
      return { repaired: false, session: sessionInput }
    } finally {
      inFlightRepair = null
    }
  })()

  return inFlightRepair
}
