import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { dateLabel, formatTime } from './utils'

export function createStudentReportDoc({ student, classes = [], assignments = [], exams = [], examResults = [] }) {
  const doc = new jsPDF()
  const fullName = student.full_name || student.email || 'Student'
  const resultByExam = new Map(examResults.map(result => [result.exam_id, result]))

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
  const addSection = (title, head, body, emptyText) => {
    if (y > 235) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(title, 15, y)
    y += 5
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
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      styles: { fontSize: 8.5, cellPadding: 2.5 }
    })
    y = doc.lastAutoTable.finalY + 12
  }

  addSection(
    'Class Timetable',
    ['Subject', 'Type', 'Day', 'Time', 'Room', 'Lecturer'],
    classes.map(c => [
      c.subject,
      c.class_type === 'L' ? 'Lecture' : c.class_type === 'T' ? 'Tutorial' : c.class_type === 'P' ? 'Practical' : c.class_type || '',
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
    'Exams & Results',
    ['Subject', 'Type', 'Date', 'Venue', 'Score', 'Grade', 'Remarks'],
    exams.map(e => {
      const result = resultByExam.get(e.id)
      return [e.subject, e.exam_type, dateLabel(e.exam_date), e.venue || 'TBA', result?.score ?? '-', result?.grade ?? '-', result?.remarks || '']
    }),
    'No exam records.'
  )

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

export function downloadStudentReport(payload) {
  const { doc, fileName } = createStudentReportDoc(payload)
  doc.save(fileName)
}
