import { Activity } from 'lucide-react'
import { format, formatDistanceToNow, isSameMonth, isSameWeek, isToday } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { initials } from '../../lib/utils'
import { studentManager } from '../../lib/manageStudent'

const typeOptions = ['all', 'class', 'assignment', 'exam', 'reminder', 'exercise']
const dateOptions = ['Today', 'This Week', 'This Month', 'All Time']

export function isInternalSync(item) {
  if (!item) return false
  if (item.entity_type === 'axon_linked_timetables' || item.entity_type === 'axon_exam_results_semesters') return true
  if (typeof item.entity_type === 'string' && item.entity_type.startsWith('axon_')) return true
  if (typeof item.action === 'string' && (item.action.startsWith('SYNC_') || item.action.startsWith('sync_'))) return true
  if (typeof item.entity_name === 'string' && (item.entity_name.startsWith('[{') || item.entity_name.startsWith('{"') || item.entity_name.startsWith('[{"'))) return true
  return false
}

const routeNames = {
  '/': 'Landing Page',
  '/home': 'Student Dashboard',
  '/timetable': 'Class Timetable',
  '/assignments': 'Assignments',
  '/exams': 'Upcoming Exams',
  '/results': 'Exam Results & GPA',
  '/exam-results': 'Exam Results & GPA',
  '/health': 'Health & Fitness Tracker',
  '/exercise': 'Health & Fitness Tracker',
  '/ai-helper': 'AI Study Companion',
  '/reminders': 'Reminders',
  '/settings': 'Account Settings',
  '/login': 'Login Page',
  '/register': 'Registration Page',
  '/onboarding': 'Onboarding Guide',
  '/manager': 'Manager Dashboard',
  '/manager/students': 'Student Directory',
  '/manager/monitoring': 'System Monitoring & Telemetry',
  '/manager/announcements': 'Announcements Management',
  '/manager/activity': 'Live Activity Audit Stream',
  '/manager/ai-chats': 'Student AI Chats',
  '/manager/reports': 'Academic Reports',
  '/manager/feedback': 'Student Feedback'
}

