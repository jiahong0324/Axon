import { supabase } from './supabase'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-student`

async function call(action, studentId, data = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // 1. First try the robust Vercel Serverless Function (/api/admin-student)
  let explicitApiError = null
  try {
    const res = await fetch('/api/admin-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ action, studentId, data })
    })
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const result = await res.json()
      if (res.ok && result.success) return result
      if (result.error && res.status < 500) {
        explicitApiError = new Error(result.error)
      }
    }
  } catch (apiErr) {
    console.warn('/api/admin-student attempt failed, trying edge function fallback:', apiErr.message)
  }

  if (explicitApiError) throw explicitApiError

  // 2. Fallback to Supabase Edge function
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
  transferData: (fromId, toId) => call('transfer_data', fromId, { toStudentId: toId }),
  listAllAccounts: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null
    try {
      const res = await fetch('/api/admin-student?mode=list_accounts', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const json = await res.json()
        if (json?.success && Array.isArray(json.accounts)) return json.accounts
      }
    } catch (_) {}
    return null
  },
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

