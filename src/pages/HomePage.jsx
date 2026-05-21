import { AlertCircle, BookOpen, Calendar, Flame, MapPin, RefreshCw, X } from 'lucide-react'
import { Link } from 'react-router-dom'
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
      setTip(await askGroq("Based on this student's full schedule and data, give ONE specific, encouraging study tip for today in 2 sentences max.", context))
    } catch {
      setTip('Review the nearest deadline first, then protect one focused study block for your hardest subject today.')
    } finally {
      setTipLoading(false)
    }
  }

  const todayClasses = useMemo(() => classes.filter(c => c.day === todayName).sort((a, b) => a.start_time.localeCompare(b.start_time)), [classes, todayName])
  const dueSoon = assignments.filter(a => daysFromToday(a.deadline) <= 3).slice(0, 3)
  const nextExamDays = exams[0] ? daysFromToday(exams[0].exam_date) : null
  const nextExamValue = nextExamDays === null ? '—' : nextExamDays === 0 ? 'Today!' : nextExamDays
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
        <Summary icon={BookOpen} label="Today's Classes" value={todayClasses.length} tone="text-blue-400" border="border-l-blue-500" />
        <Summary icon={AlertCircle} label="Due Soon" value={dueSoon.length} tone="text-yellow-400" border="border-l-yellow-500" />
        <Summary icon={Calendar} label="Days to Next Exam" value={nextExamValue} valueClass={nextExamDays === 0 ? 'text-red-500' : ''} tone="text-purple-400" border="border-l-purple-500" />
      </section>

      <section className="mb-6 flex flex-col gap-5 xl:flex-row">
        <div className="card flex-1">
          <h2 className="section-header">Today's Classes</h2>
          {todayClasses.length === 0 ? <EmptyState emoji="📅" message="No classes today." /> : (
            <div className="space-y-3">{todayClasses.map(c => <ClassCard key={c.id} item={c} />)}</div>
          )}
        </div>
        <div className="card xl:w-80">
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
      </section>

      <section className="card mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="section-header mb-0">📖 Upcoming Exams</h2>
          <Link to="/exams" className="text-sm font-medium text-blue-400 hover:text-blue-300">View all exams →</Link>
        </div>
        {exams.length === 0 ? <EmptyState emoji="🎉" message="No exams coming up!" /> : (
          <div className="grid gap-3 md:grid-cols-3">{exams.slice(0, 3).map(exam => <ExamMiniCard key={exam.id} exam={exam} />)}</div>
        )}
      </section>

      <section className="ai-tip-card card border-l-4 border-l-purple-500 bg-[#1a1f35]">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Flame className="h-5 w-5 text-orange-400" /> AI Daily Tip</h2>
          <button className="btn-ghost px-3 py-2" onClick={refreshTip}><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
        {tipLoading ? <div className="space-y-3"><div className="skeleton h-4 rounded-full" /><div className="skeleton h-4 w-4/5 rounded-full" /><div className="skeleton h-4 w-2/3 rounded-full" /></div> : <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary, #dbe4f0)' }}>{tip}</p>}
      </section>
    </main>
  )
}

function Summary({ icon: Icon, label, value, tone, border, valueClass = '' }) {
  return <div className={`card flex items-center gap-4 border-l-4 ${border}`}><Icon className={`h-7 w-7 ${tone}`} /><div><p className="muted">{label}</p><p className={`text-2xl font-bold ${valueClass}`}>{value}</p></div></div>
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

function ExamMiniCard({ exam }) {
  const days = daysFromToday(exam.exam_date)
  const tone = days <= 7 ? 'text-red-400' : days <= 14 ? 'text-yellow-400' : 'text-green-400'
  const badge = exam.exam_type === 'Quiz' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : exam.exam_type === 'Midterm' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  return (
    <article className="rounded-xl border border-white/10 p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <p className="font-semibold">{exam.subject}</p>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}>{exam.exam_type}</span>
      </div>
      <p className="muted flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {exam.venue || 'TBA'}</p>
      <p className="muted mt-1">📅 {dateLabel(exam.exam_date)} {exam.start_time && exam.end_time ? `  🕐 ${exam.start_time} \u2013 ${exam.end_time}` : ''}</p>
      <div className="mt-2 text-right"><span className={`text-2xl font-bold ${tone}`}>{days === 0 ? 'Today' : days}</span>{days !== 0 && <span className="ml-1 text-xs text-slate-400">days left</span>}</div>
    </article>
  )
}
