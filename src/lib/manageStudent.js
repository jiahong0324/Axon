import { supabase } from './supabase'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-student`

async function call(action, studentId, data = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ action, studentId, data })
  })
  const result = await res.json()
  if (!res.ok || result.error) throw new Error(result.error || 'Operation failed')
  return result
}

export const studentManager = {
  createStudent: data => call('create_student', 'new', data),
  changePassword: (id, password) => call('change_password', id, { password }),
  changeEmail: (id, email) => call('change_email', id, { email }),
  sendResetEmail: id => call('send_reset_email', id),
  deleteAccount: id => call('delete_account', id),
  deactivate: id => call('deactivate', id),
  reactivate: id => call('reactivate', id)
}
