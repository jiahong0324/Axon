import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Sparkles, Calculator, BookOpen, Award, Edit2, Check, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useConfirmDialog } from '../components/ConfirmModal'
import Modal from '../components/Modal'
import ImageUploadAnalyzer from '../components/ImageUploadAnalyzer'
import { TARUMT_GRADES, getGradePoint, calculateSemesterGPA, calculateOverallCGPA, getAcademicStanding, getGradeBadgeStyle } from '../lib/tarumtGrading'

function createDefaultThreeCourses(semId) {
  return [
    { id: `course-${Date.now()}-1`, semester_id: semId, course_code: '', course_name: '', credit_hours: '', grade: '' },
    { id: `course-${Date.now()}-2`, semester_id: semId, course_code: '', course_name: '', credit_hours: '', grade: '' },
    { id: `course-${Date.now()}-3`, semester_id: semId, course_code: '', course_name: '', credit_hours: '', grade: '' }
  ]
}

export default function ExamResultsPage() {
  const [activeTab, setActiveTab] = useState('records') // 'records' | 'calculator'
  const [semesters, setSemesters] = useState(() => {
    try {
      const cached = localStorage.getItem('axon_exam_results_semesters')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {}
    return []
  })
  const [loading, setLoading] = useState(true)
  const [newSemesterName, setNewSemesterName] = useState('')
  const [showAddSemModal, setShowAddSemModal] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [targetSemesterId, setTargetSemesterId] = useState(null)

  // Quick Calculator State
  const [calcRows, setCalcRows] = useState([
    { id: 1, name: '', credits: '', grade: '' },
    { id: 2, name: '', credits: '', grade: '' },
    { id: 3, name: '', credits: '', grade: '' }
  ])
  const [showCalcResult, setShowCalcResult] = useState(false)

  const syncTimerRef = useRef(null)
  const isSyncingRef = useRef(false)
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

    return () => {
      authSub?.subscription?.unsubscribe()
      window.removeEventListener('visibilitychange', handleAutoRefresh)
      window.removeEventListener('focus', handleAutoRefresh)
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [])

  // 100% Automatic background cloud sync: saves to user_metadata (guaranteed universal cloud sync) + SQL tables
  async function syncAllToSupabase(localList) {
    if (isSyncingRef.current) return localList
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !Array.isArray(localList)) return localList

    isSyncingRef.current = true
    try {
      // 1. Guaranteed dual-storage sync to user_metadata so any device immediately sees all semesters
      await supabase.auth.updateUser({
        data: { axon_exam_results_semesters: localList }
      })

      // 2. Also sync to SQL tables if they exist
      let hasIdChanges = false
      const updatedList = []
      for (const sem of localList) {
        let semId = sem.id
        let newSemObj = { ...sem }

        if (typeof semId === 'string' && semId.startsWith('sem-')) {
          const { data: newSem } = await supabase
            .from('student_semesters')
            .insert({ user_id: user.id, name: sem.name || 'Semester' })
            .select()
            .single()
          if (newSem) {
            semId = newSem.id
            newSemObj.id = newSem.id
            hasIdChanges = true
          }
        } else {
          await supabase
            .from('student_semesters')
            .upsert({ id: semId, user_id: user.id, name: sem.name || 'Semester' })
        }

        const syncedCourses = []
        for (const course of (sem.courses || [])) {
          if (typeof course.id === 'string' && course.id.startsWith('course-')) {
            const { data: newCourse } = await supabase
              .from('student_semester_courses')
              .insert({
                semester_id: semId,
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
              hasIdChanges = true
            } else {
              syncedCourses.push({ ...course, semester_id: semId })
            }
          } else {
            await supabase
              .from('student_semester_courses')
              .upsert({
                id: course.id,
                semester_id: semId,
                user_id: user.id,
                course_code: course.course_code || '',
                course_name: course.course_name || '',
                credit_hours: Number(course.credit_hours) || 0,
                grade: course.grade || ''
              })
            syncedCourses.push({ ...course, semester_id: semId })
          }
        }

        newSemObj.courses = syncedCourses
        updatedList.push(newSemObj)
      }

      localStorage.setItem('axon_exam_results_semesters', JSON.stringify(updatedList))
      if (hasIdChanges) {
        setSemesters(updatedList)
      }
      return updatedList
    } catch (e) {
      return localList
    } finally {
      isSyncingRef.current = false
    }
  }

  function autoScheduleCloudSync(nextList) {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      syncAllToSupabase(nextList)
    }, 400)
  }

  async function loadSemesters() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const cached = localStorage.getItem('axon_exam_results_semesters')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          setSemesters(parsed.map(s => ({
            ...s,
            courses: (s.courses && s.courses.length > 0) ? s.courses : createDefaultThreeCourses(s.id)
          })))
        } catch (e) {}
      } else {
        const defaultSem = [{
          id: 'sem-1',
          name: 'Year 1 Semester 1',
          is_submitted: false,
          courses: createDefaultThreeCourses('sem-1')
        }]
        setSemesters(defaultSem)
        localStorage.setItem('axon_exam_results_semesters', JSON.stringify(defaultSem))
      }
      setLoading(false)
      return
    }

    // 1. Read local storage
    let localList = []
    const cached = localStorage.getItem('axon_exam_results_semesters')
    if (cached) {
      try { localList = JSON.parse(cached) || [] } catch (e) {}
    }

    // 2. Read user_metadata from Supabase Auth
    const hasCloudMeta = Array.isArray(user?.user_metadata?.axon_exam_results_semesters)
    const metaList = hasCloudMeta ? user.user_metadata.axon_exam_results_semesters : []

    // 3. Read SQL tables
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

    let tableList = []
    if (semsData && semsData.length > 0) {
      tableList = semsData.map(s => {
        const semCourses = (coursesData || []).filter(c => c.semester_id === s.id)
        return {
          ...s,
          is_submitted: Boolean(s.is_submitted || semCourses.some(c => c.grade && c.grade !== '')),
          courses: semCourses
        }
      })
    }

    // 4. Source of truth resolution:
    // When logged in, cloud metadata (or SQL tables) is the authoritative list across devices so deleted semesters stay deleted on all devices
    let merged = []
    if (hasCloudMeta) {
      merged = metaList
    } else if (tableList.length > 0) {
      merged = tableList
    } else {
      merged = localList
    }

    const hasRealSemester = merged.some(s => s.name !== 'Year 1 Semester 1' || (s.courses || []).some(c => c.grade && c.grade !== ''))
    if (hasRealSemester) {
      merged = merged.filter(s => !(s.name === 'Year 1 Semester 1' && (s.courses || []).every(c => !c.grade || c.grade === '')))
    }

    setSemesters(merged)
    localStorage.setItem('axon_exam_results_semesters', JSON.stringify(merged))
    setLoading(false)
  }

  function saveAndAutoSync(list) {
    setSemesters(list)
    localStorage.setItem('axon_exam_results_semesters', JSON.stringify(list))
    autoScheduleCloudSync(list)
  }

  function handleCreateSemester(e) {
    e.preventDefault()
    if (!newSemesterName.trim()) return
    const newSem = {
      id: `sem-${Date.now()}`,
      name: newSemesterName.trim(),
      is_submitted: false,
      courses: createDefaultThreeCourses(`sem-${Date.now()}`)
    }
    const nextList = [...semesters, newSem]
    saveAndAutoSync(nextList)
    setNewSemesterName('')
    setShowAddSemModal(false)
    showToast('New semester created!', 'success')
  }

  async function handleDeleteSemester(id) {
    const ok = await confirm({
      title: 'Delete Semester?',
      message: 'Are you sure you want to delete this entire semester and its course results?',
      confirmText: 'Delete Semester',
      variant: 'danger'
    })
    if (!ok) return

    const targetSem = semesters.find(s => s.id === id)
    const nextList = semesters.filter(s => s.id !== id)
    saveAndAutoSync(nextList)
    showToast('Semester deleted.', 'info')

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('student_semester_courses').delete().eq('semester_id', id)
      await supabase.from('student_semesters').delete().eq('id', id)
      if (targetSem && targetSem.name) {
        await supabase.from('student_semesters').delete().eq('name', targetSem.name).eq('user_id', user.id)
      }
    }
  }

  async function handleClearAllSemesters() {
    const ok = await confirm({
      title: 'Clear All Semesters?',
      message: 'Are you sure you want to delete all semesters and course records?',
      confirmText: 'Clear All',
      variant: 'danger'
    })
    if (!ok) return

    saveAndAutoSync([])
    showToast('All semester records cleared.', 'info')

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('student_semester_courses').delete().eq('user_id', user.id)
      await supabase.from('student_semesters').delete().eq('user_id', user.id)
    }
  }

  function handleAddCourse(semId, newCourse) {
    const nextList = semesters.map(s => {
      if (s.id !== semId) return s
      const courseWithId = {
        id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        semester_id: semId,
        course_code: newCourse.course_code || '',
        course_name: newCourse.course_name || '',
        credit_hours: newCourse.credit_hours || '',
        grade: newCourse.grade || ''
      }
      return { ...s, courses: [...(s.courses || []), courseWithId] }
    })
    saveAndAutoSync(nextList)
  }

  function handleUpdateCourse(semId, courseId, updatedFields) {
    const nextList = semesters.map(s => {
      if (s.id !== semId) return s
      return {
        ...s,
        courses: s.courses.map(c => {
          if (c.id !== courseId) return c
          return { ...c, ...updatedFields }
        })
      }
    })
    saveAndAutoSync(nextList)
  }

  function handleDeleteCourse(semId, courseId) {
    const nextList = semesters.map(s => {
      if (s.id !== semId) return s
      return { ...s, courses: s.courses.filter(c => c.id !== courseId) }
    })
    saveAndAutoSync(nextList)
  }

  function handleToggleSubmitSemester(semId, targetSubmittedState) {
    const nextList = semesters.map(s => {
      if (s.id !== semId) return s
      return { ...s, is_submitted: targetSubmittedState }
    })
    saveAndAutoSync(nextList)

    if (targetSubmittedState) {
      showToast('Semester results locked & saved automatically!', 'success')
    } else {
      showToast('Editing mode unlocked.', 'info')
    }
  }

  function handleAIResultImport(extractedItems) {
    if (!Array.isArray(extractedItems) || extractedItems.length === 0) {
      setAnalyzerOpen(false)
      return
    }

    if (activeTab === 'calculator') {
      const importedCalcRows = extractedItems.map((item, idx) => ({
        id: Date.now() + idx,
        name: `${item.course_code ? item.course_code + ' - ' : ''}${item.course_name || 'Imported Course'}`,
        credits: Number(item.credit_hours) || 3,
        grade: item.grade || 'A'
      }))
      const existingFilledCalc = calcRows.filter(r => r.name?.trim() !== '' || r.grade !== '')
      setCalcRows([...existingFilledCalc, ...importedCalcRows])
      setShowCalcResult(false)
    }

    let nextList = [...semesters]
    if (targetSemesterId) {
      const newCourses = extractedItems.map((item, i) => ({
        id: `course-${Date.now()}-${i}`,
        semester_id: targetSemesterId,
        course_code: item.course_code || '',
        course_name: item.course_name || 'Imported Course',
        credit_hours: Number(item.credit_hours) || 3,
        grade: item.grade || 'A'
      }))
      nextList = nextList.map(s => {
        if (s.id !== targetSemesterId) return s
        const existingFilled = (s.courses || []).filter(c => c.course_name?.trim() !== '' || c.grade !== '')
        return { ...s, is_submitted: true, courses: [...existingFilled, ...newCourses] }
      })
    } else {
      const grouped = {}
      const defaultSemName = semesters[0]?.name || 'Year 1 Semester 1'
      extractedItems.forEach(item => {
        const semName = item.semester_name?.trim() || defaultSemName
        if (!grouped[semName]) grouped[semName] = []
        grouped[semName].push(item)
      })

      for (const [semName, items] of Object.entries(grouped)) {
        let targetSem = nextList.find(s => s.name.trim().toLowerCase() === semName.toLowerCase())
        if (!targetSem) {
          targetSem = {
            id: `sem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: semName,
            is_submitted: true,
            courses: []
          }
          nextList.push(targetSem)
        }
        const newCourses = items.map((item, i) => ({
          id: `course-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          semester_id: targetSem.id,
          course_code: item.course_code || '',
          course_name: item.course_name || 'Imported Course',
          credit_hours: Number(item.credit_hours) || 3,
          grade: item.grade || 'A'
        }))
        nextList = nextList.map(s => {
          if (s.id !== targetSem.id) return s
          const existingFilled = (s.courses || []).filter(c => c.course_name?.trim() !== '' || c.grade !== '')
          return { ...s, is_submitted: true, courses: [...existingFilled, ...newCourses] }
        })
      }

      // Automatically remove default/empty semesters (like an empty Year 1 Semester 1) once real semester results are imported
      const hasFilledSem = nextList.some(s => (s.courses || []).some(c => c.grade && c.grade !== ''))
      if (hasFilledSem) {
        const toRemove = nextList.filter(s => (s.courses || []).length === 0 || (s.courses || []).every(c => !c.grade && !c.course_name?.trim()))
        for (const rem of toRemove) {
          if (typeof rem.id === 'string' && !rem.id.startsWith('sem-')) {
            supabase.from('student_semesters').delete().eq('id', rem.id)
          }
        }
        nextList = nextList.filter(s => (s.courses || []).some(c => (c.grade && c.grade !== '') || c.course_name?.trim() !== ''))
      }
    }

    saveAndAutoSync(nextList)
    setAnalyzerOpen(false)
    showToast(`Successfully imported & submitted ${extractedItems.length} courses!`, 'success')
  }

  const overall = calculateOverallCGPA(semesters)
  const standing = getAcademicStanding(overall.cgpa, overall.overallCredits)
  const calcGPA = calculateSemesterGPA(
    calcRows
      .filter(r => r.credits !== '' && r.grade !== '')
      .map(r => ({ credit_hours: Number(r.credits), grade: r.grade }))
  )
  const calcStanding = getAcademicStanding(calcGPA.gpa, calcGPA.totalCredits)

  return (
    <main className="main-content">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between">
          <h1 className="page-title mb-1">Results</h1>
        </div>

        {/* Overall CGPA Banner */}
        <div className="flex items-center gap-4 rounded-2xl bg-[#131b2e] px-5 py-3 shadow-md">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/15">
            <Award className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall CGPA</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-extrabold text-white tracking-tight">{overall.cgpa}</span>
              <span className="text-xs font-semibold text-slate-400">({overall.overallCredits} Credits)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl bg-[#111827] p-1.5 shadow-md">
          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'records'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>My Semesters</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('calculator')
            }}
            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'calculator'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="h-4 w-4 shrink-0" />
            <span>Quick Calculator</span>
          </button>
        </div>

        {activeTab === 'records' && semesters.length > 0 && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => {
                setTargetSemesterId(null)
                setAnalyzerOpen(true)
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#14b8a6] hover:bg-[#0f968c] text-white font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] transition-all shadow-md"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Import Screenshot</span>
            </button>
            <button
              onClick={() => setShowAddSemModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#14b8a6] hover:bg-[#0f968c] text-white font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] transition-all shadow-md"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add Semester</span>
            </button>
            <button
              onClick={handleClearAllSemesters}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 sm:px-3 sm:py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 border border-red-500/20"
              title="Clear All Semesters"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium hidden sm:block">Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="w-full">
        {/* TAB 1: MY SEMESTER RECORDS (100% Full Width) */}
        {activeTab === 'records' && (
          <div className="space-y-7 w-full">
            {loading && semesters.length === 0 ? (
              <div className="mt-4 flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-500 border-t-transparent" />
              </div>
            ) : semesters.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center text-center px-4 py-16 border border-white/5 bg-white/[0.02] rounded-[32px]">
                <div className="w-16 h-16 bg-theme-500/20 text-theme-400 rounded-full flex items-center justify-center mb-6">
                  <Plus className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">No semesters yet</h2>
                <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">
                  Get started by adding your semesters manually.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  <button
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#14b8a6] hover:bg-[#0f968c] text-white font-bold flex-1 py-3.5 text-[15px] transition-all shadow-md"
                    onClick={() => {
                      setTargetSemesterId(null)
                      setAnalyzerOpen(true)
                    }}
                  >
                    <Sparkles className="h-5 w-5 shrink-0" />
                    <span>Import Screenshot</span>
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#14b8a6] hover:bg-[#0f968c] text-white font-bold flex-1 py-3.5 text-[15px] transition-all shadow-md"
                    onClick={() => setShowAddSemModal(true)}
                  >
                    <Plus className="h-5 w-5 shrink-0" />
                    <span>Add Semester</span>
                  </button>
                </div>
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
                    onToggleSubmit={handleToggleSubmitSemester}
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

        {/* TAB 2: QUICK GPA CALCULATOR (With TAR UMT Grading Scale side-by-side) */}
        {activeTab === 'calculator' && (
          <div className="grid gap-8 lg:grid-cols-3 items-start w-full">
            {/* Left 2 Cols: Quick Calculator */}
            <div className="lg:col-span-2 rounded-2xl bg-[#131b2e] p-6 sm:p-8 shadow-xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-white">Quick GPA Simulator</h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Simulate grade combinations and credit hours</p>
                </div>

                {showCalcResult && (
                  <button
                    onClick={() => setShowCalcResult(false)}
                    className="flex items-center gap-2 rounded-xl bg-blue-500/15 px-4 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/25 transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Edit Courses</span>
                  </button>
                )}
              </div>

              {/* VIEW MODE 1: DEDICATED RESULT SCREEN AFTER CALCULATE */}
              {showCalcResult ? (
                <div className="space-y-6 py-4 animate-fadeIn">
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-[#0e1626] p-8 text-center border border-white/5">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Calculated GPA</span>
                    <div className="my-2 text-5xl sm:text-6xl font-black text-white tracking-tight">
                      {calcGPA.gpa}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-4 py-1.5 text-xs font-bold text-blue-400">
                      <Award className="h-4 w-4" />
                      <span>{calcStanding.title}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      Based on <strong className="text-white">{calcGPA.totalCredits} Total Credits</strong> across simulated courses
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#0e1626] p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Simulated Course List
                    </h4>
                    <div className="divide-y divide-white/[0.06]">
                      {calcRows
                        .filter(r => r.credits !== '' && r.grade !== '')
                        .map((r, i) => (
                          <div key={r.id} className="flex items-start sm:items-center justify-between gap-3 py-3 text-sm">
                            <span className="font-semibold text-white break-words leading-snug pr-2">
                              {r.name || 'Course'}
                            </span>
                            <div className="flex items-center gap-2 sm:gap-4 shrink-0 pt-0.5 sm:pt-0">
                              <span className="text-right text-xs font-medium text-slate-400 shrink-0">{r.credits} Credits</span>
                              <span className={`inline-flex items-center justify-center w-10 sm:w-11 h-8 rounded-lg font-mono text-xs font-bold shrink-0 border ${getGradeBadgeStyle(r.grade)}`}>
                                {r.grade}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => setShowCalcResult(false)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition-all shadow-md"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Recalculate / Edit Courses</span>
                    </button>
                    <button
                      onClick={() => {
                        setCalcRows([
                          { id: 1, name: '', credits: '', grade: '' },
                          { id: 2, name: '', credits: '', grade: '' },
                          { id: 3, name: '', credits: '', grade: '' }
                        ])
                        setShowCalcResult(false)
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#1e293b] px-6 py-3.5 text-sm font-bold text-slate-300 hover:bg-[#283548] transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW MODE 2: COURSE INPUT TABLE BEFORE CALCULATE */
                <>
                  <div className="divide-y divide-white/[0.06] rounded-xl bg-[#0e1626] overflow-hidden">
                    {calcRows.map(row => (
                      <div
                        key={row.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
                      >
                        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                          <input
                            className="bg-transparent flex-1 text-sm sm:text-base font-semibold text-white placeholder:text-slate-500 focus:outline-none min-w-0 w-full"
                            placeholder="Course"
                            value={row.name}
                            onChange={e => {
                              const val = e.target.value
                              setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, name: val } : r))
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-white/5">
                          <select
                            className="bg-[#1a2236] rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-300 border-0 focus:outline-none"
                            value={row.credits}
                            onChange={e => {
                              const val = e.target.value
                              setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, credits: val } : r))
                            }}
                          >
                            <option value="">Credit</option>
                            {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} Credits</option>)}
                          </select>

                          <select
                            className="bg-[#1a2236] rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-300 border-0 focus:outline-none"
                            value={row.grade}
                            onChange={e => {
                              const val = e.target.value
                              setCalcRows(prev => prev.map(r => r.id === row.id ? { ...r, grade: val } : r))
                            }}
                          >
                            <option value="">Grade</option>
                            {TARUMT_GRADES.map(g => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                          </select>

                          <button
                            onClick={() => setCalcRows(prev => prev.filter(r => r.id !== row.id))}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors ml-auto"
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
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent py-3 text-xs sm:text-sm font-semibold text-blue-400 hover:bg-white/[0.03] transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Row</span>
                  </button>

                  <button
                    onClick={() => {
                      const hasFilled = calcRows.some(r => r.credits !== '' && r.grade !== '')
                      if (!hasFilled) {
                        showToast('Please select at least one Credit & Grade first.', 'warning')
                        return
                      }
                      setShowCalcResult(true)
                    }}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-4 text-base font-extrabold text-white hover:bg-blue-600 transition-all shadow-lg"
                  >
                    <Calculator className="h-5 w-5" />
                    <span>Calculate GPA Result</span>
                  </button>
                </>
              )}
            </div>

            {/* Right 1 Col: TAR UMT Grading Scale Card */}
            <div className="lg:col-span-1 rounded-2xl bg-[#131b2e] p-6 shadow-xl sticky top-6">
              <div className="mb-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                  TAR UMT Grading Scale
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  5.6 Standard Scale · June 2023 Intake & Onwards
                </p>
              </div>

              <div className="space-y-2.5">
                {TARUMT_GRADES.map(g => (
                  <div
                    key={g.grade}
                    className="flex items-center justify-between rounded-xl bg-[#0e1626] px-4 py-2.5 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-8 place-items-center rounded-lg bg-blue-500/15 font-bold text-blue-400">
                        {g.grade}
                      </span>
                      <span className="font-semibold text-slate-300">{g.markRange}%</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white text-sm">{g.point.toFixed(4)}</span>
                      <span className="ml-2 hidden xl:inline text-[10px] text-slate-400 font-medium">{g.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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

function SemesterCard({
  semester,
  semStat,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onDeleteSemester,
  onToggleSubmit,
  onAIImport
}) {
  const isSubmitted = Boolean(semester.is_submitted)

  return (
    <div className="rounded-2xl bg-[#131b2e] p-6 sm:p-7 shadow-xl">
      {/* Semester Card Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h3 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">{semester.name}</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {semester.courses?.length || 0} Courses · <span className="text-slate-300 font-bold">{semStat.totalCredits}</span> Total Credits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* GPA pill */}
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">GPA</span>
            <span className="font-mono text-sm sm:text-lg font-black text-white">{semStat.gpa}</span>
          </div>

          {/* SUBMIT / EDIT Toggle Button */}
          {isSubmitted && (
            <button
              onClick={() => onToggleSubmit(semester.id, false)}
              className="flex items-center gap-1.5 rounded-xl bg-[#1e293b] px-4 py-2 text-xs sm:text-sm font-bold text-slate-200 hover:bg-[#283548] transition-all"
              title="Click to edit courses"
            >
              <Edit2 className="h-3.5 w-3.5 text-blue-400" />
              <span>Edit</span>
            </button>
          )}

          {/* AI Import */}
          {!isSubmitted && (
            <button
              onClick={onAIImport}
              className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-teal-600 transition-colors"
              title="Import from screenshot"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Import</span>
            </button>
          )}

          {/* Delete Semester */}
          <button
            onClick={() => onDeleteSemester(semester.id)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-red-500/15 hover:text-red-400 transition-all"
            title="Delete Semester"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Courses List */}
      {isSubmitted ? (
        /* READ-ONLY VIEW AFTER SUBMIT */
        <div className="divide-y divide-white/[0.06]">
          {(semester.courses || []).length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No courses listed in this semester.</p>
          ) : (
            (semester.courses || []).map((course, idx) => (
              <div
                key={course.id || idx}
                className="flex items-start sm:items-center justify-between gap-3 py-3.5 text-sm sm:text-base"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-1 pr-2">
                  {course.course_code && (
                    <span className="w-fit sm:w-24 shrink-0 text-center font-mono text-xs font-bold uppercase rounded-md sm:rounded-lg bg-white/5 py-0.5 sm:py-1 px-2 text-slate-300 tracking-wider">
                      {course.course_code}
                    </span>
                  )}
                  <span className="font-semibold text-white text-sm sm:text-base leading-snug break-words">
                    {course.course_name || 'Course'}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0 pt-0.5 sm:pt-0">
                  <span className="text-right text-xs sm:text-sm font-medium text-slate-400 shrink-0">
                    {course.credit_hours || 0} Credits
                  </span>
                  <span className={`inline-flex items-center justify-center w-10 sm:w-11 h-8 rounded-lg font-mono text-xs sm:text-sm font-bold shrink-0 border ${getGradeBadgeStyle(course.grade)}`}>
                    {course.grade || '-'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* EDITING MODE INPUT ROWS */
        <>
          <div className="divide-y divide-white/[0.06]">
            {(semester.courses || []).map((course, idx) => (
              <div
                key={course.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 flex-1 w-full sm:w-auto">
                  <input
                    className="w-full sm:w-28 bg-transparent text-xs sm:text-sm font-semibold text-slate-400 placeholder:text-slate-500 focus:outline-none"
                    placeholder="Code"
                    value={course.course_code || ''}
                    onChange={e => onUpdateCourse(semester.id, course.id, { course_code: e.target.value })}
                  />
                  <input
                    className="bg-transparent flex-1 w-full text-sm sm:text-base font-semibold text-white placeholder:text-slate-500 focus:outline-none min-w-0"
                    placeholder="Course"
                    value={course.course_name || ''}
                    onChange={e => onUpdateCourse(semester.id, course.id, { course_name: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-white/5">
                  <div className="flex items-center gap-2.5">
                    <select
                      className="bg-[#1a2236] rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-300 border-0 focus:outline-none"
                      value={course.credit_hours || ''}
                      onChange={e => onUpdateCourse(semester.id, course.id, { credit_hours: e.target.value })}
                    >
                      <option value="">Credit</option>
                      {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} Credits</option>)}
                    </select>

                    <select
                      className="bg-[#1a2236] rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-300 border-0 focus:outline-none"
                      value={course.grade || ''}
                      onChange={e => onUpdateCourse(semester.id, course.id, { grade: e.target.value })}
                    >
                      <option value="">Grade</option>
                      {TARUMT_GRADES.map(g => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={() => onDeleteCourse(semester.id, course.id)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
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
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent py-3 text-xs sm:text-sm font-bold text-blue-400 hover:bg-white/[0.03] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Course</span>
          </button>

          <button
            onClick={() => onToggleSubmit(semester.id, true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-blue-600 transition-all shadow-md"
          >
            <Check className="h-4 w-4" />
            <span>Submit</span>
          </button>
        </>
      )}
    </div>
  )
}
