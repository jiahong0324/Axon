import {
  ArrowLeft, Award, Bell, Bot, Calendar, Check, CheckCircle2, Clock, Copy,
  Download, Dumbbell, Flame, Globe, Image, Info, Layers, MessageSquareText,
  Moon, Palette, Pencil, Search, Settings, Shield, Sliders, Smartphone,
  Sparkles, Sun, Trophy, User, XCircle
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { Link, useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ClassTypeBadge from '../../components/ClassTypeBadge'
import CountdownBadge from '../../components/CountdownBadge'
import EditStudentPanel from '../../components/EditStudentPanel'
import Modal from '../../components/Modal'
import PriorityBadge from '../../components/PriorityBadge'
import { useToast } from '../../components/Toast'
import { useLanguage } from '../../components/LanguageProvider'
import { downloadStudentReport } from '../../lib/generateReport'
import { supabase } from '../../lib/supabase'
import { dateLabel, days, daysFromToday, formatTime, initials, markdownToHtml } from '../../lib/utils'
import { calculateOverallCGPA, calculateSemesterGPA, getAcademicStanding, getGradeBadgeStyle } from '../../lib/tarumtGrading'
import { ACTIVITY_ICONS, calculateStreakAndStats, fetchExerciseData, getLevelInfo, getTodayStr } from '../../lib/exerciseUtils'
import { fetchFullStudentDetail } from '../../lib/manageStudent'
import { isInternalSync, formatActionLabel, formatEntityLabel } from './ManagerActivityPage'

const tabs = ['Timetable', 'Assignments', 'Exams & Results', 'Reminders', 'Exercise', 'Activity', 'AI Chats', 'Settings']
const resultInitial = { score: '', grade: 'A', remarks: '' }

export default function ManagerStudentDetail() {
  const { studentId } = useParams()
  const [student, setStudent] = useState(null)
  const [classes, setClasses] = useState([])
  const [linkedTimetables, setLinkedTimetables] = useState([])
  const [replacementClasses, setReplacementClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [exams, setExams] = useState([])
  const [results, setResults] = useState([])
  const [semesters, setSemesters] = useState([])
  const [reminders, setReminders] = useState([])
  const [studentPreferences, setStudentPreferences] = useState({})
  const [semesterSettings, setSemesterSettings] = useState({ name: '', startDate: '', endDate: '' })
  const [accountInfo, setAccountInfo] = useState(null)
  const [metadata, setMetadata] = useState({})
  const [activity, setActivity] = useState([])
  const [initialChats, setInitialChats] = useState([])
  const [activeTab, setActiveTab] = useState('Timetable')
  const [editing, setEditing] = useState(false)
  const [resultExam, setResultExam] = useState(null)
  const [resultForm, setResultForm] = useState(resultInitial)
  const { showToast } = useToast()

  useEffect(() => { loadDetail() }, [studentId])

  async function loadDetail() {
    try {
      const [
        studentRes,
        classesRes,
        assignmentsRes,
        examsRes,
        resultsRes,
        activityRes,
        semsRes,
        coursesRes,
        remindersRes,
        fullDetail
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', studentId).single(),
        supabase.from('classes').select('*').eq('user_id', studentId),
        supabase.from('assignments').select('*').eq('user_id', studentId).order('deadline'),
        supabase.from('exams').select('*').eq('user_id', studentId).order('exam_date'),
        supabase.from('exam_results').select('*').eq('student_id', studentId),
        supabase.from('activity_log').select('*').eq('user_id', studentId).order('created_at', { ascending: false }),
        supabase.from('student_semesters').select('*').eq('user_id', studentId).order('created_at'),
        supabase.from('student_semester_courses').select('*').eq('user_id', studentId).order('created_at'),
        supabase.from('reminders').select('*').eq('user_id', studentId).order('reminder_time'),
        fetchFullStudentDetail(studentId).catch(() => null)
      ])

      setStudent(studentRes.data)
      setClasses(classesRes.data || fullDetail?.classes || [])
      setAssignments(assignmentsRes.data || [])
      setExams(examsRes.data || fullDetail?.exams || [])
      setResults(resultsRes.data || fullDetail?.examResults || [])
      setActivity(activityRes.data || [])

      // Timetables
      let linked = fullDetail?.linkedTimetables || fullDetail?.metadata?.linked_timetables || []
      if (linked.length === 0) {
        try {
          const { data: actLinked } = await supabase
            .from('activity_log')
            .select('entity_name')
            .eq('user_id', studentId)
            .eq('entity_type', 'axon_linked_timetables')
            .order('created_at', { ascending: false })
            .limit(1)

          if (actLinked && actLinked[0]?.entity_name) {
            const parsed = JSON.parse(actLinked[0].entity_name)
            if (Array.isArray(parsed) && parsed.length > 0) {
              linked = parsed
            }
          }
        } catch (e) {}
      }

      if (linked.length === 0 && typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(`axon_linked_timetables_${studentId}`)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed) && parsed.length > 0) linked = parsed
          } catch (e) {}
        }
      }

      setLinkedTimetables(linked)
      setReplacementClasses(fullDetail?.metadata?.replacement_classes || [])

      // Semesters & Results: prioritize fullDetail.examResultsSemesters if populated
      let sems = []
      if (Array.isArray(fullDetail?.examResultsSemesters) && fullDetail.examResultsSemesters.length > 0) {
        sems = fullDetail.examResultsSemesters
      } else if (semsRes.data && semsRes.data.length > 0) {
        sems = semsRes.data.map(s => ({
          ...s,
          courses: (coursesRes.data || []).filter(c => c.semester_id === s.id)
        }))
      }

      // Check activity_log for synced semesters
      if (sems.length === 0) {
        try {
          const { data: actLogs } = await supabase
            .from('activity_log')
            .select('entity_name')
            .eq('user_id', studentId)
            .eq('entity_type', 'axon_exam_results_semesters')
            .order('created_at', { ascending: false })
            .limit(1)

          if (actLogs && actLogs[0]?.entity_name) {
            const parsed = JSON.parse(actLogs[0].entity_name)
            if (Array.isArray(parsed) && parsed.length > 0) {
              sems = parsed
            }
          }
        } catch (e) {}
      }

      // Local storage fallback for this student
      if (sems.length === 0 && typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(`axon_exam_results_semesters_${studentId}`) || localStorage.getItem('axon_exam_results_semesters')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed) && parsed.length > 0) sems = parsed
          } catch (e) {}
        }
      }

      setSemesters(sems)

      // Reminders
      const loadedReminders = (remindersRes.data && remindersRes.data.length > 0)
        ? remindersRes.data
        : (fullDetail?.reminders || [])
      setReminders(loadedReminders)

      // Settings & Preferences
      const rawPrefs = fullDetail?.preferences || fullDetail?.metadata?.preferences || {}
      setStudentPreferences(rawPrefs)

      const semSettings = fullDetail?.semesterSettings || {
        name: fullDetail?.metadata?.semester_name || rawPrefs.axon_semester_name || '',
        startDate: fullDetail?.metadata?.semester_start_date || rawPrefs.axon_semester_start_date || '',
        endDate: fullDetail?.metadata?.semester_end_date || rawPrefs.axon_semester_end_date || ''
      }
      setSemesterSettings(semSettings)

      setAccountInfo(fullDetail?.accountInfo || null)
      setMetadata(fullDetail?.metadata || {})

      // Chats
      if (fullDetail?.chats && fullDetail.chats.length > 0) {
        setInitialChats(fullDetail.chats)
      }
    } catch (err) {
      console.error('loadDetail error:', err)
    }
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
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-bold text-white shadow-md" style={{ background: student.avatar_color || '#F59E0B' }}>{initials(student.full_name || student.email)}</div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{student.full_name || 'Unnamed student'}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                <span className="text-slate-300 font-medium">{student.email}</span>
                <span>•</span>
                <span>ID: {student.student_id || 'N/A'}</span>
                <span>•</span>
                <span>Course: {student.course || 'Not set'}</span>
                {student.university && (
                  <>
                    <span>•</span>
                    <span>Uni: {student.university}</span>
                  </>
                )}
                {student.created_at && (
                  <>
                    <span>•</span>
                    <span>Joined: {format(new Date(student.created_at), 'dd MMM yyyy')}</span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${student.is_active === false ? 'bg-red-500/15 text-red-300 border border-red-500/20' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'}`}>
                  {student.is_active === false ? 'Deactivated' : 'Active Student'}
                </span>
                {student.xp_total !== undefined && (
                  <span className="inline-flex rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-300 border border-purple-500/20">
                    {student.xp_total} Total XP
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit Student</button>
            <button className="manager-primary-btn" onClick={() => downloadStudentReport({ student, classes, assignments, exams, examResults: results, semesters, reminders })}><Download className="h-4 w-4" /> Export PDF Report</button>
          </div>
        </div>
      </header>

      <nav className="scrollbar-hide mb-5 flex gap-2 overflow-x-auto">
        {tabs.map(tab => <button key={tab} className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-medium ${activeTab === tab ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'border border-white/10 text-slate-400 hover:text-white'}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </nav>

      {activeTab === 'Timetable' && (
        <TimetableTab
          classes={classes}
          linkedTimetables={linkedTimetables}
          replacementClasses={replacementClasses}
        />
      )}
      {activeTab === 'Assignments' && <AssignmentsTab assignments={assignments} />}
      {activeTab === 'Exams & Results' && (
        <ExamsTab
          exams={exams}
          resultByExam={resultByExam}
          openResult={openResult}
          semesters={semesters}
        />
      )}
      {activeTab === 'Reminders' && <RemindersTab reminders={reminders} />}
      {activeTab === 'Exercise' && <ExerciseManagerTab studentId={studentId} />}
      {activeTab === 'Activity' && <ActivityTab activity={activity} />}
      {activeTab === 'AI Chats' && (
        <StudentAIChatsTab
          studentId={studentId}
          student={student}
          initialChats={initialChats}
        />
      )}
      {activeTab === 'Settings' && (
        <StudentSettingsTab
          student={student}
          preferences={studentPreferences}
          semesterSettings={semesterSettings}
          accountInfo={accountInfo}
          metadata={metadata}
        />
      )}

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

function TimetableTab({ classes = [], linkedTimetables = [], replacementClasses = [] }) {
  const [selectedTimetableId, setSelectedTimetableId] = useState('main')

  const mainClasses = useMemo(() => {
    return [...classes, ...(replacementClasses || [])]
  }, [classes, replacementClasses])

  const { currentName, currentClasses, isMain } = useMemo(() => {
    if (selectedTimetableId === 'main') {
      return {
        currentName: 'Primary Main Timetable',
        currentClasses: mainClasses,
        isMain: true
      }
    }
    const found = linkedTimetables.find(p => p.id === selectedTimetableId)
    return {
      currentName: found?.name || 'Linked Timetable',
      currentClasses: found?.classes || [],
      isMain: false
    }
  }, [selectedTimetableId, mainClasses, linkedTimetables])

  const totalClasses = currentClasses.length

  const studentDisplayedDays = useMemo(() => {
    return days.filter(day => currentClasses.some(c => c.day?.toLowerCase() === day.toLowerCase()))
  }, [currentClasses])

  const managerGridColsClass = useMemo(() => {
    const count = studentDisplayedDays.length
    if (count <= 1) return 'grid-cols-1 max-w-lg'
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-3xl'
    if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    if (count === 5) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
    if (count === 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7'
  }, [studentDisplayedDays.length])

  return (
    <div className="space-y-4">
      {/* Timetable Selector Bar */}
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            <span>Timetable Profiles</span>
            <span className="text-xs font-normal text-slate-400">
              ({1 + linkedTimetables.length} total)
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Switch between the student's primary schedule and additional / linked timetables.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedTimetableId('main')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              selectedTimetableId === 'main'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>Primary Timetable</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              selectedTimetableId === 'main' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
            }`}>
              {mainClasses.length}
            </span>
          </button>

          {linkedTimetables.map(profile => {
            const isSelected = selectedTimetableId === profile.id
            const count = (profile.classes || []).length
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelectedTimetableId(profile.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white'
                }`}
              >
                <span>{profile.name || 'Unnamed Timetable'}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span>Viewing: <strong className="text-slate-200">{currentName}</strong> ({totalClasses} scheduled classes)</span>
        {!isMain && <span className="text-amber-400/90 font-medium">★ Secondary / Linked Timetable</span>}
      </div>

      {studentDisplayedDays.length === 0 ? (
        <div className="card py-12 text-center text-slate-400">
          <p className="text-sm">No scheduled classes found for this timetable.</p>
        </div>
      ) : (
        <section className={`grid gap-4 ${managerGridColsClass}`}>
          {studentDisplayedDays.map(day => {
            const items = currentClasses
              .filter(c => c.day?.toLowerCase() === day.toLowerCase())
              .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

            return (
              <div key={day} className="card min-h-[320px] flex flex-col">
                <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
                  <h2 className="font-bold text-white text-sm">{day}</h2>
                  <span className="text-[11px] font-semibold text-slate-400">{items.length} {items.length === 1 ? 'class' : 'classes'}</span>
                </div>
                {items.length === 0 ? (
                  <div className="my-auto text-center py-8">
                    <p className="text-xs text-slate-500">Free day</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((item, idx) => (
                      <article
                        key={item.id || idx}
                        className={`rounded-xl border p-3 transition-colors ${
                          item.is_replacement
                            ? 'border-orange-500/30 bg-orange-500/5'
                            : 'border-white/10 bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <ClassTypeBadge type={item.class_type} />
                          {item.is_replacement && (
                            <span className="rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300">
                              Replacement {item.date ? `· ${item.date}` : ''}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-white text-sm leading-snug">{item.subject}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {item.classroom || 'TBA'} · {item.lecturer || 'TBA'}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

function AssignmentsTab({ assignments }) {
  const statuses = ['Pending', 'In Progress', 'Done']
  return <section className="grid gap-4 xl:grid-cols-3">{statuses.map(status => <div key={status} className="card min-h-[360px]"><h2 className="mb-4 font-semibold">{status}</h2><div className="space-y-3">{assignments.filter(a => a.status === status).map(item => <article key={item.id} className="rounded-xl border border-white/10 p-3"><div className="mb-2 flex items-start justify-between gap-2"><p className="font-semibold">{item.title}</p><PriorityBadge priority={item.priority} /></div><p className="muted">{item.subject}</p><CountdownBadge deadline={item.deadline} status={item.status} /></article>)}</div></div>)}</section>
}

function ExamsTab({ exams = [], resultByExam, openResult, semesters = [] }) {
  const { cgpa, overallCredits } = calculateOverallCGPA(semesters)
  const standing = getAcademicStanding(cgpa, overallCredits)

  return (
    <div className="space-y-6">
      {/* TAR UMT Academic Standing Hero Card (Parity with Student View) */}
      <div className="card border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" /> TAR UMT Academic Standing
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                {standing.title}
              </span>
              <span className="text-xs font-semibold text-slate-400">· {standing.badge}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{standing.description}</p>
            <p className="text-xs text-slate-400 mt-1">
              Calculated across {semesters.length} semester record(s) ({overallCredits} total credit hours)
            </p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-amber-400 tracking-tight">{cgpa}</span>
            <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold">Cumulative CGPA</span>
          </div>
        </div>
      </div>

      {/* Semester Academic Records */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Semester Academic Records ({semesters.length})</h3>
          <span className="text-xs text-slate-400">Official student grade slip records</span>
        </div>

        {semesters.length === 0 ? (
          <div className="card py-8 text-center border border-white/5 bg-white/[0.02]">
            <Award className="mx-auto mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No Semester Academic Records</p>
            <p className="text-xs text-slate-500 mt-1">
              The student has not yet entered or imported semester examination slips.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {semesters.map(sem => {
              const semStat = calculateSemesterGPA(sem.courses)
              return (
                <div key={sem.id} className="card flex flex-col justify-between">
                  <div>
                    <div className="mb-3.5 flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h4 className="font-bold text-white text-base">{sem.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {sem.courses?.length || 0} Courses · <strong className="text-slate-300">{semStat.totalCredits}</strong> Total Credits
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 px-3 py-1.5 text-emerald-300">
                        <span className="text-[10px] font-bold uppercase tracking-wider">GPA</span>
                        <span className="font-mono text-sm font-black text-emerald-300">{semStat.gpa}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(sem.courses || []).length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">No courses listed in this semester.</p>
                      ) : (
                        (sem.courses || []).map((c, idx) => (
                          <div key={c.id || idx} className="flex items-center justify-between text-sm rounded-xl bg-white/5 px-3 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              {c.course_code && (
                                <span className="font-mono text-xs font-bold uppercase rounded-md bg-white/10 px-2 py-0.5 text-slate-300 shrink-0">
                                  {c.course_code}
                                </span>
                              )}
                              <span className="font-medium text-white truncate">{c.course_name || 'Course'}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-slate-400">{c.credit_hours || 0} Credits</span>
                              <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg font-mono text-xs font-bold border ${getGradeBadgeStyle(c.grade)}`}>
                                {c.grade || '-'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Scheduled Timetable Exams & Assessment Scores */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" /> Scheduled Timetable Exams ({exams.length})
          </h3>
          <span className="text-xs text-slate-500">From student timetable exam schedule</span>
        </div>

        {exams.length === 0 ? (
          <div className="card py-6 text-center">
            <p className="text-xs text-slate-500">No upcoming or past timetable exams scheduled for this student.</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {exams.map(exam => {
              const result = resultByExam.get(exam.id)
              const isPast = daysFromToday(exam.exam_date) < 0
              return (
                <article key={exam.id} className="card">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-white">{exam.subject}</h4>
                      <p className="muted text-xs">{exam.exam_type} · {dateLabel(exam.exam_date)} · {exam.venue || 'TBA'}</p>
                    </div>
                    {isPast && (
                      <button className="manager-primary-btn px-3 py-1.5 text-xs" onClick={() => openResult(exam)}>
                        {result ? 'Edit Score' : 'Add Score'}
                      </button>
                    )}
                  </div>
                  {result && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                      <span className={`mr-3 text-xl font-bold ${Number(result.score) >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.score} marks
                      </span>
                      <span className="rounded-full bg-theme-500/20 px-2 py-0.5 text-xs font-semibold text-theme-300">
                        {result.grade}
                      </span>
                      {result.remarks && <p className="muted mt-2 text-xs italic">{result.remarks}</p>}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function ActivityTab({ activity }) {
  const visible = (activity || []).filter(item => !isInternalSync(item))

  return (
    <section className="card">
      <div className="space-y-3">
        {visible.length === 0 ? (
          <p className="muted py-4 text-center">No student activity records found.</p>
        ) : (
          visible.map(item => {
            const actionLabel = formatActionLabel(item.action)
            const entityLabel = formatEntityLabel(item.entity_name)
            return (
              <article key={item.id} className="flex gap-3 rounded-xl border border-white/10 p-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="text-slate-200">{actionLabel}</span>{' '}
                    {entityLabel && <span className="font-medium text-amber-300">"{entityLabel}"</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}

function ExerciseManagerTab({ studentId }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [weeklyGoal, setWeeklyGoal] = useState(4)
  const [xpTotal, setXpTotal] = useState(0)
  const [freezesAvailable, setFreezesAvailable] = useState(5)
  const [frozenDates, setFrozenDates] = useState([])

  useEffect(() => {
    let active = true
    async function loadExercise() {
      setLoading(true)
      const data = await fetchExerciseData(studentId)
      if (!active) return
      setLogs(data.logs || [])
      setWeeklyGoal(data.weeklyGoal || 4)
      setXpTotal(data.xpTotal || 0)
      setFreezesAvailable(data.freezesAvailable || 0)
      setFrozenDates(data.frozenDates || [])
      setLoading(false)
    }
    loadExercise()
    return () => { active = false }
  }, [studentId])

  const stats = useMemo(
    () => calculateStreakAndStats(logs, weeklyGoal, freezesAvailable, getTodayStr(), xpTotal, frozenDates),
    [logs, weeklyGoal, freezesAvailable, xpTotal, frozenDates]
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

function StudentAIChatsTab({ studentId, student, initialChats = [] }) {
  const [messages, setMessages] = useState(initialChats)
  const [loading, setLoading] = useState(initialChats.length === 0)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // 'all', 'user', 'assistant'
  const [zoomedImage, setZoomedImage] = useState(null)
  const { showToast } = useToast()

  const loadChats = useCallback(async () => {
    try {
      if (messages.length === 0) setLoading(true)
      const { data, error } = await supabase
        .from('student_ai_chats')
        .select('*')
        .eq('user_id', studentId)
        .eq('is_manager', false)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Merge DB chats with initialChats without duplicates
      const merged = [...(data || [])]
      for (const ic of initialChats) {
        const icContent = (ic.content || '').trim()
        const icRole = ic.role || 'user'
        const exists = merged.some(m =>
          m.role === icRole &&
          ((m.content || '').trim() === icContent || (ic.image && m.image === ic.image))
        )
        if (!exists) {
          merged.push(ic)
        }
      }
      merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      setMessages(merged)
    } catch (err) {
      console.error('Failed to load student AI chats:', err)
      if (initialChats.length > 0) {
        setMessages(initialChats)
      }
    } finally {
      setLoading(false)
    }
  }, [studentId, initialChats, messages.length])

  useEffect(() => {
    if (initialChats.length > 0) {
      setMessages(prev => {
        if (prev.length === 0) return initialChats
        const combined = [...prev]
        for (const ic of initialChats) {
          const exists = combined.some(m =>
            m.role === ic.role &&
            ((m.content || '').trim() === (ic.content || '').trim() || (ic.image && m.image === ic.image))
          )
          if (!exists) combined.push(ic)
        }
        combined.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        return combined
      })
      setLoading(false)
    }
  }, [initialChats])

  useEffect(() => {
    loadChats()

    const channel = supabase
      .channel(`student-ai-chat-live-${studentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_ai_chats',
        filter: `user_id=eq.${studentId}`
      }, () => {
        loadChats()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [studentId, loadChats])

  const filtered = useMemo(() => {
    return messages.filter(m => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const text = (m.content || '').toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [messages, roleFilter, search])

  const userCount = messages.filter(m => m.role === 'user').length
  const aiCount = messages.filter(m => m.role === 'assistant').length
  const imageCount = messages.filter(m => m.image).length
  const lastActive = messages.length > 0 ? formatDistanceToNow(new Date(messages[messages.length - 1].created_at), { addSuffix: true }) : 'Never'

  function copyTranscript() {
    if (messages.length === 0) return
    const text = messages.map(m => {
      const sender = m.role === 'user' ? (student?.full_name || 'Student') : 'AI Academic Tutor'
      const time = format(new Date(m.created_at), 'yyyy-MM-dd HH:mm:ss')
      return `[${time}] ${sender}:\n${m.content}\n`
    }).join('\n---\n\n')

    navigator.clipboard.writeText(text)
    showToast('AI Chat transcript copied to clipboard!', 'success')
  }

  if (loading && messages.length === 0) {
    return (
      <div className="card space-y-4">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-60 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card border-l-4 border-l-amber-500 py-3">
          <p className="text-xs text-slate-400">Total Messages</p>
          <p className="text-xl font-bold text-white">{messages.length}</p>
        </div>
        <div className="card border-l-4 border-l-purple-500 py-3">
          <p className="text-xs text-slate-400">Questions Asked</p>
          <p className="text-xl font-bold text-white">{userCount}</p>
        </div>
        <div className="card border-l-4 border-l-blue-500 py-3">
          <p className="text-xs text-slate-400">Images Uploaded</p>
          <p className="text-xl font-bold text-white">{imageCount}</p>
        </div>
        <div className="card border-l-4 border-l-emerald-500 py-3">
          <p className="text-xs text-slate-400">Last Interaction</p>
          <p className="text-sm font-semibold text-emerald-300 truncate">{lastActive}</p>
        </div>
      </div>

      {/* Filter and Action Header */}
      <div className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search chat content or keywords..."
              className="input pl-9 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 rounded-xl border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${roleFilter === 'all' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All ({messages.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('user')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${roleFilter === 'user' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Student ({userCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('assistant')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${roleFilter === 'assistant' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              AI Answers ({aiCount})
            </button>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={copyTranscript}
            className="btn-ghost shrink-0 text-xs border border-white/10"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Transcript
          </button>
        )}
      </div>

      {/* Messages Feed */}
      {filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <Bot className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-base font-semibold text-slate-300">
            {messages.length === 0 ? 'No AI conversations logged for this student yet.' : 'No messages match your search or filter.'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {messages.length === 0
              ? 'When this student asks the AI Study Helper questions, uploads notes/diagrams, or generates study timetables, their complete dialogue will sync here in real time.'
              : 'Try clearing the search query or switching filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((msg, i) => {
            const isUser = msg.role === 'user'
            const msgDate = new Date(msg.created_at)
            return (
              <div
                key={msg.id || i}
                className={`rounded-2xl border p-4 transition-colors ${
                  isUser
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                {/* Message Header */}
                <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2.5">
                    {isUser ? (
                      <div
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                        style={{ background: student?.avatar_color || '#F59E0B' }}
                      >
                        {initials(student?.full_name || student?.email || 'S')}
                      </div>
                    ) : (
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-theme-500 to-purple-600 text-white">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-semibold text-white">
                        {isUser ? (student?.full_name || 'Student') : 'AI Academic Tutor'}
                      </span>
                      <span className={`ml-2 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        isUser ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {isUser ? 'Student Question' : 'AI Response'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block" title={format(msgDate, 'yyyy-MM-dd HH:mm:ss')}>
                      {format(msgDate, 'dd MMM, hh:mm a')}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatDistanceToNow(msgDate, { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Attached Image if any */}
                {msg.image && (
                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <Image className="h-3 w-3" /> Attached Study Image / Document:
                    </p>
                    <button
                      type="button"
                      onClick={() => setZoomedImage(msg.image)}
                      className="group relative overflow-hidden rounded-xl border border-white/20 max-w-sm transition-transform hover:scale-[1.01]"
                    >
                      <img
                        src={msg.image}
                        alt="Student query attachment"
                        className="max-h-56 w-auto object-cover rounded-xl"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white font-medium transition-opacity">
                        Click to view full image
                      </div>
                    </button>
                  </div>
                )}

                {/* Content */}
                {isUser ? (
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                ) : (
                  <div
                    className="ai-formatted-content text-sm text-slate-300 leading-relaxed overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox Modal for Zoomed Image */}
      {zoomedImage && (
        <Modal isOpen={Boolean(zoomedImage)} onClose={() => setZoomedImage(null)} title="Attached Study Image">
          <div className="flex flex-col items-center">
            <img
              src={zoomedImage}
              alt="Uploaded study question"
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              className="btn-ghost mt-4 border border-white/10"
              onClick={() => setZoomedImage(null)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function RemindersTab({ reminders = [] }) {
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'inactive'
  const [search, setSearch] = useState('')

  const activeCount = useMemo(() => reminders.filter(r => r.is_active).length, [reminders])
  const inactiveCount = useMemo(() => reminders.filter(r => !r.is_active).length, [reminders])
  const recurringCount = useMemo(() => reminders.filter(r => r.repeat_type && r.repeat_type !== 'once').length, [reminders])

  const filtered = useMemo(() => {
    return reminders.filter(r => {
      if (filter === 'active' && !r.is_active) return false
      if (filter === 'inactive' && r.is_active) return false
      if (search.trim()) {
        const query = search.toLowerCase()
        const titleMatch = (r.title || '').toLowerCase().includes(query)
        const timeMatch = (r.reminder_time || '').toLowerCase().includes(query)
        const repeatMatch = (r.repeat_type || '').toLowerCase().includes(query)
        return titleMatch || timeMatch || repeatMatch
      }
      return true
    })
  }, [reminders, filter, search])

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Total Reminders</p>
              <p className="text-2xl font-bold text-white mt-1">{reminders.length}</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400 border border-amber-500/20">
              <Bell className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Configured in student workspace</p>
        </div>

        <div className="card border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-400">Active Alarms</p>
              <p className="text-2xl font-bold text-white mt-1">{activeCount}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Currently enabled & triggering alerts</p>
        </div>

        <div className="card border-l-4 border-l-slate-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Paused / Off</p>
              <p className="text-2xl font-bold text-white mt-1">{inactiveCount}</p>
            </div>
            <div className="rounded-xl bg-slate-500/10 p-2.5 text-slate-400 border border-white/10">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Temporarily disabled by student</p>
        </div>

        <div className="card border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-purple-400">Recurring</p>
              <p className="text-2xl font-bold text-white mt-1">{recurringCount}</p>
            </div>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400 border border-purple-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Daily or weekly schedule loops</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            All ({reminders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === 'active'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('inactive')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === 'inactive'
                ? 'bg-slate-600 text-white shadow-md'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            Paused ({inactiveCount})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input !py-1.5 !pl-9 text-xs"
            placeholder="Search reminders or time..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Reminders Grid */}
      {filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bell className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-white">No Reminders Found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {reminders.length === 0
              ? 'This student has not configured any personal study reminders or scheduled alarms in their Axon account yet.'
              : 'No reminders match your current search or status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(r => {
            const isRecurring = r.repeat_type && r.repeat_type !== 'once'
            return (
              <div
                key={r.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                  r.is_active
                    ? 'border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/40'
                    : 'border-white/10 bg-white/[0.01] opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                          r.is_active
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                            : 'bg-white/5 text-slate-500 border border-white/10'
                        }`}
                      >
                        <Bell className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-bold text-white line-clamp-2">
                        {r.title || 'Untitled Reminder'}
                      </h4>
                    </div>

                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        r.is_active
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                          : 'bg-slate-500/15 text-slate-400 border-white/10'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${r.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {r.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      {formatTime(r.reminder_time) || 'No time set'}
                    </span>

                    <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium capitalize border ${
                      isRecurring
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                        : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                    }`}>
                      {r.repeat_type || 'once'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>ID: {r.id ? r.id.slice(0, 8) + '...' : 'N/A'}</span>
                  <span>
                    {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : 'Saved'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StudentSettingsTab({ student, preferences = {}, semesterSettings = {}, accountInfo = null, metadata = {} }) {
  const { showToast } = useToast()
  const [copiedId, setCopiedId] = useState(false)

  // Merge defaults from DEFAULT_PREFERENCES
  const prefs = useMemo(() => {
    return {
      axon_notify_minutes: '10',
      axon_class_notify: 'true',
      axon_exam_notify: 'true',
      assignmentReminders: 'true',
      examAlerts: 'true',
      reminderLeadTime: '3 days',
      aiLanguage: 'English',
      aiStyle: 'Casual',
      dailyTipEnabled: 'true',
      firstDay: 'Monday',
      timeFormat: '24hr',
      theme: 'dark',
      accentColor: student?.avatar_color || 'blue',
      fontSize: 'medium',
      fontFamily: 'sans',
      compactMode: 'false',
      appLanguage: 'en',
      axon_attendance_notify: 'false',
      axon_attendance_minutes: '10',
      ...preferences
    }
  }, [preferences, student])

  const copyStudentId = () => {
    const idToCopy = student?.id || accountInfo?.id
    if (idToCopy) {
      navigator.clipboard?.writeText(idToCopy)
      setCopiedId(true)
      showToast('Student UUID copied to clipboard!', 'success')
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  // Accent color hex
  const accentHex = {
    blue: '#3B82F6',
    purple: '#8B5CF6',
    green: '#10B981',
    cyan: '#06B6D4',
    orange: '#F97316',
    red: '#EF4444',
    pink: '#EC4899'
  }[prefs.accentColor] || prefs.accentColor || '#3B82F6'

  return (
    <div className="space-y-6">
      {/* Banner / Info Header */}
      <div className="card border-l-4 border-l-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-400" />
            <span>Student Configured Settings & Preferences</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Complete read-only inspection of this student's notification preferences, semester dates, theme, and AI tutor configuration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
            <Shield className="h-3.5 w-3.5" /> Manager Inspection Mode
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Academic & Semester Configuration */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" /> Academic & Semester Setup
            </h4>
            <span className="text-[11px] text-slate-400">TAR UMT Academic Cycle</span>
          </div>

          <div className="space-y-3">
            <SettingRow
              label="Current Semester Name"
              value={semesterSettings.name || metadata.semester_name || prefs.axon_semester_name || 'Not configured'}
              badge={Boolean(semesterSettings.name || metadata.semester_name || prefs.axon_semester_name)}
            />

            <SettingRow
              label="Semester Start Date"
              value={semesterSettings.startDate || metadata.semester_start_date || prefs.axon_semester_start_date || 'Not set'}
              description="Beginning of current academic term"
            />

            <SettingRow
              label="Semester End Date"
              value={semesterSettings.endDate || metadata.semester_end_date || prefs.axon_semester_end_date || 'Not set'}
              description="Official conclusion / finals cutoff"
            />

            <SettingRow
              label="Weekly Exercise Habit Goal"
              value={`${metadata.axon_weekly_goal || prefs.axon_weekly_goal || 3} days / week`}
              badge={true}
              badgeColor="orange"
            />

            <SettingRow
              label="First Day of Week"
              value={prefs.firstDay || 'Monday'}
            />
          </div>
        </div>

        {/* Section 2: Notification & Alert Preferences */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-400" /> Notification & Alert Preferences
            </h4>
            <span className="text-[11px] text-slate-400">Background Alerts</span>
          </div>

          <div className="space-y-3">
            <SettingToggleRow
              label="Assignment Deadline Reminders"
              enabled={prefs.assignmentReminders !== 'false'}
              description="Alerts before coursework submissions"
            />

            <SettingToggleRow
              label="Exam Starts & Date Alerts"
              enabled={prefs.examAlerts !== 'false'}
              description="Notifications for scheduled assessments"
            />

            <SettingRow
              label="Deadline Alert Lead Time"
              value={prefs.reminderLeadTime || '3 days'}
              badge={true}
              badgeColor="emerald"
            />

            <SettingToggleRow
              label="Class Start Notifications"
              enabled={prefs.axon_class_notify !== 'false'}
              description="Alerts before live timetable lectures"
            />

            <SettingRow
              label="Class Alert Lead Time"
              value={`${prefs.axon_notify_minutes || '10'} minutes before class`}
            />

            <SettingToggleRow
              label="Attendance Code Reminders"
              enabled={prefs.axon_attendance_notify === 'true'}
              description="Prompt to scan TAR UMT attendance QR code"
            />

            <SettingRow
              label="Attendance Alert Lead Time"
              value={`${prefs.axon_attendance_minutes || '10'} minutes before class ends`}
            />
          </div>
        </div>

        {/* Section 3: Appearance & UI Preferences */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette className="h-4 w-4 text-purple-400" /> Interface & Theme Customization
            </h4>
            <span className="text-[11px] text-slate-400">UI Styles</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div>
                <p className="text-xs font-semibold text-slate-200">Theme Mode</p>
                <p className="text-[11px] text-slate-500">Workspace brightness scheme</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 capitalize border border-white/10">
                {prefs.theme === 'light' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-blue-400" />}
                <span>{prefs.theme || 'dark'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div>
                <p className="text-xs font-semibold text-slate-200">Accent Color</p>
                <p className="text-[11px] text-slate-500">Highlights and active buttons</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 capitalize border border-white/10">
                <span className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ background: accentHex }} />
                <span>{prefs.accentColor || 'blue'}</span>
              </div>
            </div>

            <SettingRow
              label="Font Size"
              value={prefs.fontSize || 'medium'}
            />

            <SettingRow
              label="Font Family / Typography"
              value={prefs.fontFamily || 'sans'}
            />

            <SettingToggleRow
              label="Compact Mode"
              enabled={prefs.compactMode === 'true'}
              description="High-density list spacing"
            />

            <SettingRow
              label="Interface Language"
              value={prefs.appLanguage === 'zh' ? '中文 (Simplified Chinese)' : 'English (en)'}
              badge={true}
              badgeColor="purple"
            />

            <SettingRow
              label="Time Display Format"
              value={prefs.timeFormat === '12hr' ? '12-Hour Clock (AM/PM)' : '24-Hour Clock (Standard)'}
            />
          </div>
        </div>

        {/* Section 4: AI Academic Assistant Configuration */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Bot className="h-4 w-4 text-cyan-400" /> AI Study Tutor Configuration
            </h4>
            <span className="text-[11px] text-slate-400">Groq LLM Persona</span>
          </div>

          <div className="space-y-3">
            <SettingRow
              label="AI Response Language"
              value={prefs.aiLanguage || 'English'}
              badge={true}
              badgeColor="cyan"
              description="Primary language for answers & explanations"
            />

            <SettingRow
              label="AI Explanatory Tone"
              value={prefs.aiStyle || 'Casual'}
              badge={true}
              description="Tutor communication style (Casual, Formal, etc.)"
            />

            <SettingToggleRow
              label="Auto-generate Daily Tip"
              enabled={prefs.dailyTipEnabled !== 'false'}
              description="Daily academic insight on dashboard"
            />

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400 leading-relaxed">
              <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-cyan-400" /> AI System Access Scope:
              </p>
              The AI Study Helper incorporates the student's timetable classes, active reminders, assignment deadlines, and TAR UMT courses when answering study questions.
            </div>
          </div>
        </div>

        {/* Section 5: Account & System Audit */}
        <div className="card space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="h-4 w-4 text-amber-400" /> Account Security & Profile Audit
            </h4>
            <span className="text-[11px] text-slate-400">Supabase Auth Record</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">Student UUID</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-mono text-xs text-slate-300 truncate" title={student?.id || accountInfo?.id}>
                  {student?.id || accountInfo?.id || 'N/A'}
                </p>
                <button
                  type="button"
                  onClick={copyStudentId}
                  className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Copy UUID"
                >
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">Registered Email</p>
              <p className="mt-1 text-xs font-semibold text-white truncate">
                {student?.email || accountInfo?.email || 'N/A'}
              </p>
              <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold ${
                accountInfo?.email_confirmed_at ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {accountInfo?.email_confirmed_at ? '✓ Email Confirmed' : '• Verification Pending'}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">Last Active Sign In</p>
              <p className="mt-1 text-xs font-semibold text-white">
                {accountInfo?.last_sign_in_at
                  ? format(new Date(accountInfo.last_sign_in_at), 'dd MMM yyyy, hh:mm a')
                  : 'No login record'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {accountInfo?.last_sign_in_at
                  ? formatDistanceToNow(new Date(accountInfo.last_sign_in_at), { addSuffix: true })
                  : '-'}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">Account Created</p>
              <p className="mt-1 text-xs font-semibold text-white">
                {student?.created_at
                  ? format(new Date(student.created_at), 'dd MMM yyyy')
                  : 'N/A'}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">University & Campus</p>
              <p className="mt-1 text-xs font-semibold text-white truncate">
                {student?.university || 'TAR UMT'}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">Course & Student ID</p>
              <p className="mt-1 text-xs font-semibold text-white truncate">
                {student?.course || 'Not set'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                ID: {student?.student_id || 'Not set'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, value, description, badge = false, badgeColor = 'amber' }) {
  const badgeClasses = {
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
    orange: 'bg-orange-500/15 text-orange-300 border-orange-500/20'
  }[badgeColor] || 'bg-amber-500/15 text-amber-300 border-amber-500/20'

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-200">{label}</p>
        {description && <p className="text-[11px] text-slate-500">{description}</p>}
      </div>
      <div className="shrink-0">
        {badge ? (
          <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold border ${badgeClasses}`}>
            {value}
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-300">{value}</span>
        )}
      </div>
    </div>
  )
}

function SettingToggleRow({ label, enabled, description }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-200">{label}</p>
        {description && <p className="text-[11px] text-slate-500">{description}</p>}
      </div>
      <span
        className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
          enabled
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
            : 'bg-slate-500/15 text-slate-400 border-white/10'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  )
}