export function formatHumanActivity(item) {
  if (!item) return { verb: 'recorded activity', target: null }
  const action = (item.action || '').trim()
  const entityType = (item.entity_type || '').toLowerCase()
  const rawEntity = item.entity_name ? String(item.entity_name).trim() : ''

  // 1. Page views & navigation
  if (action === 'PAGE_VIEW' || entityType === 'page') {
    const cleanPath = rawEntity || item.path || ''
    let pageLabel = routeNames[cleanPath]
    if (!pageLabel) {
      if (cleanPath.startsWith('/manager/students/')) pageLabel = 'Student Profile Details'
      else if (cleanPath.startsWith('/manager/')) {
        const seg = cleanPath.replace('/manager/', '').replace(/[-_]/g, ' ')
        pageLabel = 'Manager ' + seg.charAt(0).toUpperCase() + seg.slice(1)
      } else if (cleanPath) {
        const seg = cleanPath.replace(/^\//, '').replace(/[-_]/g, ' ')
        pageLabel = seg.charAt(0).toUpperCase() + seg.slice(1)
      } else {
        pageLabel = 'Dashboard'
      }
    }
    return { verb: 'viewed', target: pageLabel }
  }

  // 2. Timetable & Exam sync
  if (action === 'SYNC_LINKED_TIMETABLES') {
    return { verb: 'synced', target: 'timetable schedule' }
  }
  if (action === 'SYNC_EXAM_RESULTS') {
    return { verb: 'updated', target: 'exam results & GPA' }
  }

  let targetLabel = rawEntity
  if (rawEntity.startsWith('[{') || rawEntity.startsWith('{"') || rawEntity.startsWith('[{"')) {
    try {
      const parsed = JSON.parse(rawEntity)
      if (Array.isArray(parsed)) targetLabel = `${parsed.length} items`
      else targetLabel = parsed.title || parsed.subject || parsed.name || 'records'
    } catch {
      targetLabel = 'records'
    }
  }

  // 3. Exercise & streak freezes
  if (action.includes('Streak freeze') || action.includes('Streak Freeze')) {
    return { verb: 'used', target: 'Streak Freeze protection' }
  }
  if (action.includes('Earned +1 Streak Freeze')) {
    return { verb: 'earned', target: 'Streak Freeze milestone reward' }
  }
  if (action.toLowerCase().includes('exercise check-in')) {
    return { verb: 'logged workout', target: targetLabel ? `"${targetLabel}"` : null }
  }

  // 4. Academic verbs (added, completed, updated, deleted)
  if (/^added\s+/i.test(action)) {
    const type = action.replace(/^added\s+/i, '')
    return { verb: `added ${type}`, target: targetLabel ? `"${targetLabel}"` : null }
  }
  if (/^completed\s+/i.test(action)) {
    const type = action.replace(/^completed\s+/i, '')
    return { verb: `completed ${type}`, target: targetLabel ? `"${targetLabel}"` : null }
  }
  if (/^updated\s+/i.test(action)) {
    const type = action.replace(/^updated\s+/i, '')
    return { verb: `updated ${type}`, target: targetLabel ? `"${targetLabel}"` : null }
  }
  if (/^deleted\s+/i.test(action)) {
    const type = action.replace(/^deleted\s+/i, '')
    return { verb: `deleted ${type}`, target: targetLabel ? `"${targetLabel}"` : null }
  }

  // 5. Generic underscore actions
  if (action.includes('_')) {
    const humanVerb = action.toLowerCase().replace(/_/g, ' ')
    return { verb: humanVerb, target: targetLabel ? `"${targetLabel}"` : null }
  }

  return { verb: action.toLowerCase(), target: targetLabel ? `"${targetLabel}"` : null }
}

export function formatActionLabel(action, entityName, entityType) {
  if (!action) return 'recorded activity'
  const res = formatHumanActivity({ action, entity_name: entityName, entity_type: entityType })
  return res.verb
}

export function formatEntityLabel(entityName, action) {
  if (!entityName && !action) return null
  const res = formatHumanActivity({ action, entity_name: entityName })
  return res.target
}

export default function ManagerActivityPage() {
  const [students, setStudents] = useState([])
  const [allProfilesList, setAllProfilesList] = useState([])
  const [activity, setActivity] = useState([])
  const [studentId, setStudentId] = useState('all')
  const [type, setType] = useState('all')
  const [dateFilter, setDateFilter] = useState('All Time')
  const [limit, setLimit] = useState(50)

  useEffect(() => { loadActivity() }, [])

  async function loadActivity() {
    // Proactively clean up lingering sync logs from database in background
    studentManager.cleanupActivityLogs?.().catch?.(() => {})

    const [profilesRes, activityRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(500)
    ])
    const allProfiles = profilesRes.data || []
    setAllProfilesList(allProfiles)
    setStudents(allProfiles.filter(p => p.role === 'student'))
    // Exclude internal JSON sync logs
    const validActivities = (activityRes.data || []).filter(item => !isInternalSync(item))
    setActivity(validActivities)
  }

  const filtered = useMemo(() => activity.filter(item => {
    if (isInternalSync(item)) return false
    const created = new Date(item.created_at)
    if (studentId !== 'all' && item.user_id !== studentId) return false
    if (type !== 'all' && item.entity_type !== type) return false
    if (dateFilter === 'Today' && !isToday(created)) return false
    if (dateFilter === 'This Week' && !isSameWeek(created, new Date())) return false
    if (dateFilter === 'This Month' && !isSameMonth(created, new Date())) return false
    return true
  }), [activity, studentId, type, dateFilter])

  const profileById = useMemo(() => new Map(allProfilesList.map(p => [p.id, p])), [allProfilesList])
  const visible = filtered.slice(0, limit)
  const grouped = visible.reduce((map, item) => {
    const key = format(new Date(item.created_at), 'EEEE, dd MMM yyyy')
    map[key] = map[key] || []
    map[key].push(item)
    return map
  }, {})

  return (
    <main className="main-content">
      <h1 className="page-title flex items-center gap-2"><Activity className="h-6 w-6 text-amber-400" /> Student Activity Feed</h1>

      <section className="card mb-5 grid gap-3 xl:grid-cols-[1fr_1.2fr_1fr]">
        <label><span className="label">Student</span><select className="input" value={studentId} onChange={e => setStudentId(e.target.value)}><option value="all">All Students</option>{students.map(student => <option key={student.id} value={student.id}>{student.full_name || student.email}</option>)}</select></label>
        <div><p className="label">Type</p><div className="grid grid-cols-6 gap-2">{typeOptions.map(option => <button key={option} onClick={() => setType(option)} className={`min-h-[44px] rounded-xl border px-2 text-xs capitalize ${type === option ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-white/10 text-slate-400'}`}>{option === 'all' ? 'All' : option}</button>)}</div></div>
        <label><span className="label">Date</span><select className="input" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>{dateOptions.map(option => <option key={option}>{option}</option>)}</select></label>
      </section>

      <section className="card">
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h2 className="mb-3 text-sm font-semibold text-slate-400">{date}</h2>
              <div className="space-y-3">
                {items.map(item => <ActivityRow key={item.id} item={item} profile={profileById.get(item.user_id)} />)}
              </div>
            </div>
          ))}
        </div>
        {visible.length === 0 && <p className="muted py-8 text-center">No student activity matches these filters.</p>}
        {filtered.length > limit && <button className="btn-ghost mx-auto mt-5 flex" onClick={() => setLimit(v => v + 50)}>Load more</button>}
      </section>
    </main>
  )
}

function ActivityRow({ item, profile }) {
  const dot = item.entity_type === 'class' ? 'bg-theme-400' : item.entity_type === 'assignment' ? 'bg-yellow-400' : item.entity_type === 'exam' ? 'bg-purple-400' : item.entity_type === 'exercise' ? 'bg-orange-400' : 'bg-emerald-400'
  const { verb, target } = formatHumanActivity(item)
  const displayName = profile?.full_name || profile?.email || (item.role === 'manager' || item.entity_name?.startsWith?.('/manager') ? 'Manager' : 'Student')

  return (
    <article className="grid grid-cols-[auto_auto_1fr] items-start gap-3 rounded-xl border border-white/10 p-3">
      <span className={`mt-4 h-2.5 w-2.5 rounded-full ${dot}`} />
      <div className="grid h-10 w-10 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: profile?.avatar_color || '#F59E0B' }}>
        {initials(displayName)}
      </div>
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-white">{displayName}</span>{' '}
          <span className="text-slate-300">{verb}</span>{' '}
          {target && <span className="font-medium text-amber-300">{target}</span>}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
      </div>
    </article>
  )
}
