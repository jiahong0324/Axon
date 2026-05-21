import { AlertCircle, BookOpen, Calendar, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import ClassTypeBadge from '../components/ClassTypeBadge'
import CountdownBadge from '../components/CountdownBadge'
import EmptyState from '../components/EmptyState'
import PriorityBadge from '../components/PriorityBadge'
import { useToast } from '../components/Toast'
import { askGroq } from '../lib/groq'
import { buildUserContext } from '../lib/buildUserContext'
import { supabase } from '../lib/supabase'
import { daysFromToday, dateLabel } from '../lib/utils'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [exams, setExams] = useState([])
  const [tip, setTip] = useState('')
  const [tipLoading, setTipLoading] = useState(false)
  const [banner, setBanner] = useState(() => localStorage.getItem('installBannerDismissed') !== 'true')
  const { showToast } = useToast()
  const todayName = format(new Date(), 'EEEE')

  useEffect(() => { fetchDashboard() }, [])
  useEffect(() => { if (localStorage.getItem('dailyTipEnabled') !== 'false') refreshTip() }, [])

  async function fetchDashboard() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const today = format(new Date(), 'yyyy-MM-dd')
      const [classesRes, assignmentsRes, examsRes] = await Promise.all([
        supabase.from('classes').select('*').eq('user_id', user.id),
        supabase.from('assignments').select('*').eq('user_id', user.id).neq('status', 'Done').order('deadline'),
        supabase.from('exams').select('*').eq('user_id', user.id).gte('exam_date', today).order('exam_date')
      ])
      setClasses(classesRes.data || [])
      setAssignments(assignmentsRes.data || [])
      setExams(examsRes.data || [])
    } catch {
      showToast('Failed to load dashboard.', 'error')
    }
  }

  async function refreshTip() {
    setTipLoading(true)
    try {
      const context = await buildUserContext()
      const text = await askGroq("Based on this student's full schedule and data, give ONE specific, encouraging study tip for today in 2 sentences max.", context)
      setTip(text)
    } catch {
      setTip('Review the nearest deadline first, then protect one focused study block for your hardest subject today.')
    } finally {
      setTipLoading(false)
    }
  }

  const todayClasses = useMemo(() => classes.filter(c => c.day === todayName).sort((a, b) => a.start_time.localeCompare(b.start_time)), [classes, todayName])
  const dueSoon = assignments.filter(a => daysFromToday(a.deadline) <= 3).slice(0, 3)
  const nextExamDays = exams[0] ? daysFromToday(exams[0].exam_date) : null
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <main className="main-content">
      {banner && (
        <div className="card mb-5 flex items-center justify-between gap-3 border-blue-500/30">
          <p className="text-sm">Add UniMind to your home screen for the best experience. On iOS, tap Share then Add to Home Screen.</p>
          <button className="rounded-lg p-2 hover:bg-white/5" onClick={() => { localStorage.setItem('installBannerDismissed', 'true'); setBanner(false) }}><X className="h-5 w-5" /></button>
        </div>
      )}
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold">{greeting}, {user?.user_metadata?.full_name || 'student'}</h1>
        <p className="muted mt-1">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </header>
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Summary icon={BookOpen} label="Today's Classes" value={todayClasses.length} tone="text-blue-400" />
        <Summary icon={AlertCircle} label="Due Soon" value={dueSoon.length} tone="text-yellow-400" />
        <Summary icon={Calendar} label="Days to Next Exam" value={nextExamDays ?? 'None'} tone="text-purple-400" />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <h2 className="section-header">Today's Classes</h2>
          {todayClasses.length === 0 ? <EmptyState emoji="📅" message="No classes today." /> : (
            <div className="space-y-3">
              {todayClasses.map(c => <ClassCard key={c.id} item={c} />)}
            </div>
          )}
        </div>
        <div className="space-y-5">
          <div className="card">
            <h2 className="section-header">Due Soon</h2>
            {dueSoon.length === 0 ? <EmptyState emoji="✅" message="No urgent assignments." /> : (
              <div className="space-y-3">
                {dueSoon.map(a => (
                  <div key={a.id} className="rounded-xl border border-white/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-semibold">{a.title}</p><p className="muted">{a.subject} · {dateLabel(a.deadline)}</p></div>
                      <PriorityBadge priority={a.priority} />
                    </div>
                    <CountdownBadge deadline={a.deadline} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card border-purple-500/30">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">AI Daily Tip</h2>
              <button className="btn-ghost px-3 py-2" onClick={refreshTip}><RefreshCw className="h-4 w-4" /> Refresh</button>
            </div>
            {tipLoading ? <div className="skeleton h-20 rounded-xl" /> : <p className="text-sm leading-6 text-slate-300">{tip}</p>}
          </div>
        </div>
      </section>
    </main>
  )
}

function Summary({ icon: Icon, label, value, tone }) {
  return <div className="card flex items-center gap-4"><Icon className={`h-7 w-7 ${tone}`} /><div><p className="muted">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>
}

function ClassCard({ item }) {
  const border = item.class_type === 'T' ? 'border-l-green-500' : item.class_type === 'P' ? 'border-l-purple-500' : 'border-l-blue-500'
  return (
    <div className={`rounded-xl border border-l-4 border-white/10 ${border} p-4`}>
      <div className="mb-2 flex items-center justify-between gap-3"><p className="font-semibold">{item.subject}</p><ClassTypeBadge type={item.class_type} /></div>
      <p className="muted">{item.start_time} - {item.end_time} · {item.classroom || 'TBA'} · {item.lecturer || 'TBA'}</p>
    </div>
  )
}
