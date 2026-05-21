import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
      navigate('/')
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
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
          </form>
        </div>
      </section>
    </main>
  )
}
