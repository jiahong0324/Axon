import { AlertCircle, BookOpen, Calendar, CheckCircle, Flame, Dumbbell, MapPin, RefreshCw, X } from 'lucide-react'
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
import { calculateStreakAndStats, fetchExerciseData, getTodayStr } from '../lib/exerciseUtils'
import { SkeletonStats, SkeletonList } from '../components/SkeletonLoader'
import { supabase } from '../lib/supabase'
import { daysFromToday, dateLabel, formatTime } from '../lib/utils'
import { useLanguage } from '../components/LanguageProvider'
import { readCache, writeCache } from '../lib/cache'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [exams, setExams] = useState([])
  const [tip, setTip] = useState('')
  const [tipLoading, setTipLoading] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [banner, setBanner] = useState(() => localStorage.getItem('axon_pwa_dismissed') !== 'true')
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()
  const { t } = useLanguage()
  const [currentTime, setCurrentTime] = useState(new Date())
  const todayName = format(currentTime, 'EEEE')

  const [exerciseLogs, setExerciseLogs] = useState([])
  const [exerciseFreezes, setExerciseFreezes] = useState(1)

  const exTodayStr = getTodayStr()
  const exStats = useMemo(() => calculateStreakAndStats(exerciseLogs, 4, exerciseFreezes, exTodayStr), [exerciseLogs, exerciseFreezes, exTodayStr])

  useEffect(() => { fetchDashboard() }, [])
  useEffect(() => { if (localStorage.getItem('dailyTipEnabled') !== 'false') refreshTip() }, [])
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  async function fetchDashboard() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const activeUser = session?.user || (await supabase.auth.getUser()).data.user
      if (!activeUser) {
        setLoading(false)
        return
      }
      setUser(activeUser)

      const cachedDashboard = readCache(`axon_home_dashboard_${activeUser.id}`, 10 * 60 * 1000)
      if (cachedDashboard) {
        setClasses(cachedDashboard.classes || [])
        setAssignments(cachedDashboard.assignments || [])
        setExams(cachedDashboard.exams || [])
        setAnnouncements(cachedDashboard.announcements || [])
        setLoading(false)
      }

      const today = format(new Date(), 'yyyy-MM-dd')
      const [classesRes, assignmentsRes, examsRes, announcementRowsRes] = await Promise.all([
        supabase.from('classes').select('*').eq('user_id', activeUser.id),
        supabase.from('assignments').select('*').eq('user_id', activeUser.id).neq('status', 'Done').order('deadline'),
        supabase.from('exams').select('*').eq('user_id', activeUser.id).gte('exam_date', today).order('exam_date'),
        supabase.from('announcements').select('*').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at', { ascending: false })
      ])

      let activeClasses = classesRes.data || []
      const savedActive = localStorage.getItem(`axon_active_timetable_${activeUser.id}`) || 'account'
      if (savedActive !== 'account') {
        try {
          const profiles = JSON.parse(localStorage.getItem(`axon_linked_timetables_${activeUser.id}`) || '[]')
          const activeProfile = profiles.find(p => p.id === savedActive)
          if (activeProfile && activeProfile.classes) {
            activeClasses = activeProfile.classes.filter(c => !c.profile_id || c.profile_id === savedActive)
          }
        } catch (e) {
          console.error('Failed to load linked timetable', e)
        }
      } else {
        const replacements = activeUser.user_metadata?.replacement_classes || []
        const validReplacements = replacements.filter(r => (!r.date || r.date >= today) && (!r.profile_id || r.profile_id === 'account' || r.profile_id === 'live'))
        activeClasses = [...activeClasses, ...validReplacements]
      }

      const validAnnouncements = (announcementRowsRes.data || []).filter(a => !sessionStorage.getItem(`axon_ann_dismissed_${a.id}`))

      setClasses(activeClasses)
      setAssignments(assignmentsRes.data || [])
      setExams(examsRes.data || [])
      setAnnouncements(validAnnouncements)

      const exData = await fetchExerciseData(activeUser.id)
      setExerciseLogs(exData.logs || [])
      setExerciseFreezes(exData.freezesAvailable || 1)

      writeCache(`axon_home_dashboard_${activeUser.id}`, {
        classes: activeClasses,
        assignments: assignmentsRes.data || [],
        exams: examsRes.data || [],
        announcements: validAnnouncements
      })
    } catch {
      showToast('Failed to load dashboard.', 'error')
    } finally {
      setLoading(false)
      window.hidePrerenderSplash?.()
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

  const todayStr = format(currentTime, 'yyyy-MM-dd')
  const todayClasses = useMemo(() => classes.filter(c => {
    if (c.is_replacement) {
      return c.date === todayStr
    }
    return c.day === todayName
  }).sort((a, b) => a.start_time.localeCompare(b.start_time)), [classes, todayName, todayStr])
  const dueSoon = assignments.filter(a => a.status !== 'Done').slice(0, 3)
  const nextExamDays = exams[0] ? daysFromToday(exams[0].exam_date) : null
  const nextExamValue = nextExamDays === null ? '-' : nextExamDays === 0 ? 'Today!' : nextExamDays
  const hour = currentTime.getHours()
  const greeting = hour < 12 ? t('home.morning') : hour < 18 ? t('home.afternoon') : t('home.evening')

  if (loading) return (
    <main className="home-dashboard main-content scrollbar-hide">
      <header className="mb-6 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <h1 className="font-heading text-2xl font-bold">{greeting}... 👋</h1>
        <p className="muted tabular-nums">{format(currentTime, 'EEEE, dd MMMM yyyy · hh:mm:ss a')}</p>
      </header>
      <SkeletonStats />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="card space-y-4">
          <h2 className="section-header">📚 {t('home.todayClasses')}</h2>
          <SkeletonList count={3} />
        </div>
        <div className="card space-y-4">
          <h2 className="section-header mb-0">📝 {t('home.dueSoon')}</h2>
          <SkeletonList count={3} />
        </div>
      </div>
    </main>
  )

  return (
    <main className="home-dashboard main-content scrollbar-hide">
      {banner && (
        <div className="card mb-5 flex items-center justify-between gap-3 border-theme-500/30">
          <p className="text-sm">📲 Add Axon to your home screen! On iOS, tap Share then Add to Home Screen.</p>
          <button className="rounded-lg p-2 hover:bg-white/5" onClick={() => { localStorage.setItem('axon_pwa_dismissed', 'true'); setBanner(false) }}><X className="h-5 w-5" /></button>
        </div>
      )}

      {announcements.map(a => (
        <div key={a.id} className={`glass mb-3 flex items-start justify-between gap-3 rounded-xl border-l-4 p-4 ${
          a.type === 'urgent' ? 'border-l-red-500' : a.type === 'warning' ? 'border-l-yellow-500' : 'border-l-theme-500'
        }`}>
          <div className="flex min-w-0 items-start gap-3">
            {a.type === 'urgent' && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse" />}
            <div className="min-w-0">
              <p className="font-semibold text-sm">Announcement: {a.title}</p>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>{a.message}</p>
            </div>
          </div>
          <button onClick={() => {
            sessionStorage.setItem(`axon_ann_dismissed_${a.id}`, '1')
            setAnnouncements(prev => prev.filter(x => x.id !== a.id))
          }} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-300"><X className="h-4 w-4" /></button>
        </div>
      ))}

      <header className="mb-6 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <h1 className="font-heading text-2xl font-bold">{greeting}, {user?.user_metadata?.full_name || 'student'} 👋</h1>
        <p className="muted tabular-nums">{format(currentTime, 'EEEE, dd MMMM yyyy · hh:mm:ss a')}</p>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Summary icon={BookOpen} label={t('home.todayClasses')} value={todayClasses.length} tone="text-theme-600 dark:text-theme-400" border="border-l-theme-500" />
        <Summary icon={AlertCircle} label={t('home.dueSoon')} value={dueSoon.length} tone="text-amber-600 dark:text-yellow-400" border="border-l-yellow-500" />
        <Summary icon={Calendar} label={t('home.daysToExam')} value={nextExamValue} valueClass={nextExamDays === 0 ? 'text-red-500' : ''} tone="text-violet-600 dark:text-purple-400" border="border-l-purple-500" />
        <Summary icon={Dumbbell} label={t('exercise.currentStreak')} value={`${exStats.currentStreak} 🔥`} tone="text-orange-600 dark:text-orange-400" border="border-l-orange-500" />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="flex h-full flex-col">
          <div className="home-panel card flex h-full flex-1 flex-col">
            <h2 className="section-header">📚 {t('home.todayClasses')}</h2>
            {todayClasses.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-10"><EmptyState emoji="🎉" message={t('home.noClasses')} /></div>
            ) : (
              <div className="space-y-3">{todayClasses.map(c => <ClassCard key={c.id} item={c} />)}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 md:gap-6">
          <section className="home-panel card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="section-header mb-0">📝 {t('home.dueSoon')}</h2>
              <Link to="/assignments" className="text-sm font-medium text-theme-400 hover:text-theme-300">{t('home.viewAll')}</Link>
            </div>
            {dueSoon.length === 0 ? (
              <div className="success-row flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-slate-300">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                {t('home.noUrgent')}
              </div>
            ) : (
              <div className="space-y-3">
                {dueSoon.map(a => (
                  <div key={a.id} className="home-list-card rounded-xl border border-white/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-semibold">{a.title}</p><p className="muted">{a.subject}</p></div>
                      <PriorityBadge priority={a.priority} />
                    </div>
                    <CountdownBadge deadline={a.deadline} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="home-panel card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="section-header mb-0">📖 {t('home.upcomingExams')}</h2>
              <Link to="/exams" className="text-sm font-medium text-theme-400 hover:text-theme-300">{t('home.viewAllExams')}</Link>
            </div>
            {exams.length === 0 ? <p className="muted">🎉 {t('home.noExams')}</p> : (
              <div className="space-y-3">{exams.slice(0, 3).map(exam => <ExamMiniCard key={exam.id} exam={exam} />)}</div>
            )}
          </section>
        </div>
      </section>

      <section className="ai-tip-card card border-l-4 border-l-purple-500 bg-[#1a1f35]">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Flame className="h-5 w-5 text-orange-400" /> {t('home.aiTip')}</h2>
          <button className="btn-ghost px-3 py-2" onClick={refreshTip}><RefreshCw className="h-4 w-4" /> {t('home.refresh')}</button>
        </div>
        {tipLoading ? <div className="space-y-3"><div className="skeleton h-4 rounded-full" /><div className="skeleton h-4 w-4/5 rounded-full" /><div className="skeleton h-4 w-2/3 rounded-full" /></div> : <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary, #dbe4f0)' }}>{tip}</p>}
      </section>

    </main>
  )
}

function Summary({ icon: Icon, label, value, tone, border, valueClass = '' }) {
  return <div className={`summary-card card flex items-center gap-4 border-l-4 ${border}`}><span className="summary-icon-wrap"><Icon className={`h-7 w-7 ${tone}`} /></span><div><p className="muted">{label}</p><p className={`text-2xl font-bold ${valueClass}`}>{value}</p></div></div>
}

function ClassCard({ item }) {
  const border = item.class_type === 'T' ? 'border-l-green-500' : item.class_type === 'P' ? 'border-l-purple-500' : 'border-l-theme-500'
  return (
    <div className={`class-card rounded-xl border border-l-4 border-white/10 ${border} p-4`}>
      <div className="mb-2 flex items-center justify-between gap-3"><p className="font-semibold">{item.subject}</p><ClassTypeBadge type={item.class_type} /></div>
      <p className="muted">{formatTime(item.start_time)} - {formatTime(item.end_time)} · {item.classroom || 'TBA'} · {item.lecturer || 'TBA'}</p>
    </div>
  )
}

function ExamMiniCard({ exam }) {
  const days = daysFromToday(exam.exam_date)
  const tone = days <= 7 ? 'text-red-600 dark:text-red-400' : days <= 14 ? 'text-amber-600 dark:text-yellow-400' : 'text-emerald-600 dark:text-green-400'
  const badge = exam.exam_type === 'Quiz' ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/30' : exam.exam_type === 'Midterm' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30' : 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30'
  return (
    <article className="exam-mini-card rounded-xl border border-white/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="font-semibold">{exam.subject}</p>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}>{exam.exam_type}</span>
          </div>
          <p className="muted flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {exam.venue || 'TBA'}</p>
          <p className="muted mt-1">📅 {dateLabel(exam.exam_date)}{exam.start_time && exam.end_time ? `  🕐 ${formatTime(exam.start_time)} \u2013 ${formatTime(exam.end_time)}` : ''}</p>
        </div>
        <div className="shrink-0 text-right"><span className={`text-xl font-bold ${tone}`}>{days === 0 ? 'Today!' : days}</span>{days !== 0 && <p className="text-xs text-slate-400">days</p>}</div>
      </div>
    </article>
  )
}
