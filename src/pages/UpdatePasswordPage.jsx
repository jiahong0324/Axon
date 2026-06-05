import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

export default function UpdatePasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Verify the user is actually authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        showToast('You must be logged in to update your password.', 'error')
        navigate('/login')
      }
    })
  }, [navigate, showToast])

  async function submit(e) {
    e.preventDefault()
    setError('')
    
    if (form.password !== form.confirm) {
      return setError('Passwords do not match.')
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.')
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: form.password })
      if (updateError) throw updateError
      
      showToast('Password updated successfully.', 'success')
      navigate('/home')
    } catch (err) {
      setError(err.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,#E0E7FF,#EEF4FB_55%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] dark:text-white px-4 py-10 scrollbar-hide transition-colors duration-300">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="glass w-full rounded-2xl p-6 shadow-2xl">
          <div className="mb-6 text-center">
            <img src="/icons/logo.png" alt="Axon logo" className="mx-auto mb-3 h-12 w-12 rounded-xl object-contain" />
            <h1 className="font-heading text-3xl font-bold gradient-text">Update Password</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Please enter your new password below.</p>
          </div>
          
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="label">New Password</span>
              <input className="input" type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Confirm New Password</span>
              <input className="input" type="password" required minLength={8} value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
            </label>
            
            {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
            
            <button disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
