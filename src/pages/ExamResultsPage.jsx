import { useState, useEffect } from 'react'
import { Plus, Trash2, Sparkles, Calculator, BookOpen, Award, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useConfirmDialog } from '../components/ConfirmModal'
import Modal from '../components/Modal'
import ImageUploadAnalyzer from '../components/ImageUploadAnalyzer'
import { TARUMT_GRADES, getGradePoint, calculateSemesterGPA, calculateOverallCGPA } from '../lib/tarumtGrading'

function createDefaultThreeCourses(semId) {
  return [
    { id: `course-${Date.now()}-1`, semester_id: semId, course_code: '', course_name: '', credit_hours: '', grade: '' },
    { id: `course-${Date.now()}-2`, semester_id: semId, course_code: '', course_name: '', credit_hours: '', grade: '' },
    { id: `course-${Date.now()}-3`, semester_id: semId, course_code: '', course_name: '', credit_hours: '', grade: '' }
  ]
}

export default function ExamResultsPage() {
  const [activeTab, setActiveTab] = useState('records') // 'records' | 'calculator'
  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [newSemesterName, setNewSemesterName] = useState('')
  const [showAddSemModal, setShowAddSemModal] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [targetSemesterId, setTargetSemesterId] = useState(null)

  // Quick Calculator State (defaults to 3 empty rows)
  const [calcRows, setCalcRows] = useState([
    { id: 1, name: '', credits: '', grade: '' },
    { id: 2, name: '', credits: '', grade: '' },
    { id: 3, name: '', credits: '', grade: '' }
  ])

  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  useEffect(() => {
    loadSemesters()
  }, [])

  async function loadSemesters() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const cached = localStorage.getItem('axon_exam_results_semesters')
      if (cached) {
        const parsed = JSON.parse(cached)
        setSemesters(parsed.map(s => ({
          ...s,
          courses: (s.courses && s.courses.length > 0) ? s.courses : createDefaultThreeCourses(s.id)
        })))
      } else {
        const defaultSem = [{
          id: 'sem-1',
          name: 'Year 1 Semester 1',
          courses: createDefaultThreeCourses('sem-1')
        }]
        setSemesters(defaultSem)
        localStorage.setItem('axon_exam_results_semesters', JSON.stringify(defaultSem))
      }
      setLoading(false)
      return
    }

    const { data: semsData } = await supabase
      .from('student_semesters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')

    const { data: coursesData } = await supabase
      .from('student_semester_courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')

    if (semsData && coursesData) {
      const merged = semsData.map(s => {
        const semCourses = coursesData.filter(c => c.semester_id === s.id)
        return {
          ...s,
          courses: semCourses.length > 0 ? semCourses : createDefaultThreeCourses(s.id)
        }
      })
      setSemesters(merged)
      localStorage.setItem('axon_exam_results_semesters', JSON.stringify(merged))
    } else {
      const cached = localStorage.getItem('axon_exam_results_semesters')
      if (cached) {
        const parsed = JSON.parse(cached)
        setSemesters(parsed.map(s => ({
          ...s,
          courses: (s.courses && s.courses.length > 0) ? s.courses : createDefaultThreeCourses(s.id)
        })))
      } else {
        const defaultSem = [{
          id: 'sem-1',
          name: 'Year 1 Semester 1',
          courses: createDefaultThreeCourses('sem-1')
        }]
        setSemesters(defaultSem)
        localStorage.setItem('axon_exam_results_semesters', JSON.stringify(defaultSem))
      }
    }
    setLoading(false)
  }

  function saveSemestersToLocal(list) {
    setSemesters(list)
    localStorage.setItem('axon_exam_results_semesters', JSON.stringify(list))
  }

  async function handleCreateSemester(e) {
    e?.preventDefault()
    if (!newSemesterName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const newSem = {
      id: `sem-${Date.now()}`,
      name: newSemesterName.trim(),
      courses: []
    }

    if (user) {
      const { data } = await supabase
        .from('student_semesters')
        .insert({ user_id: user.id, name: newSemesterName.trim() })
        .select()
        .single()
      if (data) newSem.id = data.id
    }

    const default3 = createDefaultThreeCourses(newSem.id)
    newSem.courses = default3

    if (user && newSem.id && !newSem.id.startsWith('sem-')) {
      for (const row of default3) {
        await supabase.from('student_semester_courses').insert({
          semester_id: newSem.id,
          user_id: user.id,
          course_code: '',
          course_name: '',
          credit_hours: 0,
          grade: ''
        })
      }
    }

    const nextList = [...semesters, newSem]
    saveSemestersToLocal(nextList)
    setNewSemesterName('')
    setShowAddSemModal(false)
    showToast('Semester added successfully.', 'success')
  }

  async function handleDeleteSemester(semId) {
    if (!await confirm({ title: 'Delete Semester?', message: 'All courses inside this semester will be removed.' })) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('student_semesters').delete().eq('id', semId)
    }
    const nextList = semesters.filter(s => s.id !== semId)
    saveSemestersToLocal(nextList)
    showToast('Semester deleted.', 'success')
  }

  async function handleAddCourse(semId, course) {
    const { data: { user } } = await supabase.auth.getUser()
    const newCourse = {
      id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      semester_id: semId,
      course_code: course?.course_code || '',
      course_name: course?.course_name || '',
      credit_hours: Number(course?.credit_hours) || 0,
      grade: course?.grade || ''
    }

    if (user && typeof semId === 'string' && !semId.startsWith('sem-')) {
      const { data } = await supabase
        .from('student_semester_courses')
        .insert({
          semester_id: semId,
          user_id: user.id,
          course_code: newCourse.course_code,
          course_name: newCourse.course_name,
          credit_hours: newCourse.credit_hours,
          grade: newCourse.grade
        })
        .select()
        .single()
      if (data) newCourse.id = data.id
    }

    const nextList = semesters.map(s => {
      if (s.id !== semId) return s
      return { ...s, courses: [...(s.courses || []), newCourse] }
    })
    saveSemestersToLocal(nextList)
  }

  async function handleUpdateCourse(semId, courseId, updatedFields) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && typeof courseId === 'string' && !courseId.startsWith('course-')) {
      await supabase
        .from('student_semester_courses')
        .update(updatedFields)
        .eq('id', courseId)
    }
    const nextList = semesters.map(s => {
      if (s.id !== semId) return s
      return {
        ...s,
        courses: s.courses.map(c => c.id === courseId ? { ...c, ...updatedFields } : c)
      }
    })
    saveSemestersToLocal(nextList)
  }

  async function handleDeleteCourse(semId, courseId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && typeof courseId === 'string' && !courseId.startsWith('course-')) {
      await supabase.from('student_semester_courses').delete().eq('id', courseId)
    }
    const nextList = semesters.map(s => {
      if (s.id !== semId) return s
      return { ...s, courses: s.courses.filter(c => c.id !== courseId) }
    })
    saveSemestersToLocal(nextList)
  }

  async function handleAIResultImport(extractedItems) {
    if (!Array.isArray(extractedItems) || extractedItems.length === 0) {
      setAnalyzerOpen(false)
      return
    }

    const semId = targetSemesterId || semesters[0]?.id
    if (!semId && activeTab !== 'calculator') {
      showToast('Please create a semester first.', 'warning')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (activeTab === 'calculator') {
      const importedCalcRows = extractedItems.map((item, idx) => ({
        id: Date.now() + idx,
        name: `${item.course_code ? item.course_code + ' - ' : ''}${item.course_name || 'Imported Course'}`,
        credits: Number(item.credit_hours) || 3,
        grade: item.grade || 'A'
      }))
      const existingFilledCalc = calcRows.filter(r => r.name?.trim() !== '' || r.grade !== '')
      setCalcRows([...existingFilledCalc, ...importedCalcRows])
    }

    if (semId) {
      const newCourses = []
      for (let i = 0; i < extractedItems.length; i++) {
        const item = extractedItems[i]
        const newCourse = {
          id: `course-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          semester_id: semId,
          course_code: item.course_code || '',
          course_name: item.course_name || 'Imported Course',
          credit_hours: Number(item.credit_hours) || 3,
          grade: item.grade || 'A'
        }

        if (user && typeof semId === 'string' && !semId.startsWith('sem-')) {
          const { data } = await supabase
            .from('student_semester_courses')
            .insert({
              semester_id: semId,
              user_id: user.id,
              course_code: newCourse.course_code,
              course_name: newCourse.course_name,
              credit_hours: newCourse.credit_hours,
              grade: newCourse.grade
            })
            .select()
            .single()
          if (data) newCourse.id = data.id
        }
        newCourses.push(newCourse)
      }

      const nextList = semesters.map(s => {
        if (s.id !== semId) return s
        const existingFilled = (s.courses || []).filter(c => c.course_name?.trim() !== '' || c.grade !== '')
        return {
          ...s,
          courses: [...existingFilled, ...newCourses]
        }
      })
      saveSemestersToLocal(nextList)
    }

    setAnalyzerOpen(false)
    showToast(`Successfully imported ${extractedItems.length} courses!`, 'success')
  }

  const overall = calculateOverallCGPA(semesters)
  const calcGPA = calculateSemesterGPA(
    calcRows
      .filter(r => r.credits !== '' && r.grade !== '')
      .map(r => ({ credit_hours: Number(r.credits), grade: r.grade }))
  )

  return (
    <main className="main-content">
      {/* Top Simple Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title mb-1">Exam Results & CGPA</h1>
          <p className="text-sm text-slate-400">
            Based on TAR UMT 5.6 Standard Grading System
          </p>
        </div>

        {/* Overall CGPA Badge */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 backdrop-blur-md">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-theme-500/10 text-theme-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Overall CGPA</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{overall.cgpa}</span>
              <span className="text-xs font-semibold text-slate-400">({overall.overallCredits} Credits)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simple 2-Tab Selector */}
      <div className="mb-6 flex w-fit rounded-2xl border border-white/10 bg-white/[0.02] p-1">
        <button
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'records'
              ? 'bg-theme-500 text-white shadow-md shadow-theme-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          My Semester Records
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'calculator'
              ? 'bg-theme-500 text-white shadow-md shadow-theme-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="h-4 w-4" />
          TAR UMT Calculator
        </button>
      </div>

      {/* TAB 1: MY SEMESTER RECORDS */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddSemModal(true)}
              className="btn-add text-sm"
            >
              <Plus className="h-4 w-4" /> Add Semester
            </button>

            <button
              onClick={() => {
                setTargetSemesterId(semesters[0]?.id || null)
                setAnalyzerOpen(true)
              }}
              className="btn-import text-sm"
            >
              <Sparkles className="h-4 w-4" /> AI Import Screenshot
            </button>
          </div>

          {semesters.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] py-16 text-center">
              <BookOpen className="mb-3 h-12 w-12 text-slate-500" />
              <h3 className="text-lg font-bold text-white">No Semester Records</h3>
              <p className="mt-1 text-sm text-slate-400">Click "+ Add Semester" or upload a screenshot to start.</p>
            </div>
          ) : (
            semesters.map(sem => {
              const semStat = calculateSemesterGPA(sem.courses)
              return (
                <SemesterCard
                  key={sem.id}
                  semester={sem}
                  semStat={semStat}
                  onAddCourse={handleAddCourse}
                  onUpdateCourse={handleUpdateCourse}
                  onDeleteCourse={handleDeleteCourse}
                  onDeleteSemester={handleDeleteSemester}
                  onAIImport={() => {
                    setTargetSemesterId(sem.id)
                    setAnalyzerOpen(true)
                  }}
                />
              )
            })
          )}
        </div>
      )}

      {/* TAB 2: SIMPLE TAR UMT CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left 2 Cols: Simple Calculator Table */}
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Quick SGPA / Target Calculator</h3>
                <p className="text-xs text-slate-400">Simulate grades and credit hours instantly</p>
              </div>
              <div className="rounded-xl bg-theme-500/10 px-4 py-2 border border-theme-500/20 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-theme-400">Calculated GPA</span>
                <p className="text-2xl font-black text-white">{calcGPA.gpa}</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-1.5 sm:gap-2 pb-2 text-[11px] sm:text-xs font-semibold text-slate-400 border-b border-white/10">
                <span className="col-span-6">Course Name</span>
                <span className="col-span-3">Credits</span>
                <span className="col-span-2">Grade</span>
                <span className="col-span-1 text-right">Del</span>
              </div>

              {calcRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-12 items-center gap-1.5 sm:gap-2 py-1.5 border-b border-white/5 last:border-0"
                >
                  <div className="col-span-6">
                    <input
                      className="input px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
                      value={row.name}
                      onChange={e => {
                        const val = e.target.value
                        setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, name: val } : r))
                      }}
                      placeholder="Course name"
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      className="input px-1.5 sm:px-3 py-1.5 text-xs sm:text-sm"
                      value={row.credits}
                      onChange={e => {
                        const val = e.target.value
                        setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, credits: val } : r))
                      }}
                    >
                      <option value="">Cr</option>
                      {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} Cr</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <select
                      className="input px-1.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold"
                      value={row.grade}
                      onChange={e => {
                        const val = e.target.value
                        setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, grade: val } : r))
                      }}
                    >
                      <option value="">Gr</option>
                      {TARUMT_GRADES.map(g => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => setCalcRows(prev => prev.filter(r => r.id !== row.id))}
                      className="p-1 text-slate-500 hover:text-red-400"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setCalcRows(prev => [...prev, { id: Date.now(), name: '', credits: '', grade: '' }])}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-2.5 text-xs font-semibold text-slate-400 hover:border-white/30 hover:text-white transition-all"
              >
                <Plus className="h-4 w-4" /> Add Row
              </button>
            </div>
          </div>

          {/* Right Col: TAR UMT 5.6 Grading Reference Table */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-3">
              TAR UMT Grading Scale
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Applicable to June 2023 intake & onwards
            </p>

            <div className="space-y-1.5">
              {TARUMT_GRADES.map(g => (
                <div
                  key={g.grade}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-7 place-items-center rounded bg-theme-500/20 font-bold text-theme-400">
                      {g.grade}
                    </span>
                    <span className="font-medium text-slate-300">{g.markRange}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white">{g.point.toFixed(4)}</span>
                    <span className="ml-2 hidden sm:inline text-[10px] text-slate-400">{g.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Semester */}
      <Modal
        isOpen={showAddSemModal}
        onClose={() => setShowAddSemModal(false)}
        title="Add Semester"
      >
        <form onSubmit={handleCreateSemester} className="space-y-4">
          <div>
            <label className="label">Semester Title</label>
            <input
              className="input"
              placeholder="e.g. Year 1 Semester 1 or May 2024"
              value={newSemesterName}
              onChange={e => setNewSemesterName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Create Semester
          </button>
        </form>
      </Modal>

      {/* Modal: AI Screenshot Import */}
      <Modal
        isOpen={analyzerOpen}
        onClose={() => setAnalyzerOpen(false)}
        title="AI Import Exam Results Slip"
        maxWidth="max-w-4xl"
      >
        <ImageUploadAnalyzer
          type="result"
          onResult={handleAIResultImport}
        />
      </Modal>

      {ConfirmDialog}
    </main>
  )
}

function SemesterCard({ semester, semStat, onAddCourse, onUpdateCourse, onDeleteCourse, onDeleteSemester, onAIImport }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 shadow-xl">
      {/* Semester Card Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">{semester.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {semester.courses?.length || 0} Courses · <span className="text-slate-300 font-semibold">{semStat.totalCredits}</span> Credit Hours
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">GPA</span>
            <span className="font-mono text-sm sm:text-base font-black text-emerald-300">{semStat.gpa}</span>
          </div>

          <button
            onClick={onAIImport}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-300 hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300 transition-all"
            title="Import from screenshot"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> AI Import
          </button>

          <button
            onClick={() => onDeleteSemester(semester.id)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-400 transition-all"
            title="Delete Semester"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Courses List as Calculator-style Rows */}
      <div className="space-y-1">
        <div className="grid grid-cols-12 gap-1.5 sm:gap-2 pb-2 text-[11px] sm:text-xs font-semibold text-slate-400 border-b border-white/10">
          <span className="col-span-3 sm:col-span-2">Code (opt)</span>
          <span className="col-span-4 sm:col-span-5">Course Name</span>
          <span className="col-span-2">Credits</span>
          <span className="col-span-2">Grade</span>
          <span className="col-span-1 text-right">Del</span>
        </div>

        {(semester.courses || []).map(course => (
          <div
            key={course.id}
            className="grid grid-cols-12 items-center gap-1.5 sm:gap-2 py-1.5 border-b border-white/5 last:border-0"
          >
            <div className="col-span-3 sm:col-span-2">
              <input
                className="input px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
                placeholder="Code"
                value={course.course_code || ''}
                onChange={e => onUpdateCourse(semester.id, course.id, { course_code: e.target.value })}
              />
            </div>
            <div className="col-span-4 sm:col-span-5">
              <input
                className="input px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
                placeholder="Course name"
                value={course.course_name || ''}
                onChange={e => onUpdateCourse(semester.id, course.id, { course_name: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <select
                className="input px-1.5 sm:px-3 py-1.5 text-xs sm:text-sm"
                value={course.credit_hours || ''}
                onChange={e => onUpdateCourse(semester.id, course.id, { credit_hours: e.target.value })}
              >
                <option value="">Cr</option>
                {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} Cr</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <select
                className="input px-1.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold"
                value={course.grade || ''}
                onChange={e => onUpdateCourse(semester.id, course.id, { grade: e.target.value })}
              >
                <option value="">Gr</option>
                {TARUMT_GRADES.map(g => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
              </select>
            </div>
            <div className="col-span-1 text-right">
              <button
                onClick={() => onDeleteCourse(semester.id, course.id)}
                className="p-1 text-slate-500 hover:text-red-400"
                title="Remove course"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => onAddCourse(semester.id, { course_code: '', course_name: '', credit_hours: '', grade: '' })}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-2.5 text-xs font-semibold text-slate-400 hover:border-white/30 hover:text-white transition-all"
        >
          <Plus className="h-4 w-4" /> Add Row
        </button>
      </div>
    </div>
  )
}
