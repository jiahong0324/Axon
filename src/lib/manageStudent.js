import { supabase } from './supabase'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-student`

async function call(action, studentId, data = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey || session.access_token}`
    },
    body: JSON.stringify({ action, studentId, data, userToken: session.access_token })
  })
  const result = await res.json()
  if (!res.ok || result.error) throw new Error(result.error || 'Operation failed')
  return result
}

export const studentManager = {
  createStudent: data => call('create_student', 'new', data),
  getStudentDetail: id => call('get_student_detail', id),
  inviteUser: (email, role = 'student') => call('invite_user', 'new', { email, role }),
  changePassword: (id, password) => call('change_password', id, { password }),
  changeEmail: (id, email) => call('change_email', id, { email }),
  sendResetEmail: id => call('send_reset_email', id),
  sendWelcomeEmail: id => call('send_welcome_email', id),
  sendPromotionalEmail: data => call('send_promotional_email', 'broadcast', data),
  sendLoginEmail: id => call('send_login_email', id),
  sendAcademicDigest: (id, options) => call('send_academic_digest', id, options),
  deleteAccount: id => call('delete_account', id),
  deactivate: id => call('deactivate', id),
  reactivate: id => call('reactivate', id),
  cleanupActivityLogs: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      try {
        await fetch('/api/admin-student?mode=cleanup_activity', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
      } catch (_) {}
    }
    return call('cleanup_activity', 'admin').catch(() => null)
  }
}

export async function fetchFullStudentDetail(studentId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // 1. Try Vercel Serverless Function
  try {
    const res = await fetch(`/api/admin-student?studentId=${encodeURIComponent(studentId)}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })
    if (res.ok) {
      const json = await res.json()
      if (json && json.success) return json
    }
  } catch (e) {
    console.warn('Serverless admin-student API error:', e)
  }

  // 2. Try Supabase Edge Function
  try {
    const edgeRes = await studentManager.getStudentDetail(studentId)
    if (edgeRes?.data) return edgeRes.data
  } catch (e) {
    console.warn('Edge Function getStudentDetail error:', e)
  }

  return null
}

