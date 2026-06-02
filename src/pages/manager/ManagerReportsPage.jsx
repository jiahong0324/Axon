import { Download, FileText } from 'lucide-react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { useEffect, useState } from 'react'
import { createStudentReportDoc, downloadStudentReport } from '../../lib/generateReport'
import { supabase } from '../../lib/supabase'
import { initials } from '../../lib/utils'

export default function ManagerReportsPage() {
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState({ classes: [], assignments: [], exams: [], results: [] })
  const [zipping, setZipping] = useState(false)

  useEffect(() => { loadReports() }, [])

  async function loadReports() {
    const [studentsRes, classesRes, assignmentsRes, examsRes, resultsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
      supabase.from('classes').select('*'),
      supabase.from('assignments').select('*'),
      supabase.from('exams').select('*'),
      supabase.from('exam_results').select('*')
    ])
    setStudents(studentsRes.data || [])
    setRecords({
      classes: classesRes.data || [],
      assignments: assignmentsRes.data || [],
      exams: examsRes.data || [],
      results: resultsRes.data || []
    })
  }

  function reportPayload(student) {
    return {
      student,
      classes: records.classes.filter(item => item.user_id === student.id),
      assignments: records.assignments.filter(item => item.user_id === student.id),
      exams: records.exams.filter(item => item.user_id === student.id),
      examResults: records.results.filter(item => item.student_id === student.id)
    }
  }

  async function exportAll() {
    setZipping(true)
    const zip = new JSZip()
    students.forEach(student => {
      const { doc, fileName } = createStudentReportDoc(reportPayload(student))
      zip.file(fileName, doc.output('blob'))
    })
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
              <button className="manager-primary-btn px-4 py-2 text-sm" onClick={() => downloadStudentReport(reportPayload(student))}><Download className="h-4 w-4" /> Download PDF</button>
            </div>
          ))}
        </div>
        {students.length === 0 && <p className="muted py-8 text-center">No students available for reports.</p>}
      </section>
    </main>
  )
}
