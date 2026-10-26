import { Activity } from 'lucide-react'
import { format, formatDistanceToNow, isSameMonth, isSameWeek, isToday } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { initials } from '../../lib/utils'
import { studentManager } from '../../lib/manageStudent'

const typeOptions = ['all', 'class', 'assignment', 'exam', 'reminder', 'exercise', 'diet', 'settings']
const dateOptions = ['Today', 'This Week', 'This Month', 'All Time']

export function isInternalSync(item) {
  if (!item) return false
  if (item.action === 'PAGE_VIEW' || item.entity_type === 'page') return true
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
  if (!item) return { verb: 'recorded activity', target: null, details: null }
  const action = (item.action || '').trim()
  const entityType = (item.entity_type || '').toLowerCase()
  const rawEntity = item.entity_name ? String(item.entity_name).trim() : ''
  let meta = item.metadata || {}
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta) } catch { meta = {} }
  }

  // 1. Page views & navigation (fallback in case any leak through)
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
    return { verb: 'viewed', target: pageLabel, details: null }
  }

  // 2. Timetable / Classes
  if (entityType === 'class' || action.toLowerCase().includes('class')) {
    const day = meta.day || meta.day_name || ''
    const startTime = meta.start_time || meta.startTime || ''
    const endTime = meta.end_time || meta.endTime || ''
    const timeStr = startTime ? `${startTime}${endTime ? ' - ' + endTime : ''}` : ''
    const venue = meta.classroom || meta.venue ? `Room ${meta.classroom || meta.venue}` : ''
    const classType = meta.class_type || meta.classType || ''
    const lecturer = meta.lecturer ? `Lecturer: ${meta.lecturer}` : ''
    const detailsList = [day, timeStr, venue, classType, lecturer].filter(Boolean)
    const details = detailsList.length > 0 ? detailsList.join(' • ') : null

    let verb = 'updated class'
    if (/^added\s+/i.test(action)) verb = 'added class'
    else if (/^deleted\s+/i.test(action)) verb = 'deleted class'

    return {
      verb,
      target: rawEntity ? `"${rawEntity}"` : null,
      details
    }
  }

  // 3. Assignments
  if (entityType === 'assignment' || action.toLowerCase().includes('assignment')) {
    const subject = meta.subject || ''
    const deadline = meta.deadline || meta.due_date || meta.dueDate || ''
    const priority = meta.priority && meta.priority !== 'Medium' ? `${meta.priority} Priority` : ''
    const detailsList = [subject, deadline ? `Due ${deadline}` : '', priority].filter(Boolean)
    const details = detailsList.length > 0 ? detailsList.join(' • ') : null

    let verb = 'updated assignment'
    if (/^added\s+/i.test(action)) verb = 'added assignment'
    else if (/^completed\s+/i.test(action)) verb = 'completed assignment'
    else if (/^deleted\s+/i.test(action)) verb = 'deleted assignment'

    return {
      verb,
      target: rawEntity ? `"${rawEntity}"` : null,
      details
    }
  }

  // 4. Exams
  if (entityType === 'exam' || action.toLowerCase().includes('exam')) {
    const examDate = meta.exam_date || meta.date || ''
    const startTime = meta.start_time || meta.startTime || ''
    const endTime = meta.end_time || meta.endTime || ''
    const timeStr = startTime ? `${startTime}${endTime ? ' - ' + endTime : ''}` : ''
    const venue = meta.venue || meta.classroom ? `Venue: ${meta.venue || meta.classroom}` : ''
    const examType = meta.exam_type || ''
    const detailsList = [examDate ? `Date: ${examDate}` : '', timeStr, venue, examType].filter(Boolean)
    const details = detailsList.length > 0 ? detailsList.join(' • ') : null

    let verb = 'updated exam'
    if (/^added\s+/i.test(action)) verb = 'scheduled exam'
    else if (/^deleted\s+/i.test(action)) verb = 'removed exam'

    return {
      verb,
      target: rawEntity ? `"${rawEntity}"` : null,
      details
    }
  }

  // 5. Exercise / Workouts
  if (entityType === 'exercise' || action.toLowerCase().includes('exercise') || action.toLowerCase().includes('workout')) {
    if (action.includes('Streak freeze') || action.includes('Streak Freeze')) {
      return {
        verb: 'used',
        target: 'Streak Freeze protection',
        details: meta.log_date ? `Protected streak for ${meta.log_date}` : 'Protected streak for missed day'
      }
    }
    if (action.includes('Earned +1 Streak Freeze')) {
      const reason = action.includes('milestone') ? '5 workouts milestone reward' : 'Weekly Goal Chest reward'
      return {
        verb: 'earned',
        target: 'Streak Freeze reward',
        details: reason
      }
    }
    if (action.toLowerCase().includes('goal')) {
      return {
        verb: 'updated workout goal',
        target: null,
        details: meta.weekly_goal ? `Target: ${meta.weekly_goal} days/week` : (rawEntity ? `Target: ${rawEntity}` : null)
      }
    }

    const duration = meta.duration ? `${meta.duration} mins` : ''
    const calories = meta.calories ? `${meta.calories} kcal` : ''
    const distance = meta.distance ? `${meta.distance} km` : ''
    const xp = meta.xp_earned ? `+${meta.xp_earned} XP` : '+20 XP'
    const detailsList = [duration, distance, calories, xp].filter(Boolean)
    const details = detailsList.length > 0 ? detailsList.join(' • ') : null

    return {
      verb: 'logged workout',
      target: rawEntity ? `"${rawEntity}"` : null,
      details
    }
  }

  // 6. Diet / Nutrition / Meals
  if (entityType === 'diet' || action.toLowerCase().includes('meal') || action.toLowerCase().includes('diet') || action.toLowerCase().includes('nutrition')) {
    if (action.toLowerCase().includes('goal')) {
      const cal = meta.calories ? `${meta.calories} kcal/day` : (rawEntity || '')
      const macros = [
        meta.protein ? `${meta.protein}g Protein` : '',
        meta.carbs ? `${meta.carbs}g Carbs` : '',
        meta.fats ? `${meta.fats}g Fats` : ''
      ].filter(Boolean)
      const detailsList = [cal ? `Target: ${cal}` : '', ...macros].filter(Boolean)
      return {
        verb: 'updated diet goals',
        target: null,
        details: detailsList.length > 0 ? detailsList.join(' • ') : null
      }
    }

    const mealType = meta.meal_type || ''
    const mealTime = meta.meal_time || ''
    const calories = meta.calories !== undefined && meta.calories !== null && meta.calories !== '' ? `${meta.calories} kcal` : ''
    const macros = [
      meta.protein ? `${meta.protein}g P` : '',
      meta.carbs ? `${meta.carbs}g C` : '',
      meta.fats ? `${meta.fats}g F` : ''
    ].filter(Boolean)
    const macroStr = macros.length > 0 ? `(${macros.join(' • ')})` : ''
    const detailsList = [mealType, mealTime, calories, macroStr].filter(Boolean)
    const details = detailsList.length > 0 ? detailsList.join(' • ') : null

    let verb = 'logged meal'
    if (/^updated\s+/i.test(action)) verb = 'updated meal'
    else if (/^deleted\s+/i.test(action)) verb = 'deleted meal'

    return {
      verb,
      target: rawEntity ? `"${rawEntity}"` : null,
      details
    }
  }

  // 7. Reminders
  if (entityType === 'reminder' || action.toLowerCase().includes('reminder')) {
    const due = meta.reminder_time || meta.due_date || meta.date || ''
    const time = meta.time || ''
    const detailsList = [due, time].filter(Boolean)
    const details = detailsList.length > 0 ? detailsList.join(' ') : null

    let verb = 'updated reminder'
    if (/^added\s+/i.test(action)) verb = 'set reminder'
    else if (/^completed\s+/i.test(action)) verb = 'completed reminder'
    else if (/^deleted\s+/i.test(action)) verb = 'removed reminder'

    return {
      verb,
      target: rawEntity ? `"${rawEntity}"` : null,
      details
    }
  }

  // 8. Course grades / GPA results / Semesters
  if (entityType === 'exam_result' || action.toLowerCase().includes('grade') || action.toLowerCase().includes('semester')) {
    if (action.toLowerCase().includes('submitted') || action.toLowerCase().includes('locked')) {
      const gpa = meta.gpa ? `GPA: ${meta.gpa}` : ''
      const count = meta.courses_count ? `${meta.courses_count} courses` : ''
      const details = [gpa, count].filter(Boolean).join(' • ') || null
      return {
        verb: 'submitted semester grades',
        target: rawEntity ? `"${rawEntity}"` : null,
        details
      }
    }
    let verb = 'recorded course grade'
    if (/^deleted\s+/i.test(action)) verb = 'removed course grade'
    else if (/^created semester/i.test(action)) verb = 'created semester'
    else if (/^deleted semester/i.test(action)) verb = 'deleted semester'

    return {
      verb,
      target: rawEntity ? `"${rawEntity}"` : null,
      details: null
    }
  }

  // 9. Settings, Preferences & Profile
  if (entityType === 'settings' || entityType === 'profile' || action.toLowerCase().includes('setting') || action.toLowerCase().includes('profile') || action.toLowerCase().includes('preference')) {
    if (action.toLowerCase().includes('password')) {
      return {
        verb: 'updated password',
        target: 'account security',
        details: 'Changed account login password'
      }
    }
    if (action.toLowerCase().includes('email')) {
      return {
        verb: 'changed email',
        target: rawEntity ? `"${rawEntity}"` : 'account email',
        details: meta.new_email ? `New email address: ${meta.new_email}` : null
      }
    }
    if (action.toLowerCase().includes('profile')) {
      const detailsList = [
        meta.full_name ? `Name: ${meta.full_name}` : '',
        meta.university ? `Uni: ${meta.university}` : '',
        meta.course ? `Course: ${meta.course}` : '',
        meta.student_id ? `ID: ${meta.student_id}` : '',
        meta.avatar_color ? `Avatar: ${meta.avatar_color}` : ''
      ].filter(Boolean)
      const details = detailsList.length > 0 ? detailsList.join(' • ') : 'Updated personal profile details'
      return {
        verb: 'updated profile',
        target: rawEntity ? `"${rawEntity}"` : null,
        details
      }
    }
    if (action.toLowerCase().includes('academic report') || action.toLowerCase().includes('email digest')) {
      return {
        verb: 'emailed academic report',
        target: 'email digest',
        details: meta.sections ? `Sections: ${meta.sections}` : null
      }
    }
    if (action.toLowerCase().includes('pdf')) {
      return {
        verb: 'exported academic report',
        target: 'PDF document',
        details: 'Downloaded full planner PDF report'
      }
    }

    const settingName = meta.label || rawEntity || meta.key || 'settings'
    const settingVal = meta.friendly_value || meta.value || ''
    const details = settingVal ? `Changed to: ${settingVal}` : null

    return {
      verb: 'updated setting',
      target: settingName ? `"${settingName}"` : 'preferences',
      details
    }
  }

  // 10. Announcements
  if (entityType === 'announcement' || action.toLowerCase().includes('announcement')) {
    let verb = 'published announcement'
    if (/^deleted\s+/i.test(action)) verb = 'deleted announcement'
    return {
      verb,
      target: rawEntity ? `"${rawEntity}"` : null,
      details: null
    }
  }

  // 11. Timetable & Exam sync
  if (action === 'SYNC_LINKED_TIMETABLES') {
    return { verb: 'synced', target: 'timetable schedule', details: null }
  }
  if (action === 'SYNC_EXAM_RESULTS') {
    return { verb: 'updated', target: 'exam results & GPA', details: null }
  }

  // Fallbacks
  let targetLabel = rawEntity
  if (rawEntity.startsWith('[{') || rawEntity.startsWith('{"')) {
    try {
      const parsed = JSON.parse(rawEntity)
      if (Array.isArray(parsed)) targetLabel = `${parsed.length} items`
      else targetLabel = parsed.title || parsed.subject || parsed.name || 'records'
    } catch {
      targetLabel = 'records'
    }
  }

  let finalVerb = action.toLowerCase()
  if (action.includes('_')) {
    finalVerb = action.toLowerCase().replace(/_/g, ' ')
  }
  return {
    verb: finalVerb,
    target: targetLabel ? `"${targetLabel}"` : null,
    details: null
  }
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
      supabase.from('activity_log')
        .select('*')
        .neq('action', 'PAGE_VIEW')
        .neq('entity_type', 'page')
        .order('created_at', { ascending: false })
        .limit(500)
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
        <div>
          <p className="label">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {typeOptions.map(option => (
              <button
                key={option}
                onClick={() => setType(option)}
                className={`min-h-[40px] rounded-xl border px-2.5 py-1 text-xs capitalize transition-all ${
                  type === option
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-semibold'
                    : 'border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {option === 'all' ? 'All' : option === 'diet' ? 'Diet & Nutrition' : option === 'settings' ? 'Settings & Profile' : option}
              </button>
            ))}
          </div>
        </div>
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
  const dot = item.entity_type === 'class' ? 'bg-theme-400'
    : item.entity_type === 'assignment' ? 'bg-yellow-400'
    : item.entity_type === 'exam' ? 'bg-purple-400'
    : item.entity_type === 'exercise' ? 'bg-orange-400'
    : item.entity_type === 'diet' ? 'bg-emerald-400'
    : item.entity_type === 'reminder' ? 'bg-blue-400'
    : item.entity_type === 'settings' || item.entity_type === 'profile' ? 'bg-pink-400'
    : 'bg-emerald-400'
  const { verb, target, details } = formatHumanActivity(item)
  const displayName = profile?.full_name || profile?.email || (item.role === 'manager' || item.entity_name?.startsWith?.('/manager') ? 'Manager' : 'Student')

  return (
    <article className="grid grid-cols-[auto_auto_1fr] items-start gap-3 rounded-xl border border-white/10 p-3 hover:border-white/20 transition-colors">
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
        {details && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block rounded-md bg-white/5 px-2 py-0.5 border border-white/10 text-slate-300">
              {details}
            </span>
          </p>
        )}
        <p className="text-xs text-slate-500 mt-1">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
      </div>
    </article>
  )
}
