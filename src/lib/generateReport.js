import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { dateLabel, formatTime } from './utils'
import { calculateOverallCGPA, getAcademicStanding } from './tarumtGrading'
import { supabase } from './supabase'
import { fetchFullStudentDetail } from './manageStudent'

export function createStudentReportDoc({ student = {}, classes = [], assignments = [], exams = [], examResults = [], semesters = [], reminders = [] }) {
  const doc = new jsPDF()
  const fullName = student.full_name || student.email || 'Student'
  const resultByExam = new Map(examResults.map(result => [result.exam_id, result]))

  // Resolve semesters through exhaustive fallbacks
  let activeSemesters = Array.isArray(semesters) ? semesters : []
  if (!activeSemesters.length) {
    if (Array.isArray(student?.semesters) && student.semesters.length) {
      activeSemesters = student.semesters
    } else if (Array.isArray(student?.examResultsSemesters) && student.examResultsSemesters.length) {
      activeSemesters = student.examResultsSemesters
    } else if (Array.isArray(student?.user_metadata?.axon_exam_results_semesters) && student.user_metadata.axon_exam_results_semesters.length) {
      activeSemesters = student.user_metadata.axon_exam_results_semesters
    } else if (Array.isArray(student?.metadata?.axon_exam_results_semesters) && student.metadata.axon_exam_results_semesters.length) {
      activeSemesters = student.metadata.axon_exam_results_semesters
    } else if (typeof localStorage !== 'undefined') {
      const studentKey = student?.id ? `axon_exam_results_semesters_${student.id}` : null
      const cachedStudent = studentKey ? localStorage.getItem(studentKey) : null
      const cachedGlobal = localStorage.getItem('axon_exam_results_semesters')
      const cached = cachedStudent || cachedGlobal
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) activeSemesters = parsed
        } catch (e) {}
      }
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text('Axon', 15, 18)
  doc.setFontSize(14)
  doc.text('Student Academic Report', 15, 28)
  doc.setDrawColor(245, 158, 11)
  doc.setLineWidth(1)
  doc.line(15, 32, 195, 32)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, 15, 40)
  doc.text(`Name: ${fullName}`, 15, 47)
  doc.text(`Email: ${student.email || 'N/A'}`, 15, 54)
  doc.text(`Course: ${student.course || 'N/A'}`, 110, 47)
  doc.text(`Student ID: ${student.student_id || 'N/A'}`, 110, 54)

  let y = 65
  const addSection = (title, head, body, emptyText, subtitle = null) => {
    if (y > 230) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(title, 15, y)
    y += 5

    if (subtitle) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(217, 119, 6) // Amber-600
      doc.text(subtitle, 15, y)
      y += 5
    }

    if (!body.length) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(emptyText, 15, y)
      y += 12
      return
    }

    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left: 15, right: 15 },
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5 }
    })
    y = doc.lastAutoTable.finalY + 12
  }

  addSection(
    'Class Timetable',
    ['Subject', 'Type', 'Day', 'Time', 'Room', 'Lecturer'],
    classes.map(c => [
      c.subject,
      c.class_type === 'L' ? 'Lecture' : c.class_type === 'T' ? 'Tutorial' : c.class_type === 'P' ? 'Practical' : c.class_type === 'C' ? 'Class' : c.class_type || 'Class',
      c.day,
      `${formatTime(c.start_time)} - ${formatTime(c.end_time)}`,
      c.classroom || 'TBA',
      c.lecturer || 'TBA'
    ]),
    'No timetable records.'
  )

  addSection(
    'Assignments',
    ['Title', 'Subject', 'Deadline', 'Priority', 'Status'],
    assignments.map(a => [a.title, a.subject, dateLabel(a.deadline), a.priority, a.status]),
    'No assignment records.'
  )

  addSection(
    'Exams & Schedules',
    ['Subject', 'Type', 'Date', 'Venue', 'Score', 'Grade', 'Remarks'],
    exams.map(e => {
      const result = resultByExam.get(e.id)
      return [e.subject, e.exam_type, dateLabel(e.exam_date), e.venue || 'TBA', result?.score ?? '-', result?.grade ?? '-', result?.remarks || '']
    }),
    'No exam records.'
  )

  // Add TAR UMT Exam Results Section
  const semCourseRows = []
  activeSemesters.forEach(sem => {
    const semName = sem.name || sem.semester_name || 'Semester'
    ;(sem.courses || []).forEach(c => {
      const code = c.course_code || c.code || '-'
      const name = c.course_name || c.name || c.subject || ''
      const credits = String(c.credit_hours ?? c.credits ?? 0)
      const grade = c.grade || '-'
      // Include row if it has course details or grades
      if (name.trim() !== '' || grade !== '-' || code !== '-') {
        semCourseRows.push([semName, code, name || 'Course', credits, grade])
      }
    })
  })

  let subtitle = null
  if (semCourseRows.length > 0) {
    const { cgpa, overallCredits } = calculateOverallCGPA(activeSemesters)
    const standing = getAcademicStanding(cgpa, overallCredits)
    subtitle = `TAR UMT Standing: Cumulative CGPA ${cgpa} (${overallCredits} Credits) · ${standing.title}`
  }

  addSection(
    'TAR UMT Exam Results & Semester Record',
    ['Semester', 'Code', 'Course Name', 'Credits', 'Grade'],
    semCourseRows,
    'No semester exam result records.',
    subtitle
  )

  if (Array.isArray(reminders) && reminders.length > 0) {
    addSection(
      'Scheduled Reminders & Study Alerts',
      ['Title', 'Scheduled Time', 'Frequency', 'Status'],
      reminders.map(r => [
        r.title || 'Untitled Reminder',
        formatTime(r.reminder_time) || 'No time',
        r.repeat_type || 'once',
        r.is_active ? 'Active' : 'Inactive'
      ]),
      'No reminders configured.'
    )
  }

  const pageCount = doc.internal.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Axon - Student Academic Report | ${fullName}`, 15, 287)
    doc.text(`Page ${page} of ${pageCount}`, 195, 287, { align: 'right' })
  }

  return { doc, fileName: `${fullName.replace(/[^a-z0-9]+/gi, '_')}_Axon_Report.pdf` }
}

export async function downloadStudentReport(payload) {
  let { student, semesters, reminders } = payload || {}

  // Auto-fetch missing semesters asynchronously
  if ((!semesters || semesters.length === 0) && student?.id) {
    try {
      // 1. Try public database activity_log
      const { data: actLogs } = await supabase
        .from('activity_log')
        .select('entity_name')
        .eq('user_id', student.id)
        .eq('entity_type', 'axon_exam_results_semesters')
        .order('created_at', { ascending: false })
        .limit(1)

      if (actLogs && actLogs[0]?.entity_name) {
        try {
          const parsed = JSON.parse(actLogs[0].entity_name)
          if (Array.isArray(parsed) && parsed.length > 0) {
            payload.semesters = parsed
          }
        } catch (e) {}
      }

      // 2. Try fetchFullStudentDetail
      if (!payload.semesters || payload.semesters.length === 0) {
        const full = await fetchFullStudentDetail(student.id).catch(() => null)
        if (full?.examResultsSemesters && full.examResultsSemesters.length > 0) {
          payload.semesters = full.examResultsSemesters
        }
        if (!payload.reminders && full?.reminders) {
          payload.reminders = full.reminders
        }
      }
    } catch (e) {
      console.warn('Auto-fetch semesters error in downloadStudentReport:', e)
    }
  }

  if (!payload.reminders && student?.id) {
    try {
      const { data: rems } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', student.id)
        .order('reminder_time')
      if (rems && rems.length > 0) {
        payload.reminders = rems
      }
    } catch (e) {}
  }

  const { doc, fileName } = createStudentReportDoc(payload)
  doc.save(fileName)
}
