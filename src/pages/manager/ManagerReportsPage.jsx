import { Download, FileText } from 'lucide-react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { useEffect, useState } from 'react'
import { createStudentReportDoc, downloadStudentReport } from '../../lib/generateReport'
import { fetchFullStudentDetail } from '../../lib/manageStudent'
import { supabase } from '../../lib/supabase'
import { initials } from '../../lib/utils'

export default function ManagerReportsPage() {
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState({ classes: [], assignments: [], exams: [], results: [], semsByUser: new Map() })
  const [zipping, setZipping] = useState(false)

  useEffect(() => { loadReports() }, [])

  async function loadReports() {
    const [studentsRes, classesRes, assignmentsRes, examsRes, resultsRes, semsLogRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
      supabase.from('classes').select('*'),
      supabase.from('assignments').select('*'),
      supabase.from('exams').select('*'),
      supabase.from('exam_results').select('*'),
      supabase.from('activity_log').select('*').eq('entity_type', 'axon_exam_results_semesters').order('created_at', { ascending: false })
    ])

    const semsByUser = new Map()
    ;(semsLogRes.data || []).forEach(log => {
      if (!semsByUser.has(log.user_id) && log.entity_name) {
        try {
          const parsed = JSON.parse(log.entity_name)
          if (Array.isArray(parsed) && parsed.length > 0) {
            semsByUser.set(log.user_id, parsed)
          }
        } catch (e) {}
      }
    })

    setStudents(studentsRes.data || [])
    setRecords({
      classes: classesRes.data || [],
      assignments: assignmentsRes.data || [],
      exams: examsRes.data || [],
      results: resultsRes.data || [],
      semsByUser
    })
  }

  function reportPayload(student) {
    return {
      student,
      classes: records.classes.filter(item => item.user_id === student.id),
      assignments: records.assignments.filter(item => item.user_id === student.id),
      exams: records.exams.filter(item => item.user_id === student.id),
      examResults: records.results.filter(item => item.student_id === student.id),
      semesters: records.semsByUser?.get(student.id) || student.semesters || []
    }
  }

  async function exportAll() {
    setZipping(true)
    const zip = new JSZip()
    for (const student of students) {
      const payload = reportPayload(student)
      if (!payload.semesters || payload.semesters.length === 0) {
        try {
          const full = await fetchFullStudentDetail(student.id).catch(() => null)
          if (full?.examResultsSemesters?.length) {
            payload.semesters = full.examResultsSemesters
          }
        } catch (e) {}
      }
      const { doc, fileName } = createStudentReportDoc(payload)
      zip.file(fileName, doc.output('blob'))
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, 'Axon_All_Reports.zip')
    setZipping(false)
  }

  return (
    <main className="main-content">
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="page-title mb-1 flex items-center gap-2"><FileText className="h-6 w-6 text-amber-400" /> Reports</h1>
          <p className="muted">Download academic PDF reports for each student.</p>
        </div>
        <button className="manager-primary-btn" onClick={exportAll} disabled={zipping || students.length === 0}><Download className="h-4 w-4" /> {zipping ? 'Preparing ZIP...' : 'Export All as ZIP'}</button>
      </div>

      <section className="card overflow-x-auto">
        <div className="min-w-[680px] divide-y divide-white/10">
          {students.map(student => (
            <div key={student.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full font-semibold text-white" style={{ background: student.avatar_color || '#F59E0B' }}>{initials(student.full_name || student.email)}</div>
                <div><p className="font-semibold">{student.full_name || 'Unnamed student'}</p><p className="text-xs text-slate-500">{student.student_id || 'No student ID'}</p></div>
              </div>
              <p className="truncate text-sm text-slate-300">{student.email}</p>
              <p className="truncate text-sm text-slate-300">{student.course || 'No course'}</p>
              <button
                className="manager-primary-btn px-4 py-2 text-sm"
                onClick={() => downloadStudentReport(reportPayload(student))}
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          ))}
        </div>
        {students.length === 0 && <p className="muted py-8 text-center">No students available for reports.</p>}
      </section>
    </main>
  )
}
