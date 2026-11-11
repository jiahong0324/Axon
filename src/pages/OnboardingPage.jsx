import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, ArrowRight, Sparkles, GraduationCap, IdCard } from 'lucide-react'
import { updateAuthCache } from '../components/ProtectedRoute'
import { useToast } from '../components/Toast'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
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
        // Check if already onboarded or user previously skipped
        supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle()
          .then(({ data }) => {
            const isSkipped = localStorage.getItem(`axon_onboarding_skipped_${currentSession.user.id}`) === 'true' ||
                              localStorage.getItem('axon_onboarding_skipped') === 'true'

            if (data && data.university && data.student_id) {
              updateAuthCache(data)
              navigate('/home', { replace: true })
            } else if (isSkipped) {
              if (data) updateAuthCache(data)
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
          .catch((err) => {
            console.error('Failed to load profile in onboarding:', err)
            setLoading(false)
          })
      }
    })
  }, [navigate])

  function handleSkip() {
    if (session?.user?.id) {
      localStorage.setItem(`axon_onboarding_skipped_${session.user.id}`, 'true')
    }
    localStorage.setItem('axon_onboarding_skipped', 'true')
    showToast('You can complete your student profile later in Settings.', 'info')
    navigate('/home', { replace: true })
  }

  async function handleComplete() {
    if (!session?.user?.id) {
      navigate('/login', { replace: true })
      return
    }

    const university = form.university.trim()
    const student_id = form.student_id.trim()
    const course = form.course.trim()

    if (!university) {
      showToast('Please enter your University / College', 'error')
      setStep(2)
      return
    }
    if (!student_id) {
      showToast('Please enter your Student ID', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        university,
        course,
        student_id
      }

      // First try update since profile record was created upon login
      let { error, data } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', session.user.id)
        .select()

      // Fallback to upsert if profile record did not exist
      if (error || !data || data.length === 0) {
        const upsertRes = await supabase.from('profiles').upsert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || '',
          role: 'student',
          is_active: true,
          ...payload
        }, { onConflict: 'id' }).select()

        if (upsertRes.error) {
          throw upsertRes.error
        }
        if (upsertRes.data && upsertRes.data[0]) {
          data = upsertRes.data
        }
      }

      // Clear any skip flags
      localStorage.removeItem(`axon_onboarding_skipped_${session.user.id}`)
      localStorage.removeItem('axon_onboarding_skipped')

      // Update in-memory auth cache so ProtectedRoute allows entry without bouncing
      const updatedProfile = data && data[0] ? data[0] : payload
      updateAuthCache(updatedProfile)

      showToast('Profile setup complete!', 'success')
      navigate('/home', { replace: true })
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      showToast(err.message || 'Failed to save student profile. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[radial-gradient(circle_at_top,#E0E7FF,#EEF4FB_55%)] dark:bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] flex items-center justify-center text-slate-900 dark:text-white transition-colors duration-300"><Loader2 className="h-8 w-8 animate-spin text-theme-500" /></div>

  return (
    <div className="flex h-screen overflow-y-auto items-center justify-center bg-[radial-gradient(circle_at_top,#E0E7FF,#EEF4FB_55%)] dark:bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] p-4 text-slate-900 dark:text-white scrollbar-hide transition-colors duration-300">
      <div className="glass w-full max-w-lg animate-slideUpFade rounded-3xl p-8 shadow-2xl md:p-10">
        
        {/* Progress Bar */}
        <div className="mb-8 flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-theme-500' : 'bg-white/10'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-theme-500' : 'bg-white/10'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 3 ? 'bg-theme-500' : 'bg-white/10'}`} />
        </div>

        {step === 1 && (
          <div className="animate-fadeIn text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-theme-500 to-purple-600 shadow-lg shadow-theme-500/30">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h1 className="mb-4 font-heading text-3xl font-bold">Welcome to Axon!</h1>
            <p className="mb-8 text-slate-600 dark:text-slate-300">Your account is created. Let's take a moment to set up your student profile so Axon can organize your academic life perfectly.</p>
            <button onClick={() => setStep(2)} className="btn-primary w-full text-lg">
              Let's Go <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <div className="mt-4 text-center">
              <button 
                type="button"
                onClick={handleSkip} 
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-1"
              >
                Skip for now →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
              <GraduationCap className="h-8 w-8 text-theme-500 dark:text-theme-400" />
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold">Where do you study?</h2>
            <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">This helps us customize your experience.</p>
            
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
            <div className="mt-3 text-center">
              <button 
                type="button"
                onClick={handleSkip} 
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-1"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fadeIn">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
              <IdCard className="h-8 w-8 text-purple-500 dark:text-purple-400" />
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold">What is your Student ID?</h2>
            <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">Your school managers will use this to identify you in the system.</p>
            
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
            <div className="mt-3 text-center">
              <button 
                type="button"
                onClick={handleSkip} 
                disabled={saving} 
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-1"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
