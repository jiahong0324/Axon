import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import SEO from '../components/SEO'

export default function UpdatePasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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
    <>
      <SEO
        title="Update Password | Axon"
        description="Choose a secure new password for your Axon account."
      />
      <main className="h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,#E0E7FF,#EEF4FB_55%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] dark:text-white px-4 py-10 scrollbar-hide transition-colors duration-300">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
          <div className="glass w-full rounded-2xl p-6 shadow-2xl">
            <div className="mb-6 text-center">
              <Link to="/" aria-label="Axon Home">
                <img src="/icons/logo.png" alt="Axon logo" className="mx-auto mb-3 h-12 w-12 rounded-xl object-contain hover:scale-105 transition-transform" />
              </Link>
              <h1 className="font-heading text-3xl font-bold gradient-text">Update Password</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Please enter your new password below.</p>
            </div>
            
            <form onSubmit={submit} className="space-y-4">
              <div className="block">
                <label htmlFor="update-password-input" className="label mb-1 block cursor-pointer">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="update-password-input"
                    name="newPassword"
                    className="input pr-11"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    autoComplete="new-password"
                    aria-label="New Password"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    onMouseDown={e => e.preventDefault()}
                    className="password-toggle absolute inset-y-0 right-0 flex items-center justify-center px-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="block">
                <label htmlFor="update-confirm-input" className="label mb-1 block cursor-pointer">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="update-confirm-input"
                    name="confirmPassword"
                    className="input pr-11"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.confirm}
                    onChange={e => setForm({ ...form, confirm: e.target.value })}
                    autoComplete="new-password"
                    aria-label="Confirm New Password"
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(prev => !prev)}
                    onMouseDown={e => e.preventDefault()}
                    className="password-toggle absolute inset-y-0 right-0 flex items-center justify-center px-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
              
              <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  )
}
