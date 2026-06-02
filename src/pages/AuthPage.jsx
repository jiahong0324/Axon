import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProfile, supabase } from '../lib/supabase'

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate()
  const isRegister = mode === 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = isRegister
        ? await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name } } })
        : await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (result.error) throw result.error
      if (isRegister) await createProfile(result.data.user, 'student')
      const user = result.data.user
      let { data: profile } = user
        ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        : { data: null }
      if (user && !profile) {
        await createProfile(user, 'student')
        profile = { role: 'student' }
      }
      navigate(profile?.role === 'manager' ? '/manager' : '/onboarding')
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider) {
    setError('')
    try {
      const options = { redirectTo: window.location.origin }
      if (provider === 'google') {
        options.queryParams = { prompt: 'select_account' }
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options
      })
      if (error) throw error
    } catch (err) {
      setError(err.message || `Failed to sign in with ${provider}.`)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] px-4 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="glass w-full rounded-2xl p-6 shadow-2xl">
          <div className="mb-6 text-center">
            <img src="/icons/logo.png" alt="Axon logo" className="mx-auto mb-3 h-12 w-12 rounded-xl object-contain" />
            <h1 className="font-heading text-3xl font-bold gradient-text">Axon</h1>
            <p className="mt-2 text-sm text-slate-400">Your study life, neatly gathered.</p>
          </div>
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-navy-950/70 p-1">
            <Link to="/login" className={`rounded-lg py-3 text-center text-sm font-semibold ${!isRegister ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>Sign In</Link>
            <Link to="/register" className={`rounded-lg py-3 text-center text-sm font-semibold ${isRegister ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>Sign Up</Link>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {isRegister && (
              <label className="block">
                <span className="label">Full name</span>
                <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </label>
            )}
            <label className="block">
              <span className="label">Email</span>
              <input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <input className="input" type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </label>
            {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
            <button disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRegister ? 'Create account' : 'Sign in'}
            </button>
            <p className="mt-4 text-center text-xs text-slate-400">
              By continuing, you agree to our <Link to="/terms" className="font-semibold text-blue-400 hover:underline">Terms and Conditions</Link>.
            </p>
          </form>
          <div className="my-6 flex items-center before:mt-0.5 before:flex-1 before:border-t before:border-white/10 after:mt-0.5 after:flex-1 after:border-t after:border-white/10">
            <p className="mx-4 mb-0 text-center text-sm text-slate-400">Or continue with</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleOAuth('google')} className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button type="button" onClick={() => handleOAuth('apple')} className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.4 12.3c-.02-2.16 1.76-3.21 1.84-3.26-1-1.46-2.56-1.68-3.13-1.7-1.33-.14-2.6.78-3.28.78-.68 0-1.73-.76-2.84-.74-1.45.02-2.79.84-3.54 2.15-1.52 2.65-.39 6.57 1.1 8.73.73 1.05 1.58 2.22 2.73 2.18 1.1-.04 1.54-.71 2.88-.71 1.33 0 1.73.71 2.88.69 1.18-.02 1.91-1.07 2.64-2.12.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.31-.89-2.49-3.48zm-1.89-5.18c.61-.75 1.03-1.78.92-2.82-.9.04-1.97.6-2.6 1.34-.56.65-1.05 1.71-.92 2.73 1 .08 2-.51 2.6-1.25z" />
              </svg>
              Apple
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
