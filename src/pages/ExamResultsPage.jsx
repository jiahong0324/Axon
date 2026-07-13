import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Sparkles, Calculator, BookOpen, Award, CheckCircle2, ChevronDown, ChevronUp, Info, RefreshCw } from 'lucide-react'
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
  const [syncingCloud, setSyncingCloud] = useState(false)

  const pendingUpdatesRef = useRef({})
  const debounceTimersRef = useRef({})

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

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadSemesters()
      }
    })

    function handleAutoRefresh() {
      if (document.visibilityState === 'visible') {
        loadSemesters()
      }
    }

    window.addEventListener('visibilitychange', handleAutoRefresh)
    window.addEventListener('focus', handleAutoRefresh)

    const channel = supabase
      .channel('exam-results-auto-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_semesters' }, () => {
        loadSemesters()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_semester_courses' }, () => {
        loadSemesters()
      })
      .subscribe()

    return () => {
      authSub?.subscription?.unsubscribe()
      window.removeEventListener('visibilitychange', handleAutoRefresh)
      window.removeEventListener('focus', handleAutoRefresh)
      supabase.removeChannel(channel)
    }
  }, [])

  async function syncLocalSemestersToSupabase(user, localList) {
    if (!user || !Array.isArray(localList) || localList.length === 0) return localList
    const resultList = []

    for (const sem of localList) {
      if (typeof sem.id === 'string' && !sem.id.startsWith('sem-')) {
        resultList.push(sem)
        continue
      }
      const { data: newSem } = await supabase
        .from('student_semesters')
        .insert({ user_id: user.id, name: sem.name || 'Semester' })
        .select()
        .single()

      if (!newSem) {
        resultList.push(sem)
        continue
      }

      const syncedCourses = []
      for (const course of (sem.courses || [])) {
        const { data: newCourse } = await supabase
          .from('student_semester_courses')
          .insert({
            semester_id: newSem.id,
            user_id: user.id,
            course_code: course.course_code || '',
            course_name: course.course_name || '',
            credit_hours: Number(course.credit_hours) || 0,
            grade: course.grade || ''
          })
          .select()
          .single()

        if (newCourse) {
          syncedCourses.push(newCourse)
        } else {
          syncedCourses.push({ ...course, semester_id: newSem.id })
        }
      }

      resultList.push({
        ...newSem,
        courses: syncedCourses.length > 0 ? syncedCourses : createDefaultThreeCourses(newSem.id)
      })
    }

    setSemesters(resultList)
    localStorage.setItem('axon_exam_results_semesters', JSON.stringify(resultList))
    return resultList
  }

  async function ensureSemesterInSupabase(semId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return semId
    if (typeof semId === 'string' && !semId.startsWith('sem-')) return semId

    const targetSem = semesters.find(s => s.id === semId)
    if (!targetSem) return semId

    const { data } = await supabase
      .from('student_semesters')
      .insert({ user_id: user.id, name: targetSem.name || 'Semester' })
      .select()
      .single()

    if (data && data.id) {
      const newSemId = data.id
      setSemesters(prev => {
        const nextList = prev.map(s => {
          if (s.id !== semId) return s
          return {
            ...s,
            id: newSemId,
            courses: (s.courses || []).map(c => ({ ...c, semester_id: newSemId }))
          }
        })
        localStorage.setItem('axon_exam_results_semesters', JSON.stringify(nextList))
        return nextList
      })
      return newSemId
    }
    return semId
  }

  async function loadSemesters(showToastMsg = false) {
    setLoading(true)
    if (showToastMsg) setSyncingCloud(true)
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
      if (showToastMsg) setSyncingCloud(false)
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

    if (semsData && semsData.length > 0) {
      const merged = semsData.map(s => {
        const semCourses = (coursesData || []).filter(c => c.semester_id === s.id)
        return {
          ...s,
          courses: semCourses.length > 0 ? semCourses : createDefaultThreeCourses(s.id)
        }
      })
      setSemesters(merged)
      localStorage.setItem('axon_exam_results_semesters', JSON.stringify(merged))
    } else {
      // If Supabase is empty, check localStorage and automatically upload any cached semesters/courses
      const cached = localStorage.getItem('axon_exam_results_semesters')
      if (cached) {
        const parsed = JSON.parse(cached)
        await syncLocalSemestersToSupabase(user, parsed)
      } else {
        const defaultSem = [{
          id: 'sem-1',
          name: 'Year 1 Semester 1',
          courses: createDefaultThreeCourses('sem-1')
        }]
        const synced = await syncLocalSemestersToSupabase(user, defaultSem)
        setSemesters(synced)
      }
    }
    setLoading(false)
    if (showToastMsg) {
      setSyncingCloud(false)
      showToast('Exam results synced across devices!', 'success')
    }
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
    setSemesters(prev => {
      const nextList = prev.filter(s => s.id !== semId)
      localStorage.setItem('axon_exam_results_semesters', JSON.stringify(nextList))
      return nextList
    })
    showToast('Semester deleted.', 'success')

    const { data: { user } } = await supabase.auth.getUser()
    if (user && typeof semId === 'string' && !semId.startsWith('sem-')) {
      await supabase.from('student_semesters').delete().eq('id', semId)
    }
  }

  async function handleAddCourse(semId, course) {
    const tempId = `course-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    const newCourse = {
      id: tempId,
      semester_id: semId,
      course_code: course?.course_code || '',
      course_name: course?.course_name || '',
      credit_hours: Number(course?.credit_hours) || 0,
      grade: course?.grade || ''
    }

    setSemesters(prev => {
      const nextList = prev.map(s => {
        if (s.id !== semId) return s
        return { ...s, courses: [...(s.courses || []), newCourse] }
      })
      localStorage.setItem('axon_exam_results_semesters', JSON.stringify(nextList))
      return nextList
    })

    const activeSemId = await ensureSemesterInSupabase(semId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('student_semester_courses')
      .insert({
        semester_id: activeSemId,
        user_id: user.id,
        course_code: newCourse.course_code,
        course_name: newCourse.course_name,
        credit_hours: newCourse.credit_hours,
        grade: newCourse.grade
      })
      .select()
      .single()

    if (data && data.id) {
      setSemesters(prev => {
        const nextList = prev.map(s => {
          if (s.id !== activeSemId && s.id !== semId) return s
          return {
            ...s,
            courses: s.courses.map(c => c.id === tempId ? { ...c, id: data.id, semester_id: activeSemId } : c)
          }
        })
        localStorage.setItem('axon_exam_results_semesters', JSON.stringify(nextList))
        return nextList
      })
    }
  }

  function handleUpdateCourse(semId, courseId, updatedFields) {
    // 1. Immediately update UI state synchronously so typing has 0ms latency
    setSemesters(prev => {
      const nextList = prev.map(s => {
        if (s.id !== semId) return s
        return {
          ...s,
          courses: s.courses.map(c => c.id === courseId ? { ...c, ...updatedFields } : c)
        }
      })
      localStorage.setItem('axon_exam_results_semesters', JSON.stringify(nextList))
      return nextList
    })

    // 2. Debounce background Supabase sync
    pendingUpdatesRef.current[courseId] = {
      ...(pendingUpdatesRef.current[courseId] || {}),
      ...updatedFields
    }

    if (debounceTimersRef.current[courseId]) {
      clearTimeout(debounceTimersRef.current[courseId])
    }

    debounceTimersRef.current[courseId] = setTimeout(async () => {
      const fieldsToSave = pendingUpdatesRef.current[courseId]
      delete pendingUpdatesRef.current[courseId]
      delete debounceTimersRef.current[courseId]

      if (!fieldsToSave) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (typeof courseId === 'string' && !courseId.startsWith('course-')) {
        await supabase
          .from('student_semester_courses')
          .update(fieldsToSave)
          .eq('id', courseId)
      } else {
        const activeSemId = await ensureSemesterInSupabase(semId)
        const { data } = await supabase
          .from('student_semester_courses')
          .insert({
            semester_id: activeSemId,
            user_id: user.id,
            course_code: fieldsToSave.course_code || '',
            course_name: fieldsToSave.course_name || '',
            credit_hours: Number(fieldsToSave.credit_hours) || 0,
            grade: fieldsToSave.grade || ''
          })
          .select()
          .single()

        if (data && data.id) {
          setSemesters(prev => {
            const nextList = prev.map(s => {
              if (s.id !== activeSemId && s.id !== semId) return s
              return {
                ...s,
                courses: s.courses.map(c => c.id === courseId ? { ...c, id: data.id, semester_id: activeSemId } : c)
              }
            })
            localStorage.setItem('axon_exam_results_semesters', JSON.stringify(nextList))
            return nextList
          })
        }
      }
    }, 450)
  }

  function handleDeleteCourse(semId, courseId) {
    if (debounceTimersRef.current[courseId]) {
      clearTimeout(debounceTimersRef.current[courseId])
      delete debounceTimersRef.current[courseId]
      delete pendingUpdatesRef.current[courseId]
    }

    setSemesters(prev => {
      const nextList = prev.map(s => {
        if (s.id !== semId) return s
        return { ...s, courses: s.courses.filter(c => c.id !== courseId) }
      })
      localStorage.setItem('axon_exam_results_semesters', JSON.stringify(nextList))
      return nextList
    })

    if (typeof courseId === 'string' && !courseId.startsWith('course-')) {
      supabase.from('student_semester_courses').delete().eq('id', courseId).then()
    }
  }

  async function handleAIResultImport(extractedItems) {
    if (!Array.isArray(extractedItems) || extractedItems.length === 0) {
      setAnalyzerOpen(false)
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

    // CASE 1: Specific Semester Import (User clicked "AI Import" inside a specific Semester Card)
    if (targetSemesterId) {
      const activeSemId = await ensureSemesterInSupabase(targetSemesterId)
      const newCourses = []
      for (let i = 0; i < extractedItems.length; i++) {
        const item = extractedItems[i]
        const newCourse = {
          id: `course-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          semester_id: activeSemId,
          course_code: item.course_code || '',
          course_name: item.course_name || 'Imported Course',
          credit_hours: Number(item.credit_hours) || 3,
          grade: item.grade || 'A'
        }

        if (user) {
          const { data } = await supabase
            .from('student_semester_courses')
            .insert({
              semester_id: activeSemId,
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
        if (s.id !== activeSemId && s.id !== targetSemesterId) return s
        const existingFilled = (s.courses || []).filter(c => c.course_name?.trim() !== '' || c.grade !== '')
        return {
          ...s,
          courses: [...existingFilled, ...newCourses]
        }
      })
      saveSemestersToLocal(nextList)
    } else {
      // CASE 2: Global AI Import Screenshot (User clicked top-right "AI Import Screenshot")
      // Automatically separate courses into multiple semesters if detected!
      const grouped = {}
      const defaultSemName = semesters[0]?.name || 'Year 1 Semester 1'
      extractedItems.forEach(item => {
        const semName = item.semester_name?.trim() || defaultSemName
        if (!grouped[semName]) grouped[semName] = []
        grouped[semName].push(item)
      })

      let nextList = [...semesters]
      for (const [semName, items] of Object.entries(grouped)) {
        let targetSem = nextList.find(s => s.name.trim().toLowerCase() === semName.toLowerCase())
        if (!targetSem) {
          const newSemId = `sem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
          targetSem = {
            id: newSemId,
            name: semName,
            user_id: user?.id,
            courses: []
          }
          if (user) {
            const { data } = await supabase
              .from('student_semesters')
              .insert({ user_id: user.id, name: semName })
              .select()
              .single()
            if (data) targetSem.id = data.id
          }
          nextList.push(targetSem)
        } else {
          const syncedSemId = await ensureSemesterInSupabase(targetSem.id)
          targetSem.id = syncedSemId
        }

        const newCourses = []
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          const newCourse = {
            id: `course-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            semester_id: targetSem.id,
            course_code: item.course_code || '',
            course_name: item.course_name || 'Imported Course',
            credit_hours: Number(item.credit_hours) || 3,
            grade: item.grade || 'A'
          }
          if (user) {
            const { data } = await supabase
              .from('student_semester_courses')
              .insert({
                semester_id: targetSem.id,
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

        nextList = nextList.map(s => {
          if (s.id !== targetSem.id) return s
          const existingFilled = (s.courses || []).filter(c => c.course_name?.trim() !== '' || c.grade !== '')
          return {
            ...s,
            courses: [...existingFilled, ...newCourses]
          }
        })
      }
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
      {/* Simple Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title mb-1">Exam Results & CGPA</h1>
          <p className="text-sm text-slate-400">
            Based on TAR UMT 5.6 Standard Grading System
          </p>
        </div>

        {/* Overall CGPA Badge & Sync Cloud */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadSemesters(true)}
            disabled={syncingCloud}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3.5 text-xs font-bold transition-all ${
              syncingCloud
                ? 'border-purple-500/40 bg-purple-500/15 text-purple-300'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Sync results across devices"
          >
            <RefreshCw className={`h-4 w-4 ${syncingCloud ? 'animate-spin text-purple-400' : ''}`} />
            <span>Sync Cloud</span>
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3">
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
      </div>

      {/* Simple 2-Tab Switcher */}
      <div className="mb-6 flex w-full sm:w-fit rounded-2xl border border-white/10 bg-white/[0.02] p-1">
        <button
          onClick={() => setActiveTab('records')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'records'
              ? 'bg-theme-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>My Semesters</span>
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'calculator'
              ? 'bg-theme-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="h-4 w-4 shrink-0" />
          <span>Quick Calculator</span>
        </button>
      </div>

      {/* TAB 1: MY SEMESTER RECORDS */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
            <button
              onClick={() => setShowAddSemModal(true)}
              className="btn-add flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-semibold shadow-md"
            >
              <Plus className="h-4 w-4 shrink-0" /> <span>Add Semester</span>
            </button>

            <button
              onClick={() => {
                setTargetSemesterId(null)
                setAnalyzerOpen(true)
              }}
              className="btn-import flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-semibold shadow-md"
            >
              <Sparkles className="h-4 w-4 shrink-0" /> <span>AI Import Screenshot</span>
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
                <h3 className="text-base sm:text-lg font-bold text-white">Quick SGPA Calculator</h3>
                <p className="text-xs text-slate-400">Simulate grades and credit hours instantly</p>
              </div>
              <div className="rounded-xl bg-theme-500/10 px-4 py-2 border border-theme-500/20 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-theme-400">Calculated SGPA</span>
                <p className="text-2xl font-black text-white">{calcGPA.gpa}</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* SIMPLE & CLEAN MOBILE LIST (< md) */}
              <div className="space-y-3 md:hidden">
                {calcRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <input
                        className="input flex-1 py-1.5 px-3 text-sm"
                        placeholder="Course Name"
                        value={row.name}
                        onChange={e => {
                          const val = e.target.value
                          setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, name: val } : r))
                        }}
                      />
                      <button
                        onClick={() => setCalcRows(prev => prev.filter(r => r.id !== row.id))}
                        className="p-1.5 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="input py-1.5 px-2.5 text-xs"
                        value={row.credits}
                        onChange={e => {
                          const val = e.target.value
                          setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, credits: val } : r))
                        }}
                      >
                        <option value="">Credits</option>
                        {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} Credits</option>)}
                      </select>

                      <select
                        className="input py-1.5 px-2.5 text-xs font-bold text-emerald-400"
                        value={row.grade}
                        onChange={e => {
                          const val = e.target.value
                          setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, grade: val } : r))
                        }}
                      >
                        <option value="">Grade</option>
                        {TARUMT_GRADES.map(g => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (>= md) */}
              <div className="hidden md:block space-y-1">
                <div className="grid grid-cols-12 gap-2 pb-2 text-xs font-semibold text-slate-400 border-b border-white/10">
                  <span className="col-span-6">Course Name</span>
                  <span className="col-span-3">Credit</span>
                  <span className="col-span-2">Grade</span>
                  <span className="col-span-1 text-right">Del</span>
                </div>

                {calcRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-12 items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
                  >
                    <div className="col-span-6">
                      <input
                        className="input px-3 py-1.5 text-sm"
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
                        className="input px-3 py-1.5 text-sm"
                        value={row.credits}
                        onChange={e => {
                          const val = e.target.value
                          setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, credits: val } : r))
                        }}
                      >
                        <option value="">Credit</option>
                        {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <select
                        className="input px-3 py-1.5 text-sm font-semibold"
                        value={row.grade}
                        onChange={e => {
                          const val = e.target.value
                          setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, grade: val } : r))
                        }}
                      >
                        <option value="">Grade</option>
                        {TARUMT_GRADES.map(g => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => setCalcRows(prev => prev.filter(r => r.id !== row.id))}
                        className="p-1.5 text-slate-500 hover:text-red-400"
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setCalcRows(prev => [...prev, { id: Date.now(), name: '', credits: '', grade: '' }])}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-xs sm:text-sm font-semibold text-slate-400 hover:border-white/30 hover:text-white transition-all"
              >
                <Plus className="h-4 w-4" /> Add Row
              </button>
            </div>
          </div>

          {/* Right Col: TAR UMT 5.6 Grading Reference Table */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
              TAR UMT Grading Scale
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Applicable to June 2023 intake & onwards
            </p>

            <div className="space-y-1.5">
              {TARUMT_GRADES.map(g => (
                <div
                  key={g.grade}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/15 px-3 py-2 text-xs"
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
      <div className="mb-4 sm:mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">{semester.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {semester.courses?.length || 0} Courses · <span className="text-slate-300 font-semibold">{semStat.totalCredits}</span> Credits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">GPA</span>
            <span className="font-mono text-sm sm:text-base font-black text-emerald-300">{semStat.gpa}</span>
          </div>

          <button
            onClick={onAIImport}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300 transition-all"
            title="Import from screenshot"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Import</span>
          </button>

          <button
            onClick={() => onDeleteSemester(semester.id)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-400 transition-all"
            title="Delete Semester"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-2">
        {/* VERY SIMPLE & USER-FRIENDLY MOBILE CARDS (< md) */}
        <div className="space-y-2.5 md:hidden">
          {(semester.courses || []).map((course, idx) => (
            <div
              key={course.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2"
            >
              {/* Row 1: Course Name + Delete */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                <input
                  className="input flex-1 py-1.5 px-3 text-sm font-semibold"
                  placeholder="Course Name"
                  value={course.course_name || ''}
                  onChange={e => onUpdateCourse(semester.id, course.id, { course_name: e.target.value })}
                />
                <button
                  onClick={() => onDeleteCourse(semester.id, course.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400"
                  title="Remove course"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Row 2: 2 clean selects for Credits & Grade */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="input py-1.5 px-2.5 text-xs font-semibold"
                  value={course.credit_hours || ''}
                  onChange={e => onUpdateCourse(semester.id, course.id, { credit_hours: e.target.value })}
                >
                  <option value="">Credits</option>
                  {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} Credits</option>)}
                </select>

                <select
                  className="input py-1.5 px-2.5 text-xs font-bold text-emerald-400"
                  value={course.grade || ''}
                  onChange={e => onUpdateCourse(semester.id, course.id, { grade: e.target.value })}
                >
                  <option value="">Grade</option>
                  {TARUMT_GRADES.map(g => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE VIEW (>= md) */}
        <div className="hidden md:block space-y-1">
          <div className="grid grid-cols-12 gap-2 pb-2 text-xs font-semibold text-slate-400 border-b border-white/10">
            <span className="col-span-2">Code (opt)</span>
            <span className="col-span-5">Course Name</span>
            <span className="col-span-2">Credit</span>
            <span className="col-span-2">Grade</span>
            <span className="col-span-1 text-right">Del</span>
          </div>

          {(semester.courses || []).map(course => (
            <div
              key={course.id}
              className="grid grid-cols-12 items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
            >
              <div className="col-span-2">
                <input
                  className="input px-3 py-1.5 text-sm"
                  placeholder="Code"
                  value={course.course_code || ''}
                  onChange={e => onUpdateCourse(semester.id, course.id, { course_code: e.target.value })}
                />
              </div>
              <div className="col-span-5">
                <input
                  className="input px-3 py-1.5 text-sm"
                  placeholder="Course name"
                  value={course.course_name || ''}
                  onChange={e => onUpdateCourse(semester.id, course.id, { course_name: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <select
                  className="input px-3 py-1.5 text-sm"
                  value={course.credit_hours || ''}
                  onChange={e => onUpdateCourse(semester.id, course.id, { credit_hours: e.target.value })}
                >
                  <option value="">Credit</option>
                  {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <select
                  className="input px-3 py-1.5 text-sm font-semibold"
                  value={course.grade || ''}
                  onChange={e => onUpdateCourse(semester.id, course.id, { grade: e.target.value })}
                >
                  <option value="">Grade</option>
                  {TARUMT_GRADES.map(g => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                </select>
              </div>
              <div className="col-span-1 text-right">
                <button
                  onClick={() => onDeleteCourse(semester.id, course.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400"
                  title="Remove course"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onAddCourse(semester.id, { course_code: '', course_name: '', credit_hours: '', grade: '' })}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-xs sm:text-sm font-semibold text-slate-400 hover:border-white/30 hover:text-white transition-all"
        >
          <Plus className="h-4 w-4" /> Add Course
        </button>
      </div>
    </div>
  )
}

