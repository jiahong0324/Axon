import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, ArrowRight, Sparkles, GraduationCap, IdCard } from 'lucide-react'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [session, setSession] = useState(null)
  
  const [form, setForm] = useState({
    university: '',
    course: '',
    student_id: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!currentSession) {
        navigate('/login', { replace: true })
      } else {
        setSession(currentSession)
        // Check if already onboarded
        supabase.from('profiles').select('*').eq('id', currentSession.user.id).single()
          .then(({ data }) => {
            // If they have a university and student_id, they are already onboarded, skip to home.
            if (data && data.university && data.student_id) {
              navigate('/home', { replace: true })
            } else if (data) {
              setForm({
                university: data.university || '',
                course: data.course || '',
                student_id: data.student_id || ''
              })
              setLoading(false)
            } else {
              setLoading(false)
            }
          })
      }
    })
  }, [navigate])

  async function handleComplete() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      university: form.university,
      course: form.course,
      student_id: form.student_id
    }).eq('id', session.user.id)
    
    setSaving(false)
    if (!error) {
      navigate('/home', { replace: true })
    }
  }

  if (loading) return <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] flex items-center justify-center text-white"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <div className="flex h-screen overflow-y-auto items-center justify-center bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] p-4 text-white scrollbar-hide">
      <div className="glass w-full max-w-lg animate-slideUpFade rounded-3xl p-8 shadow-2xl md:p-10">
        
        {/* Progress Bar */}
        <div className="mb-8 flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-blue-500' : 'bg-white/10'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-blue-500' : 'bg-white/10'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 3 ? 'bg-blue-500' : 'bg-white/10'}`} />
        </div>

        {step === 1 && (
          <div className="animate-fadeIn text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h1 className="mb-4 font-heading text-3xl font-bold">Welcome to Axon!</h1>
            <p className="mb-8 text-slate-300">Your account is created. Let's take a moment to set up your student profile so Axon can organize your academic life perfectly.</p>
            <button onClick={() => setStep(2)} className="btn-primary w-full text-lg">
              Let's Go <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <GraduationCap className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold">Where do you study?</h2>
            <p className="mb-8 text-sm text-slate-400">This helps us customize your experience.</p>
            
            <div className="space-y-4">
              <label className="block">
                <span className="label">University / College</span>
                <input 
                  className="input text-lg" 
                  placeholder="e.g. Stanford University"
                  value={form.university} 
                  onChange={e => setForm({...form, university: e.target.value})} 
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="label">Course / Major (Optional)</span>
                <input 
                  className="input text-lg" 
                  placeholder="e.g. Computer Science"
                  value={form.course} 
                  onChange={e => setForm({...form, course: e.target.value})} 
                />
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
              <button 
                disabled={!form.university.trim()} 
                onClick={() => setStep(3)} 
                className="btn-primary flex-1"
              >
                Next <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fadeIn">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <IdCard className="h-8 w-8 text-purple-400" />
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold">What is your Student ID?</h2>
            <p className="mb-8 text-sm text-slate-400">Your school managers will use this to identify you in the system.</p>
            
            <label className="block">
              <span className="label">Student ID</span>
              <input 
                className="input text-lg" 
                placeholder="e.g. 10029344"
                value={form.student_id} 
                onChange={e => setForm({...form, student_id: e.target.value})} 
                autoFocus
              />
            </label>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(2)} disabled={saving} className="btn-ghost flex-1">Back</button>
              <button 
                disabled={!form.student_id.trim() || saving} 
                onClick={handleComplete} 
                className="btn-primary flex-1"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Finish Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
