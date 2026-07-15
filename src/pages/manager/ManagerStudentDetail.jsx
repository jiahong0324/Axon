import { ArrowLeft, Award, Download, Dumbbell, Flame, Pencil, Shield, Trophy } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import ClassTypeBadge from '../../components/ClassTypeBadge'
import CountdownBadge from '../../components/CountdownBadge'
import EditStudentPanel from '../../components/EditStudentPanel'
import Modal from '../../components/Modal'
import PriorityBadge from '../../components/PriorityBadge'
import { useToast } from '../../components/Toast'
import { useLanguage } from '../../components/LanguageProvider'
import { downloadStudentReport } from '../../lib/generateReport'
import { supabase } from '../../lib/supabase'
import { dateLabel, days, daysFromToday, formatTime, initials } from '../../lib/utils'
import { calculateOverallCGPA } from '../../lib/tarumtGrading'
import { ACTIVITY_ICONS, calculateStreakAndStats, fetchExerciseData, getLevelInfo, getTodayStr } from '../../lib/exerciseUtils'

const tabs = ['Timetable', 'Assignments', 'Exams & Results', 'Exercise', 'Activity']
const resultInitial = { score: '', grade: 'A', remarks: '' }

export default function ManagerStudentDetail() {
  const { studentId } = useParams()
  const [student, setStudent] = useState(null)
  const [classes, setClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [exams, setExams] = useState([])
  const [results, setResults] = useState([])
  const [semesters, setSemesters] = useState([])
  const [activity, setActivity] = useState([])
  const [activeTab, setActiveTab] = useState('Timetable')
  const [editing, setEditing] = useState(false)
  const [resultExam, setResultExam] = useState(null)
  const [resultForm, setResultForm] = useState(resultInitial)
  const { showToast } = useToast()

  useEffect(() => { loadDetail() }, [studentId])

  async function loadDetail() {
    const [studentRes, classesRes, assignmentsRes, examsRes, resultsRes, activityRes, semsRes, coursesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', studentId).single(),
      supabase.from('classes').select('*').eq('user_id', studentId),
      supabase.from('assignments').select('*').eq('user_id', studentId).order('deadline'),
      supabase.from('exams').select('*').eq('user_id', studentId).order('exam_date'),
      supabase.from('exam_results').select('*').eq('student_id', studentId),
      supabase.from('activity_log').select('*').eq('user_id', studentId).order('created_at', { ascending: false }),
      supabase.from('student_semesters').select('*').eq('user_id', studentId).order('created_at'),
      supabase.from('student_semester_courses').select('*').eq('user_id', studentId).order('created_at')
    ])
    setStudent(studentRes.data)
    setClasses(classesRes.data || [])
    setAssignments(assignmentsRes.data || [])
    setExams(examsRes.data || [])
    setResults(resultsRes.data || [])
    setActivity(activityRes.data || [])

    const sems = (semsRes.data || []).map(s => ({
      ...s,
      courses: (coursesRes.data || []).filter(c => c.semester_id === s.id)
    }))
    setSemesters(sems)
  }

  const resultByExam = useMemo(() => new Map(results.map(result => [result.exam_id, result])), [results])

  function openResult(exam) {
    const existing = resultByExam.get(exam.id)
    setResultExam(exam)
    setResultForm(existing ? { score: existing.score ?? '', grade: existing.grade || 'A', remarks: existing.remarks || '' } : resultInitial)
  }

  async function saveResult(e) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      exam_id: resultExam.id,
      student_id: studentId,
      score: Number(resultForm.score),
      grade: resultForm.grade,
      remarks: resultForm.remarks,
      entered_by: user.id
    }
    const existing = resultByExam.get(resultExam.id)
    const { error } = existing
      ? await supabase.from('exam_results').update(payload).eq('id', existing.id)
      : await supabase.from('exam_results').insert(payload)
    if (error) return showToast('Result could not be saved.', 'error')
    showToast('Exam result saved.', 'success')
    setResultExam(null)
    loadDetail()
  }

  if (!student) return <main className="main-content"><div className="card">Loading student...</div></main>

  return (
    <main className="main-content">
      <header className="card mb-5">
        <Link to="/manager/students" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300"><ArrowLeft className="h-4 w-4" /> Back to students</Link>
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-bold text-white" style={{ background: student.avatar_color || '#F59E0B' }}>{initials(student.full_name || student.email)}</div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{student.full_name || 'Unnamed student'}</h1>
              <p className="muted truncate">{student.email} · {student.course || 'No course'} · {student.student_id || 'No ID'}</p>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${student.is_active === false ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{student.is_active === false ? 'Deactivated' : 'Active'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit Student</button>
            <button className="manager-primary-btn" onClick={() => downloadStudentReport({ student, classes, assignments, exams, examResults: results, semesters })}><Download className="h-4 w-4" /> Export PDF Report</button>
          </div>
        </div>
      </header>

      <nav className="scrollbar-hide mb-5 flex gap-2 overflow-x-auto">
        {tabs.map(tab => <button key={tab} className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-medium ${activeTab === tab ? 'bg-amber-500 text-white' : 'border border-white/10 text-slate-400'}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </nav>

      {activeTab === 'Timetable' && <TimetableTab classes={classes} />}
      {activeTab === 'Assignments' && <AssignmentsTab assignments={assignments} />}
      {activeTab === 'Exams & Results' && <ExamsTab exams={exams} resultByExam={resultByExam} openResult={openResult} semesters={semesters} />}
      {activeTab === 'Exercise' && <ExerciseManagerTab studentId={studentId} />}
      {activeTab === 'Activity' && <ActivityTab activity={activity} />}

      {editing && <EditStudentPanel student={student} onClose={() => setEditing(false)} onSaved={loadDetail} />}
      <Modal isOpen={Boolean(resultExam)} onClose={() => setResultExam(null)} title="Exam Result">
        <form onSubmit={saveResult} className="space-y-4">
          <div className="rounded-xl border border-white/10 p-3"><p className="font-semibold">{resultExam?.subject}</p><p className="muted">{resultExam?.exam_type} · {dateLabel(resultExam?.exam_date)}</p></div>
          <Field label="Score"><input className="input" type="number" min="0" max="100" required value={resultForm.score} onChange={e => setResultForm({ ...resultForm, score: e.target.value })} /></Field>
          <Field label="Grade"><select className="input" value={resultForm.grade} onChange={e => setResultForm({ ...resultForm, grade: e.target.value })}>{['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'F'].map(grade => <option key={grade}>{grade}</option>)}</select></Field>
          <Field label="Remarks"><textarea className="input min-h-24" value={resultForm.remarks} onChange={e => setResultForm({ ...resultForm, remarks: e.target.value })} /></Field>
          <button className="manager-primary-btn w-full">Save Result</button>
        </form>
      </Modal>
    </main>
  )
}

function TimetableTab({ classes }) {
  return <section className="grid gap-4 md:grid-cols-5">{days.map(day => {
    const items = classes.filter(c => c.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
    return <div key={day} className="card min-h-[320px]"><h2 className="mb-4 font-semibold">{day}</h2>{items.length === 0 ? <p className="muted">Free day</p> : <div className="space-y-3">{items.map(item => <article key={item.id} className="rounded-xl border border-white/10 p-3"><ClassTypeBadge type={item.class_type} /><p className="mt-2 font-semibold">{item.subject}</p><p className="muted">{formatTime(item.start_time)} - {formatTime(item.end_time)}</p><p className="muted">{item.classroom || 'TBA'} · {item.lecturer || 'TBA'}</p></article>)}</div>}</div>
  })}</section>
}

function AssignmentsTab({ assignments }) {
  const statuses = ['Pending', 'In Progress', 'Done']
  return <section className="grid gap-4 xl:grid-cols-3">{statuses.map(status => <div key={status} className="card min-h-[360px]"><h2 className="mb-4 font-semibold">{status}</h2><div className="space-y-3">{assignments.filter(a => a.status === status).map(item => <article key={item.id} className="rounded-xl border border-white/10 p-3"><div className="mb-2 flex items-start justify-between gap-2"><p className="font-semibold">{item.title}</p><PriorityBadge priority={item.priority} /></div><p className="muted">{item.subject}</p><CountdownBadge deadline={item.deadline} status={item.status} /></article>)}</div></div>)}</section>
}

function ExamsTab({ exams, resultByExam, openResult, semesters = [] }) {
  const { cgpa, totalCredits } = calculateOverallCGPA(semesters)
  return (
    <div className="space-y-6">
      <div className="card border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Award className="h-5 w-5 text-amber-400" /> TAR UMT Academic Standing</h3>
            <p className="text-sm text-slate-400">Calculated across {semesters.length} semester record(s) ({totalCredits} total credit hours)</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-amber-400">{cgpa}</span>
            <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold">Cumulative CGPA</span>
          </div>
        </div>
      </div>

      {semesters.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white">Semester Academic Records</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            {semesters.map(sem => (
              <div key={sem.id} className="card">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="font-bold text-white">{sem.name}</h4>
                  <span className="text-sm font-semibold text-amber-400">GPA: {sem.gpa ?? '-'}</span>
                </div>
                <div className="space-y-2">
                  {(sem.courses || []).map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <p className="font-medium text-white">{c.course_code ? `${c.course_code} - ` : ''}{c.course_name}</p>
                        <p className="text-xs text-slate-400">{c.credit_hours} Credits</p>
                      </div>
                      <span className="rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300">{c.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        {exams.map(exam => {
          const result = resultByExam.get(exam.id)
          const isPast = daysFromToday(exam.exam_date) < 0
          return <article key={exam.id} className="card"><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{exam.subject}</h3><p className="muted">{exam.exam_type} · {dateLabel(exam.exam_date)} · {exam.venue || 'TBA'}</p></div>{isPast && <button className="manager-primary-btn px-4 py-2 text-sm" onClick={() => openResult(exam)}>{result ? 'Edit Result' : 'Add Result'}</button>}</div>{result && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3"><span className={`mr-3 text-2xl font-bold ${Number(result.score) >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>{result.score}</span><span className="rounded-full bg-theme-500/20 px-2 py-0.5 text-sm font-semibold text-theme-300">{result.grade}</span>{result.remarks && <p className="muted mt-2 italic">{result.remarks}</p>}</div>}</article>
        })}
      </section>
    </div>
  )
}

function ActivityTab({ activity }) {
  return <section className="card"><div className="space-y-3">{activity.length === 0 ? <p className="muted">No activity yet.</p> : activity.map(item => <article key={item.id} className="flex gap-3 rounded-xl border border-white/10 p-3"><span className="mt-2 h-2 w-2 rounded-full bg-amber-400" /><div><p className="text-sm">{item.action} {item.entity_name && <span className="text-slate-300">"{item.entity_name}"</span>}</p><p className="text-xs text-slate-500">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p></div></article>)}</div></section>
}

function ExerciseManagerTab({ studentId }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [weeklyGoal, setWeeklyGoal] = useState(4)
  const [xpTotal, setXpTotal] = useState(0)
  const [freezesAvailable, setFreezesAvailable] = useState(1)

  useEffect(() => {
    let active = true
    async function loadExercise() {
      setLoading(true)
      const data = await fetchExerciseData(studentId)
      if (!active) return
      setLogs(data.logs || [])
      setWeeklyGoal(data.weeklyGoal || 4)
      setXpTotal(data.xpTotal || 0)
      setFreezesAvailable(data.freezesAvailable || 1)
      setLoading(false)
    }
    loadExercise()
    return () => { active = false }
  }, [studentId])

  const stats = useMemo(
    () => calculateStreakAndStats(logs, weeklyGoal, freezesAvailable, getTodayStr(), xpTotal),
    [logs, weeklyGoal, freezesAvailable, xpTotal]
  )
  const levelInfo = useMemo(() => getLevelInfo(xpTotal, t), [xpTotal, t])

  if (loading) {
    return <div className="card space-y-3"><div className="skeleton h-20 rounded-xl" /><div className="skeleton h-40 rounded-xl" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-orange-400">Current Streak</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.currentStreak} <span className="text-sm font-normal text-slate-400">days</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400">Longest Streak</p>
              <p className="text-xl font-bold text-white mt-1">{stats.longestStreak} days</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-300">Weekly Goal Progress</span>
            <span className="font-bold text-orange-400">{stats.weeklyCount} / {weeklyGoal} days</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
            <Shield className="h-4 w-4" />
            <span>Streak Freezes Available: {freezesAvailable}</span>
          </div>
        </div>

        <div className="card border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-purple-400">Level {levelInfo.level}</p>
              <p className="text-xl font-bold text-white mt-1">{levelInfo.title}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400">Total XP</p>
              <p className="text-3xl font-black text-purple-400 mt-1">{xpTotal}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-white/10">Read-only student exercise summary</p>
        </div>
      </div>

      <section className="card">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-400" /> Milestone Badges
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.badgeStatuses.map(b => (
            <div
              key={b.id}
              className={`rounded-xl border p-3 flex items-center gap-2.5 ${
                b.unlocked ? 'border-amber-500/40 bg-amber-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-500 opacity-60'
              }`}
            >
              <span className="text-xl">{b.icon}</span>
              <div>
                <p className="text-xs font-semibold">{t ? t(b.titleKey) : b.titleKey}</p>
                <p className="text-[10px]">{b.unlocked ? 'Unlocked' : 'Locked'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="text-base font-bold text-white mb-4">Check-in History ({logs.length})</h3>
        {logs.length === 0 ? (
          <p className="muted">No exercise logs recorded by this student.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(l => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{ACTIVITY_ICONS[l.activity_type] || '⚡'}</span>
                  <span className="font-semibold text-white">{l.activity_type || 'Workout'}</span>
                </div>
                <span className="text-xs text-slate-400">{l.log_date}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}
