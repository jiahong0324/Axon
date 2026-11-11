import { Download, FileJson, LogOut, Mail, Save, ShieldAlert, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ToggleSwitch from '../components/ToggleSwitch'
import { useConfirmDialog } from '../components/ConfirmModal'
import { useTheme } from '../components/ThemeProvider'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { initials, formatTime } from '../lib/utils'
import { registerPushSubscription } from '../lib/pushNotifications'
import { updatePreference } from '../lib/preferences'
import { clearCache, readCache } from '../lib/cache'
import { studentManager } from '../lib/manageStudent'
import { useLanguage } from '../components/LanguageProvider'
import { markExplicitLogout } from '../lib/authEvents'
import { fetchExerciseData } from '../lib/exerciseUtils'
import { fetchNutritionData, formatMealTime } from '../lib/nutritionUtils'
import { logActivity } from '../lib/logActivity'
import { updateAuthCache } from '../components/ProtectedRoute'
const tabs = [
  ['profile', 'Profile'],
  ['account', 'Account'],
  ['appearance', 'Appearance'],
  ['notifications', 'Notifications'],
  ['ai', 'AI'],
  ['email-planner', 'Email Digest'],
  ['data', 'Data']
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const themeCtx = useTheme()
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ full_name: '', university: '', course: '', student_id: '', avatar_color: 'blue' })
  const [security, setSecurity] = useState({ email: '', password: '' })
  const [notificationPermission, setNotificationPermission] = useState('Notification' in window ? Notification.permission : 'default')
  const [sendingTest, setSendingTest] = useState(false)
  const isAndroidDevice = /Android/i.test(navigator.userAgent)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [digestOptions, setDigestOptions] = useState({ classes: true, assignments: true, exams: true, results: true, exercise: true, nutrition: true })
  const [sendingDigest, setSendingDigest] = useState(false)
  const [exportingBackup, setExportingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const backupInputRef = useRef(null)

  async function sendAcademicEmail() {
    if (!digestOptions.classes && !digestOptions.assignments && !digestOptions.exams && !digestOptions.results && !digestOptions.exercise && !digestOptions.nutrition) {
      return showToast('Please select at least one planner section to include.', 'warning')
    }
    setSendingDigest(true)
    showToast('Sending academic report to your email...', 'info')
    try {
      await studentManager.sendAcademicDigest(user.id, digestOptions)
      showToast('Academic report successfully sent to your email!', 'success')
      if (user?.id) {
        logActivity('Emailed academic report', 'settings', 'Email digest', user.id, {
          sections: Object.keys(digestOptions).filter(k => digestOptions[k]).join(', ')
        }).catch(() => {})
      }
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to send email report.', 'error')
    } finally {
      setSendingDigest(false)
    }
  }

  useEffect(() => { loadUser() }, [])

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setUser(user)
    setProfile({
      full_name: profileRow?.full_name || user?.user_metadata?.full_name || '',
      university: profileRow?.university || user?.user_metadata?.university || '',
      course: profileRow?.course || user?.user_metadata?.course || '',
      student_id: profileRow?.student_id || user?.user_metadata?.student_id || '',
      avatar_color: colorName(profileRow?.avatar_color || user?.user_metadata?.avatar_color || 'blue')
    })
    setSecurity(s => ({ ...s, email: profileRow?.email || user?.email || '' }))
  }

  async function saveProfile() {
    const { error } = await supabase.auth.updateUser({ data: profile })
    if (!error && user) {
      await supabase.from('profiles').update({
        full_name: profile.full_name,
        university: profile.university,
        course: profile.course,
        student_id: profile.student_id,
        avatar_color: accentHex(profile.avatar_color)
      }).eq('id', user.id)

      updateAuthCache({
        full_name: profile.full_name,
        university: profile.university,
        course: profile.course,
        student_id: profile.student_id,
        avatar_color: accentHex(profile.avatar_color)
      })

      logActivity('Updated profile', 'settings', profile.full_name || 'Profile details', user.id, {
        full_name: profile.full_name,
        university: profile.university,
        course: profile.course,
        student_id: profile.student_id,
        avatar_color: profile.avatar_color
      }).catch(() => {})
    }
    showToast(error ? 'Profile could not be saved.' : 'Profile saved.', error ? 'error' : 'success')
  }

  async function updateEmail() {
    const { error } = await supabase.auth.updateUser({ email: security.email })
    if (!error && user) {
      await supabase.from('profiles').update({ email: security.email }).eq('id', user.id)
      logActivity('Changed email', 'settings', security.email, user.id, {
        new_email: security.email
      }).catch(() => {})
    }
    showToast(error ? 'Email update failed.' : 'Check your inbox to confirm the new email.', error ? 'error' : 'success')
  }

  async function updatePassword() {
    const { error } = await supabase.auth.updateUser({ password: security.password })
    if (!error && user) {
      logActivity('Changed password', 'settings', 'Account security', user.id).catch(() => {})
    }
    showToast(error ? 'Password update failed.' : 'Password updated.', error ? 'error' : 'success')
    setSecurity(s => ({ ...s, password: '' }))
  }

  async function handleInvite() {
    if (!inviteEmail) return showToast('Please enter an email.', 'error')
    setInviting(true)
    try {
      await studentManager.inviteUser(inviteEmail, 'student')
      showToast('Invitation sent successfully!', 'success')
      setInviteEmail('')
    } catch (err) {
      showToast(err.message || 'Failed to send invite.', 'error')
    } finally {
      setInviting(false)
    }
  }

  async function exportData() {
    showToast('Preparing academic PDF report...', 'info')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return showToast('User session not found.', 'error')

      const tables = ['classes', 'assignments', 'exams', 'reminders']
      const result = {}
      for (const table of tables) {
        const { data } = await supabase.from(table).select('*').eq('user_id', user.id)
        result[table] = data || []
      }
      const [exerciseInfo, nutritionInfo] = await Promise.all([
        fetchExerciseData(user.id),
        fetchNutritionData(user.id)
      ])

      const doc = new jsPDF()

      // --- Title & Header ---
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(15, 23, 42) // slate-900
      doc.text('AXON ACADEMIC OVERVIEW', 15, 20)

      // Accent Line
      doc.setDrawColor(59, 130, 246) // theme-500
      doc.setLineWidth(1)
      doc.line(15, 24, 195, 24)

      // Student Profile Info
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(71, 85, 105) // slate-600

      // Left Column Info
      doc.text(`Student Name: ${profile.full_name || 'N/A'}`, 15, 32)
      doc.text(`Email Address: ${user.email || 'N/A'}`, 15, 38)
      doc.text(`University: ${profile.university || 'N/A'}`, 15, 44)

      // Right Column Info
      doc.text(`Course/Major: ${profile.course || 'N/A'}`, 110, 32)
      doc.text(`Student ID: ${profile.student_id || 'N/A'}`, 110, 38)
      doc.text(`Export Date: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 110, 44)

      let yPos = 52

      // Function to add table if there is data
      const addSectionTable = (title, headers, rows, emptyMsg) => {
        // Add section header
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(15, 23, 42) // slate-900

        // Check space remaining, page break if needed
        if (yPos > 240) {
          doc.addPage()
          yPos = 20
        }

        doc.text(title, 15, yPos)
        yPos += 4

        if (rows.length === 0) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(10)
          doc.setTextColor(148, 163, 184) // slate-400
          doc.text(emptyMsg, 15, yPos)
          yPos += 12
        } else {
          autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: rows,
            margin: { left: 15, right: 15 },
            theme: 'striped',
            headStyles: {
              fillColor: [30, 41, 59], // slate-800
              textColor: 255,
              fontStyle: 'bold'
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252] // slate-50
            },
            styles: {
              fontSize: 9,
              cellPadding: 3
            }
          })
          yPos = doc.lastAutoTable.finalY + 12
        }
      }

      // 1. Classes
      const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const classesData = (result.classes || []).sort((a, b) => {
        const dayDiff = daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day)
        if (dayDiff !== 0) return dayDiff
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      }).map(c => [
        c.day,
        c.subject,
        `${formatTime(c.start_time)} - ${formatTime(c.end_time)}`,
        c.class_type === 'L' ? 'Lecture' : c.class_type === 'T' ? 'Tutorial' : c.class_type === 'P' ? 'Practical' : c.class_type === 'C' ? 'Class' : c.class_type || 'Class',
        c.classroom || 'TBA',
        c.lecturer || 'TBA'
      ])
      addSectionTable(
        'Weekly Timetable',
        ['Day', 'Subject', 'Time', 'Type', 'Classroom', 'Lecturer'],
        classesData,
        'No classes in timetable.'
      )

      // 2. Assignments
      const assignmentsData = (result.assignments || []).sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline.localeCompare(b.deadline)
      }).map(a => [
        a.title,
        a.subject,
        a.deadline ? new Date(a.deadline).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A',
        a.priority,
        a.status,
        a.notes || ''
      ])
      addSectionTable(
        'Assignments',
        ['Title', 'Subject', 'Deadline', 'Priority', 'Status', 'Notes'],
        assignmentsData,
        'No assignments found.'
      )

      // 3. Exams
      const examsData = (result.exams || []).sort((a, b) => {
        if (!a.exam_date) return 1
        if (!b.exam_date) return -1
        return a.exam_date.localeCompare(b.exam_date)
      }).map(e => [
        e.subject,
        e.exam_type,
        e.exam_date ? new Date(e.exam_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A',
        e.start_time && e.end_time ? `${formatTime(e.start_time)} - ${formatTime(e.end_time)}` : formatTime(e.start_time) || 'TBA',
        e.venue || 'TBA',
        e.notes || ''
      ])
      addSectionTable(
        'Exams Schedule',
        ['Subject', 'Type', 'Date', 'Time', 'Venue', 'Notes'],
        examsData,
        'No exams found.'
      )

      // 4. Reminders
      const remindersData = (result.reminders || []).sort((a, b) => {
        if (!a.reminder_time) return 1
        if (!b.reminder_time) return -1
        return a.reminder_time.localeCompare(b.reminder_time)
      }).map(r => [
        r.title,
        formatTime(r.reminder_time) || 'TBA',
        r.repeat_type,
        r.is_active ? 'Active' : 'Inactive'
      ])
      addSectionTable(
        'Smart Reminders',
        ['Title', 'Time', 'Repeat Type', 'Status'],
        remindersData,
        'No reminders found.'
      )

      // 5. TAR UMT Exam Results & CGPA
      let semRecords = []
      try {
        const cachedSems = localStorage.getItem('axon_exam_results_semesters')
        if (cachedSems) semRecords = JSON.parse(cachedSems)
      } catch (e) {
        semRecords = []
      }
      const examResultsData = []
      semRecords.forEach(sem => {
        (sem.courses || []).forEach(c => {
          examResultsData.push([
            sem.name,
            c.course_code || '-',
            c.course_name,
            String(c.credit_hours),
            c.grade
          ])
        })
      })
      addSectionTable(
        'TAR UMT Exam Results & Semesters',
        ['Semester', 'Code', 'Course Name', 'Credits', 'Grade'],
        examResultsData,
        'No semester exam results found.'
      )

      // 6. Health: Workout & Habit Logs
      const exerciseLogsData = (exerciseInfo.logs || []).map(l => [
        l.log_date ? new Date(l.log_date + 'T00:00:00').toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A',
        l.activity_type || 'Gym',
        `+${l.xp_earned || 20} XP`
      ])
      addSectionTable(
        `Health: Workout & Habit Logs (Total XP: ${exerciseInfo.xpTotal || 0})`,
        ['Date', 'Activity Type', 'XP Earned'],
        exerciseLogsData,
        'No workout logs found.'
      )

      // 7. Health: Diet & Nutrition Intake
      const nutGoals = nutritionInfo?.goals || { calories: 2000, protein: 120, carbs: 250, fats: 65 }
      const nutritionLogsData = (nutritionInfo?.logs || []).slice(0, 40).map(l => [
        l.date ? new Date(l.date + 'T00:00:00').toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A',
        formatMealTime(l.meal_time, l.created_at) || 'N/A',
        l.meal_type || 'Lunch',
        l.name || 'Meal',
        `${l.calories || 0} kcal`,
        `${l.protein || 0}g`,
        `${l.carbs || 0}g`,
        `${l.fats || 0}g`
      ])
      addSectionTable(
        `Health: Diet & Nutrition Intake (Target: ${nutGoals.calories} kcal · P: ${nutGoals.protein}g · C: ${nutGoals.carbs}g · F: ${nutGoals.fats}g)`,
        ['Date', 'Time', 'Meal', 'Food Item', 'Calories', 'Protein', 'Carbs', 'Fats'],
        nutritionLogsData,
        'No diet or nutrition intake logs recorded.'
      )

      // Add Page Numbers/Footer dynamically on each page
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(`Page ${i} of ${pageCount}`, 195, 287, { align: 'right' })
        doc.text('Generated by Axon Academic Planner', 15, 287)
      }

      doc.save('axon-academic-report.pdf')
      showToast('PDF report successfully exported!', 'success')
      if (user?.id) {
        logActivity('Exported academic PDF', 'settings', 'PDF Report', user.id).catch(() => {})
      }
    } catch (error) {
      console.error(error)
      showToast('Failed to export PDF report.', 'error')
    }
  }

  async function exportJsonBackup() {
    setExportingBackup(true)
    showToast('Preparing JSON backup...', 'info')
    try {
      const { data: { user: activeUser } } = await supabase.auth.getUser()
      if (!activeUser) return showToast('User session not found.', 'error')

      const [
        classesRes,
        assignmentsRes,
        examsRes,
        remindersRes,
        semestersRes,
        semCoursesRes,
        profileRes,
        backupLogsRes
      ] = await Promise.all([
        supabase.from('classes').select('*').eq('user_id', activeUser.id),
        supabase.from('assignments').select('*').eq('user_id', activeUser.id),
        supabase.from('exams').select('*').eq('user_id', activeUser.id),
        supabase.from('reminders').select('*').eq('user_id', activeUser.id),
        supabase.from('student_semesters').select('*').eq('user_id', activeUser.id).order('created_at'),
        supabase.from('student_semester_courses').select('*').eq('user_id', activeUser.id).order('created_at'),
        supabase.from('profiles').select('full_name, university, course, student_id, avatar_color').eq('id', activeUser.id).maybeSingle(),
        supabase.from('activity_log')
          .select('entity_type, details, created_at')
          .eq('user_id', activeUser.id)
          .in('entity_type', ['axon_linked_timetables', 'axon_exam_results_semesters'])
          .order('created_at', { ascending: false })
          .limit(20)
      ])

      const readFallback = (key, selector = d => d) => {
        const cached = readCache(key, 365 * 24 * 60 * 60 * 1000)
        const selected = cached ? selector(cached) : []
        return Array.isArray(selected) ? selected : []
      }

      const dbErrors = [classesRes.error, assignmentsRes.error, examsRes.error, remindersRes.error].filter(Boolean)
      if (dbErrors.length > 0) {
        console.error('JSON backup DB warnings:', {
          classes: classesRes.error,
          assignments: assignmentsRes.error,
          exams: examsRes.error,
          reminders: remindersRes.error
        })
        showToast('Some cloud tables could not be queried; using available local backup cache where possible.', 'warning')
      }

      const rawClasses = classesRes.error
        ? readFallback(`axon_classes_${activeUser.id}`)
        : (classesRes.data || [])
      const rawAssignments = assignmentsRes.error
        ? readFallback(`axon_assignments_${activeUser.id}`)
        : (assignmentsRes.data || [])
      const rawExams = examsRes.error
        ? readFallback(`axon_exams_${activeUser.id}`, d => (Array.isArray(d) ? d : d?.exams || []))
        : (examsRes.data || [])
      const rawReminders = remindersRes.error
        ? readFallback(`axon_reminders_${activeUser.id}`)
        : (remindersRes.data || [])

      const logs = backupLogsRes.data || []
      const logLinked = logs.find(l => l.entity_type === 'axon_linked_timetables')?.details?.profiles
      const localLinked = safeParseArray(localStorage.getItem(`axon_linked_timetables_${activeUser.id}`))
      const metaLinked = Array.isArray(activeUser.user_metadata?.linked_timetables) ? activeUser.user_metadata.linked_timetables : []
      const linkedTimetables = dedupeByKey(
        [...localLinked, ...metaLinked, ...(Array.isArray(logLinked) ? logLinked : [])],
        backupRowKeys.linked
      )

      const coursesBySemId = new Map()
      ;(semCoursesRes.data || []).forEach(c => {
        const list = coursesBySemId.get(c.semester_id) || []
        list.push({
          course_code: c.course_code || '',
          course_name: c.course_name,
          credit_hours: Number(c.credit_hours) || 3,
          grade: c.grade
        })
        coursesBySemId.set(c.semester_id, list)
      })

      const sqlSemesters = (semestersRes.data || []).map(s => ({
        name: s.name,
        courses: coursesBySemId.get(s.id) || []
      }))
      const logSems = logs.find(l => l.entity_type === 'axon_exam_results_semesters')?.details?.semesters
      const localSems = [
        ...safeParseArray(localStorage.getItem(`axon_exam_results_semesters_${activeUser.id}`)),
        ...safeParseArray(localStorage.getItem('axon_exam_results_semesters'))
      ]
      const metaSems = Array.isArray(activeUser.user_metadata?.axon_exam_results_semesters)
        ? activeUser.user_metadata.axon_exam_results_semesters
        : []
      const studentSemesters = dedupeByKey(
        [...sqlSemesters, ...localSems, ...metaSems, ...(Array.isArray(logSems) ? logSems : [])].filter(s => s?.name),
        backupRowKeys.semester
      )

      const prefs = activeUser.user_metadata?.preferences || {}
      const payload = {
        version: 1,
        app: 'Axon',
        exportedAt: new Date().toISOString(),
        userId: activeUser.id,
        email: activeUser.email,
        profile: {
          full_name: profileRes.data?.full_name || profile.full_name || activeUser.user_metadata?.full_name || '',
          university: profileRes.data?.university || profile.university || activeUser.user_metadata?.university || '',
          course: profileRes.data?.course || profile.course || activeUser.user_metadata?.course || '',
          student_id: profileRes.data?.student_id || profile.student_id || activeUser.user_metadata?.student_id || '',
          avatar_color: profileRes.data?.avatar_color || accentHex(profile.avatar_color)
        },
        semesterSettings: {
          name: prefs.axon_semester_name ?? localStorage.getItem('axon_semester_name') ?? '',
          startDate: prefs.axon_semester_start_date ?? localStorage.getItem('axon_semester_start_date') ?? '',
          endDate: prefs.axon_semester_end_date ?? localStorage.getItem('axon_semester_end_date') ?? ''
        },
        linked_timetables: linkedTimetables,
        classes: dedupeByKey(rawClasses, backupRowKeys.class).map(c => ({
          subject: c.subject,
          day: c.day,
          start_time: c.start_time,
          end_time: c.end_time,
          lecturer: c.lecturer || '',
          classroom: c.classroom || '',
          class_type: c.class_type || 'Lecture',
          color: c.color || '#3B82F6',
          is_replacement: Boolean(c.is_replacement),
          date: c.date || null
        })),
        assignments: dedupeByKey(rawAssignments, backupRowKeys.assignment).map(a => ({
          title: a.title,
          subject: a.subject || '',
          deadline: a.deadline || '',
          priority: a.priority || 'Medium',
          notes: a.notes || '',
          status: a.status || 'Pending'
        })),
        exams: dedupeByKey(rawExams, backupRowKeys.exam).map(ex => ({
          subject: ex.subject,
          exam_date: ex.exam_date || '',
          start_time: ex.start_time || '',
          end_time: ex.end_time || '',
          exam_type: ex.exam_type || 'Final',
          venue: ex.venue || '',
          notes: ex.notes || ''
        })),
        reminders: dedupeByKey(rawReminders, backupRowKeys.reminder).map(r => ({
          title: r.title,
          reminder_time: r.reminder_time || '09:00',
          repeat_type: r.repeat_type || 'once',
          is_active: r.is_active !== false,
          completed: Boolean(r.completed)
        })),
        student_semesters: studentSemesters
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `axon-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast('JSON backup exported!', 'success')
      logActivity('Exported JSON backup', 'settings', 'JSON Backup', activeUser.id).catch(() => {})
    } catch (error) {
      console.error('Export JSON backup error:', error)
      showToast('Failed to export JSON backup.', 'error')
    } finally {
      setExportingBackup(false)
    }
  }

  async function importJsonBackup(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    let backup
    try {
      const text = await file.text()
      backup = JSON.parse(text)
    } catch {
      return showToast('Invalid JSON backup file.', 'error')
    }

    const hasRecognizedSection = backup && typeof backup === 'object' && (
      Array.isArray(backup.classes) ||
      Array.isArray(backup.assignments) ||
      Array.isArray(backup.exams) ||
      Array.isArray(backup.reminders) ||
      Array.isArray(backup.linked_timetables) ||
      Array.isArray(backup.student_semesters) ||
      (backup.profile && typeof backup.profile === 'object') ||
      (backup.semesterSettings && typeof backup.semesterSettings === 'object')
    )
    if (!hasRecognizedSection) {
      return showToast('Backup file does not contain recognized Axon data.', 'error')
    }

    const confirmed = await confirm({
      title: 'Restore from JSON backup?',
      message: 'Your existing records will be kept intact, and only missing items from this backup will be merged into your account.',
      confirmText: 'Restore Backup'
    })
    if (!confirmed) return

    setRestoringBackup(true)
    showToast('Restoring backup data...', 'info')
    try {
      const { data: { user: activeUser } } = await supabase.auth.getUser()
      if (!activeUser) return showToast('User session not found.', 'error')

      const counts = { classes: 0, assignments: 0, exams: 0, reminders: 0, linked: 0, semesters: 0 }
      const restoreErrors = []

      const mergeTable = async (table, rows, keyFn, mapRow) => {
        if (!Array.isArray(rows) || rows.length === 0) return 0
        const { data: existing, error: fetchErr } = await supabase.from(table).select('*').eq('user_id', activeUser.id)
        if (fetchErr) {
          restoreErrors.push(`${table}: ${fetchErr.message}`)
          return 0
        }
        const seen = new Set((existing || []).map(keyFn))
        const toInsert = []
        dedupeByKey(rows, keyFn).forEach(row => {
          const mapped = mapRow(row, activeUser.id)
          if (!mapped) return
          const k = keyFn(mapped)
          if (!seen.has(k)) {
            seen.add(k)
            toInsert.push(mapped)
          }
        })
        if (toInsert.length === 0) return 0
        const { error: insertErr } = await supabase.from(table).insert(toInsert)
        if (insertErr) {
          restoreErrors.push(`${table}: ${insertErr.message}`)
          return 0
        }
        return toInsert.length
      }

      counts.classes = await mergeTable('classes', backup.classes, backupRowKeys.class, (c, uid) =>
        c?.subject ? {
          user_id: uid,
          subject: String(c.subject),
          day: c.day || 'Monday',
          start_time: c.start_time || '09:00',
          end_time: c.end_time || '10:00',
          lecturer: c.lecturer || '',
          classroom: c.classroom || '',
          class_type: c.class_type || 'Lecture',
          color: c.color || '#3B82F6',
          is_replacement: Boolean(c.is_replacement),
          date: c.date || null
        } : null
      )

      counts.assignments = await mergeTable('assignments', backup.assignments, backupRowKeys.assignment, (a, uid) =>
        a?.title ? {
          user_id: uid,
          title: String(a.title),
          subject: a.subject || '',
          deadline: a.deadline || null,
          priority: a.priority || 'Medium',
          notes: a.notes || '',
          status: a.status || 'Pending'
        } : null
      )

      counts.exams = await mergeTable('exams', backup.exams, backupRowKeys.exam, (ex, uid) =>
        ex?.subject ? {
          user_id: uid,
          subject: String(ex.subject),
          exam_date: ex.exam_date || null,
          start_time: ex.start_time || '',
          end_time: ex.end_time || '',
          exam_type: ex.exam_type || 'Final',
          venue: ex.venue || '',
          notes: ex.notes || ''
        } : null
      )

      counts.reminders = await mergeTable('reminders', backup.reminders, backupRowKeys.reminder, (r, uid) =>
        r?.title ? {
          user_id: uid,
          title: String(r.title),
          reminder_time: r.reminder_time || '09:00',
          repeat_type: r.repeat_type || 'once',
          is_active: r.is_active !== false,
          completed: Boolean(r.completed)
        } : null
      )

      if (Array.isArray(backup.linked_timetables) && backup.linked_timetables.length > 0) {
        const existingLinked = safeParseArray(localStorage.getItem(`axon_linked_timetables_${activeUser.id}`))
        const metaLinked = Array.isArray(activeUser.user_metadata?.linked_timetables) ? activeUser.user_metadata.linked_timetables : []
        const baseLinked = dedupeByKey([...existingLinked, ...metaLinked], backupRowKeys.linked)
        const baseKeys = new Set(baseLinked.map(backupRowKeys.linked))
        const mergedLinked = dedupeByKey([...baseLinked, ...backup.linked_timetables], backupRowKeys.linked)
        counts.linked = mergedLinked.filter(item => !baseKeys.has(backupRowKeys.linked(item))).length
        localStorage.setItem(`axon_linked_timetables_${activeUser.id}`, JSON.stringify(mergedLinked))
        await supabase.auth.updateUser({ data: { linked_timetables: mergedLinked } }).catch(() => {})
        logActivity('Synced linked timetables', 'axon_linked_timetables', `${mergedLinked.length} profile(s)`, activeUser.id, {
          profiles: mergedLinked
        }).catch(() => {})
      }

      if (backup.semesterSettings && typeof backup.semesterSettings === 'object') {
        const nextSemSettings = {
          axon_semester_name: backup.semesterSettings.name || localStorage.getItem('axon_semester_name') || '',
          axon_semester_start_date: backup.semesterSettings.startDate || localStorage.getItem('axon_semester_start_date') || '',
          axon_semester_end_date: backup.semesterSettings.endDate || localStorage.getItem('axon_semester_end_date') || ''
        }
        Object.entries(nextSemSettings).forEach(([k, v]) => localStorage.setItem(k, v))
        const existingPrefs = activeUser.user_metadata?.preferences || {}
        await supabase.auth.updateUser({
          data: {
            preferences: { ...existingPrefs, ...nextSemSettings },
            semester_name: nextSemSettings.axon_semester_name,
            semester_start_date: nextSemSettings.axon_semester_start_date,
            semester_end_date: nextSemSettings.axon_semester_end_date
          }
        }).catch(() => {})
      }

      if (Array.isArray(backup.student_semesters) && backup.student_semesters.length > 0) {
        const { data: existingSems, error: semFetchErr } = await supabase.from('student_semesters').select('*').eq('user_id', activeUser.id)
        const { data: existingCourses } = await supabase.from('student_semester_courses').select('*').eq('user_id', activeUser.id)
        if (semFetchErr) {
          restoreErrors.push(`student_semesters: ${semFetchErr.message}`)
        } else {
          const semByName = new Map((existingSems || []).map(s => [String(s.name || '').trim().toLowerCase(), s]))
          const courseKeys = new Set((existingCourses || []).map(c =>
            `${c.semester_id}|${String(c.course_code || '').trim().toLowerCase()}|${String(c.course_name || '').trim().toLowerCase()}`
          ))
          for (const sem of backup.student_semesters) {
            const semName = String(sem?.name || '').trim()
            if (!semName) continue
            let targetSem = semByName.get(semName.toLowerCase())
            if (!targetSem) {
              const { data: insertedSem, error: semInsErr } = await supabase
                .from('student_semesters')
                .insert({ user_id: activeUser.id, name: semName })
                .select()
                .maybeSingle()
              if (semInsErr) {
                restoreErrors.push(`student_semesters: ${semInsErr.message}`)
                continue
              }
              targetSem = insertedSem
              semByName.set(semName.toLowerCase(), targetSem)
              counts.semesters += 1
            }
            if (targetSem?.id && Array.isArray(sem.courses) && sem.courses.length > 0) {
              const missingCourses = []
              for (const c of sem.courses) {
                if (!c?.course_name) continue
                const cKey = `${targetSem.id}|${String(c.course_code || '').trim().toLowerCase()}|${String(c.course_name || '').trim().toLowerCase()}`
                if (!courseKeys.has(cKey)) {
                  courseKeys.add(cKey)
                  missingCourses.push({
                    semester_id: targetSem.id,
                    user_id: activeUser.id,
                    course_code: c.course_code || '',
                    course_name: c.course_name,
                    credit_hours: Number(c.credit_hours) || 3,
                    grade: c.grade || 'A'
                  })
                }
              }
              if (missingCourses.length > 0) {
                const { error: courseErr } = await supabase.from('student_semester_courses').insert(missingCourses)
                if (courseErr) restoreErrors.push(`student_semester_courses: ${courseErr.message}`)
              }
            }
          }
        }

        const existingLocalSems = [
          ...safeParseArray(localStorage.getItem(`axon_exam_results_semesters_${activeUser.id}`)),
          ...safeParseArray(localStorage.getItem('axon_exam_results_semesters'))
        ]
        const mergedSems = dedupeByKey(
          [...existingLocalSems, ...backup.student_semesters].filter(s => s?.name),
          backupRowKeys.semester
        )
        localStorage.setItem(`axon_exam_results_semesters_${activeUser.id}`, JSON.stringify(mergedSems))
        localStorage.setItem('axon_exam_results_semesters', JSON.stringify(mergedSems))
        await supabase.auth.updateUser({ data: { axon_exam_results_semesters: mergedSems } }).catch(() => {})
      }

      if (backup.profile && typeof backup.profile === 'object') {
        const bp = backup.profile
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, role, full_name, university, course, student_id, avatar_color')
          .eq('id', activeUser.id)
          .maybeSingle()

        const nextProfileFields = {
          full_name: bp.full_name || existingProfile?.full_name || profile.full_name || '',
          university: bp.university || existingProfile?.university || profile.university || '',
          course: bp.course || existingProfile?.course || profile.course || '',
          student_id: bp.student_id || existingProfile?.student_id || profile.student_id || '',
          avatar_color: bp.avatar_color || existingProfile?.avatar_color || accentHex(profile.avatar_color)
        }

        const profileWriteRes = existingProfile
          ? await supabase.from('profiles').update({ ...nextProfileFields, onboarded: true }).eq('id', activeUser.id)
          : await supabase.from('profiles').upsert({
              id: activeUser.id,
              email: activeUser.email,
              role: 'student',
              onboarded: true,
              ...nextProfileFields
            }, { onConflict: 'id' })

        if (profileWriteRes.error) {
          restoreErrors.push(`profiles: ${profileWriteRes.error.message}`)
        }
        await supabase.auth.updateUser({ data: nextProfileFields }).catch(() => {})
        updateAuthCache({ ...nextProfileFields, onboarded: true })
      }

      [
        `axon_home_dashboard_${activeUser.id}`,
        `axon_classes_${activeUser.id}`,
        `axon_assignments_${activeUser.id}`,
        `axon_exams_${activeUser.id}`,
        `axon_reminders_${activeUser.id}`,
        `axon_profile_cache_${activeUser.id}`
      ].forEach(clearCache)

      ;[
        'axon_classes_updated',
        'axon_assignments_updated',
        'axon_exams_updated',
        'axon_reminder_updated',
        'axon_exam_results_updated',
        'axon_profile_updated',
        'preferences-synced'
      ].forEach(ev => window.dispatchEvent(new CustomEvent(ev)))

      await loadUser()

      const restoredParts = [
        counts.classes && `${counts.classes} classes`,
        counts.assignments && `${counts.assignments} assignments`,
        counts.exams && `${counts.exams} exams`,
        counts.reminders && `${counts.reminders} reminders`,
        counts.linked && `${counts.linked} linked timetables`,
        counts.semesters && `${counts.semesters} semesters`
      ].filter(Boolean)

      if (restoreErrors.length > 0) {
        console.error('JSON restore partial errors:', restoreErrors)
        showToast(`Backup partially restored (${restoreErrors.join('; ')})`, 'warning')
      } else {
        showToast(
          restoredParts.length > 0
            ? `Restored: ${restoredParts.join(', ')}.`
            : 'Backup checked. All items were already present in your account.',
          'success'
        )
      }
      logActivity('Restored JSON backup', 'settings', file.name, activeUser.id).catch(() => {})
    } catch (error) {
      console.error('Restore JSON backup error:', error)
      showToast('Failed to restore JSON backup.', 'error')
    } finally {
      setRestoringBackup(false)
    }
  }


  async function deleteAccount() {
    if (!await confirm({ title: 'Delete account?', message: 'This permanently deletes your Axon account. Please confirm before continuing.', confirmText: 'Delete account' })) return
    
    try {
      const { error } = await supabase.rpc('delete_user')
      if (error) throw error

      markExplicitLogout()
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      showToast('Could not delete account. Server configuration missing.', 'error')
    }
  }

  async function globalSignOut() {
    markExplicitLogout()
    await supabase.auth.signOut({ scope: 'global' })
    navigate('/login')
  }

  async function enablePush() {
    if (!('Notification' in window)) return
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      
      if (permission === 'granted') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          showToast('Registering push notification service...', 'info')
          const sub = await registerPushSubscription(user)
          if (sub) {
            showToast('Push notifications successfully registered!', 'success')
          } else {
            showToast('Push registration failed. Check console.', 'error')
          }
        }
      } else if (permission === 'denied') {
        showToast('Notification permission was denied.', 'warning')
      }
    } catch (err) {
      console.error(err)
      showToast('Error requesting notification permission.', 'error')
    }
  }

  async function sendTestPushNotification() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSendingTest(true)
    try {
      const res = await fetch('/api/send-test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Background push sent! Check your device.', 'success')
      } else {
        showToast(data.error || 'Failed to send test push.', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Connection error. Failed to trigger test push.', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  async function testNotification() {
    if (!('Notification' in window)) return showToast('Notifications are not supported in this browser.', 'error')
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
    if (Notification.permission !== 'granted') return showToast('Notification permission is not enabled.', 'error')
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('Axon test', {
        body: 'Notifications are working.',
        icon: '/icons/logo-colored.png',
        badge: '/icons/badge.png',
        tag: `axon-test-${Date.now()}`,
        renotify: true,
        silent: false,
        vibrate: [200, 100, 200],
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Could not show test notification:', error)
      showToast('Could not show a test notification on this device.', 'error')
    }
  }

  const [prefTick, setPrefTick] = useState(0)
  useEffect(() => {
    const handleSync = () => setPrefTick(t => t + 1)
    window.addEventListener('preferences-synced', handleSync)
    return () => window.removeEventListener('preferences-synced', handleSync)
  }, [])

  useEffect(() => {
    const syncNotificationPermission = () => {
      if ('Notification' in window && document.visibilityState !== 'hidden') {
        setNotificationPermission(Notification.permission)
      }
    }
    window.addEventListener('focus', syncNotificationPermission)
    document.addEventListener('visibilitychange', syncNotificationPermission)
    return () => {
      window.removeEventListener('focus', syncNotificationPermission)
      document.removeEventListener('visibilitychange', syncNotificationPermission)
    }
  }, [])

  function pref(key, fallback) { return localStorage.getItem(key) ?? fallback }
  function setPref(key, value) { updatePreference(user, key, value); showToast('Preference saved.', 'success') }

  return (
    <>
      <SEO title="Settings | Axon" description="Customize profile, themes, notifications, and data privacy." />
      <main className="main-content !pt-0">
      <div className="sticky top-0 z-20 -mx-4 bg-[var(--bg-primary)] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:static md:mx-0 md:bg-transparent md:px-0 md:pb-0 md:pt-[calc(env(safe-area-inset-top)+1.25rem)] border-b border-white/10 md:border-none">
        <h1 className="page-title mb-3 md:mb-6">{t('settings.title')}</h1>
        <nav className="scrollbar-hide flex gap-2 overflow-x-auto md:hidden">
          {tabs.map(([id, label]) => <button key={id} className="min-h-[44px] shrink-0 rounded-full border border-white/10 px-4 text-sm" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>{t(`settings.${id === 'email-planner' ? 'emailDigest' : id}`)}</button>)}
        </nav>
      </div>
      <div className="grid gap-5 xl:grid-cols-2 mt-4 md:mt-0">
        <Section id="profile" title={t('settings.profile')}>
          <div className="mb-4 flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full text-xl font-bold text-white" style={{ background: accentHex(profile.avatar_color) }}>{initials(profile.full_name || user?.email)}</div>
            <div><p className="font-semibold">{user?.email}</p><p className="muted">Student profile</p></div>
          </div>
          <Field label="Display name"><input className="input" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} /></Field>
          <Field label="University"><input className="input" value={profile.university} onChange={e => setProfile({ ...profile, university: e.target.value })} /></Field>
          <Field label="Course"><input className="input" value={profile.course} onChange={e => setProfile({ ...profile, course: e.target.value })} /></Field>
          <Field label="Student ID"><input className="input" value={profile.student_id} onChange={e => setProfile({ ...profile, student_id: e.target.value })} /></Field>
          <Field label="Avatar color"><select className="input" value={profile.avatar_color} onChange={e => setProfile({ ...profile, avatar_color: e.target.value })}>{['blue', 'purple', 'green', 'cyan', 'orange', 'red'].map(c => <option key={c}>{c}</option>)}</select></Field>
          <button className="btn-primary w-full md:w-auto" onClick={saveProfile}><Save className="h-4 w-4" /> Save Profile</button>
        </Section>

        <Section id="notifications" title={t('settings.notifications')}>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400">Push Notifications</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Receive background notifications on this device</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  !('Notification' in window) ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  notificationPermission === 'granted' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                  notificationPermission === 'denied' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                }`}>
                  {!('Notification' in window) ? 'Not Supported' :
                   notificationPermission === 'granted' ? 'Enabled' :
                   notificationPermission === 'denied' ? 'Blocked' :
                   'Disabled'}
                </span>
              </div>

              <div className="pt-2">
                {!('Notification' in window) ? (
                  <p className="text-xs leading-relaxed text-amber-500/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    ⚠️ Web Push is not supported in this browser. To receive push notifications on iOS/iPhone, tap Safari's <strong>Share</strong> button, select <strong>"Add to Home Screen"</strong>, then open the Axon app from your home screen.
                  </p>
                ) : notificationPermission === 'default' ? (
                  <button className="btn-primary w-full py-2.5 rounded-xl font-semibold" onClick={enablePush}>
                    🔔 Enable Push Notifications
                  </button>
                ) : notificationPermission === 'denied' ? (
                  <p className="text-xs leading-relaxed text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    ❌ Notifications are blocked on this browser/device. Please open your device's System Settings or Browser Site Settings to allow notifications for Axon.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-green-400/90 bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                      ✅ This device is successfully registered to receive background notifications!
                    </p>
                    {isAndroidDevice && (
                      <p className="text-xs leading-relaxed text-amber-200/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                        {t('settings.androidHeadsUpHelp')}
                      </p>
                    )}
                    <button className="btn-ghost w-full py-2 text-xs" onClick={sendTestPushNotification} disabled={sendingTest}>
                      {sendingTest ? 'Sending...' : `🚀 ${t('settings.sendTestPush')}`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-white/10 w-full" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-theme-400">{t('settings.deadlines')}</h4>
              <PreferenceToggle label={t('settings.assignReminders')} k="assignmentReminders" />
              <PreferenceToggle label={t('settings.examAlerts')} k="examAlerts" />
              <div className="mt-2">
                <Field label={t('settings.remindBeforeDeadline')}>
                  <select key={`due-remind-${prefTick}`} className="input" defaultValue={pref('reminderLeadTime', '3 days')} onChange={e => setPref('reminderLeadTime', e.target.value)}>
                    <option value="1 day">{t('settings.1day')}</option>
                    <option value="3 days">{t('settings.3days')}</option>
                    <option value="1 week">{t('settings.1week')}</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="h-px bg-white/10 w-full" />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-purple-400">{t('settings.eventStarts')}</h4>
              <PreferenceToggle label={t('settings.classStarts')} k="axon_class_notify" />
              <PreferenceToggle label={t('settings.examStarts')} k="axon_exam_notify" />
              <div className="mt-2">
                <MinuteSelector key={`min-sel-${prefTick}`} value={pref('axon_notify_minutes', '10')} onChange={v => setPref('axon_notify_minutes', v)} />
              </div>
            </div>

            <div className="h-px bg-white/10 w-full" />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-400">Attendance Reminders</h4>
              <PreferenceToggle label="Remind to take attendance code" k="axon_attendance_notify" />
              <div className="mt-2">
                <AttendanceMinuteSelector key={`att-min-sel-${prefTick}`} value={pref('axon_attendance_minutes', '10')} onChange={v => setPref('axon_attendance_minutes', v)} />
              </div>
            </div>

          </div>
        </Section>
        <Section id="appearance" title={t('settings.appearance')}>
          <Field label="Language">
            <select key={`app-lang-${prefTick}`} className="input" defaultValue={pref('appLanguage', 'en')} onChange={e => setPref('appLanguage', e.target.value)}>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </Field>
          <ThemeSegment value={themeCtx.theme} onChange={themeCtx.setTheme} />
          <Segment label="Accent" value={themeCtx.accentColor} onChange={themeCtx.setAccentColor} options={['blue', 'purple', 'green', 'cyan', 'orange', 'red', 'pink']} />
          <Segment label="Font size" value={themeCtx.fontSize} onChange={themeCtx.setFontSize} options={['small', 'medium', 'large']} />
          <Segment label="Text style" value={themeCtx.fontFamily} onChange={themeCtx.setFontFamily} options={['sans', 'serif', 'mono']} />
          <ToggleRow label="Compact mode" checked={themeCtx.compactMode} onChange={themeCtx.setCompactMode} />
        </Section>
        <Section id="account" title={t('settings.account')}>
          <Field label="Change email"><input className="input" type="email" value={security.email} onChange={e => setSecurity({ ...security, email: e.target.value })} /></Field>
          <button className="btn-ghost mb-4 w-full md:w-auto" onClick={updateEmail}>Update Email</button>
          <Field label="New password"><input className="input" type="password" value={security.password} onChange={e => setSecurity({ ...security, password: e.target.value })} /></Field>
          <button className="btn-ghost mb-4 w-full md:w-auto" onClick={updatePassword}>Update Password</button>
          <button className="btn-danger w-full md:w-auto" onClick={deleteAccount}><ShieldAlert className="h-4 w-4" /> Delete Account</button>
        </Section>
        <Section id="invite" title={t('settings.invite')}>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Invite your friends to join Axon and study together.</p>
          <div className="flex flex-col md:flex-row gap-2">
            <input 
              className="input flex-1" 
              type="email" 
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              disabled={inviting}
            />
            <button className="btn-primary" onClick={handleInvite} disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </Section>
        <Section id="ai" title={t('settings.ai')}>
          <Field label="Language"><select key={`ai-lang-${prefTick}`} className="input" defaultValue={pref('aiLanguage', 'English')} onChange={e => setPref('aiLanguage', e.target.value)}>{['English', 'Bahasa Malaysia', '中文'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="Style"><select key={`ai-style-${prefTick}`} className="input" defaultValue={pref('aiStyle', 'Casual')} onChange={e => setPref('aiStyle', e.target.value)}>{['Casual', 'Formal', 'Bullet points only'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <PreferenceToggle label="Auto-generate daily tip" k="dailyTipEnabled" />
        </Section>
        <Section title={t('settings.timetablePrefs')}>
          <Field label="First day of week"><select key={`first-day-${prefTick}`} className="input" defaultValue={pref('firstDay', 'Monday')} onChange={e => setPref('firstDay', e.target.value)}>{['Monday', 'Sunday'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="Time format"><select key={`time-format-${prefTick}`} className="input" defaultValue={pref('timeFormat', '24hr')} onChange={e => setPref('timeFormat', e.target.value)}>{['12hr', '24hr'].map(v => <option key={v}>{v}</option>)}</select></Field>
        </Section>
        <Section id="email-planner" title={t('settings.emailDigest')}>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Send a formatted summary of your academic schedules directly to your registered email address.</p>
          <div className="space-y-3">
            <ToggleRow label="Include Weekly Timetable" checked={digestOptions.classes} onChange={next => setDigestOptions(prev => ({ ...prev, classes: next }))} />
            <ToggleRow label="Include Pending Assignments" checked={digestOptions.assignments} onChange={next => setDigestOptions(prev => ({ ...prev, assignments: next }))} />
            <ToggleRow label="Include Exam Schedules" checked={digestOptions.exams} onChange={next => setDigestOptions(prev => ({ ...prev, exams: next }))} />
            <ToggleRow label="Include Results" checked={digestOptions.results} onChange={next => setDigestOptions(prev => ({ ...prev, results: next }))} />
            <ToggleRow label="Include Health: Workout & Habit Logs" checked={digestOptions.exercise} onChange={next => setDigestOptions(prev => ({ ...prev, exercise: next }))} />
            <ToggleRow label="Include Health: Diet & Nutrition Logs" checked={digestOptions.nutrition} onChange={next => setDigestOptions(prev => ({ ...prev, nutrition: next }))} />
          </div>
          <button className="btn-primary w-full mt-4" onClick={sendAcademicEmail} disabled={sendingDigest}>
            <Mail className="h-4 w-4" /> {sendingDigest ? 'Sending Email...' : 'Email Academic Report'}
          </button>
        </Section>
        <Section id="data" title={t('settings.data')}>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button className="btn-primary" onClick={exportData}><Download className="h-4 w-4" /> {t('action.export')}</button>

            <button className="btn-ghost border border-white/15" onClick={exportJsonBackup} disabled={exportingBackup}>
              <FileJson className="h-4 w-4" /> {exportingBackup ? 'Exporting Backup...' : 'Export JSON Backup'}
            </button>

            <button className="btn-ghost border border-white/15" onClick={() => backupInputRef.current?.click()} disabled={restoringBackup}>
              <Upload className="h-4 w-4" /> {restoringBackup ? 'Restoring...' : 'Restore from JSON Backup'}
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={importJsonBackup}
            />

            <button className="btn-ghost" onClick={globalSignOut}><LogOut className="h-4 w-4" /> {t('action.logoutAll')}</button>
          </div>
          <p className="text-xs text-slate-400">
            Save a full JSON backup of your classes, linked timetables, assignments, exams, reminders, semester settings, and exam results so you can safely restore any missing items later without duplicates.
          </p>
          <div className="pt-3 border-t border-white/10 flex items-center gap-4 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-theme-400 hover:underline">Privacy Policy</Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-theme-400 hover:underline">Terms of Service</Link>
          </div>
        </Section>
      </div>
      {ConfirmDialog}
    </main>
  </>
  )
}

function Section({ id, title, children }) { return <section id={id} className="card scroll-mt-24 space-y-4"><h2 className="section-header">{title}</h2>{children}</section> }
function Field({ label, children }) { return <label className="block space-y-1"><span className="label">{label}</span>{children}</label> }

function ThemeSegment({ value, onChange }) {
  const options = [['dark', '🌙 Dark'], ['light', '☀️ Light'], ['system', '💻 System']]
  return <div><p className="label">Theme</p><div className="grid grid-cols-3 gap-2">{options.map(([key, label]) => <button key={key} className={`rounded-xl px-3 py-2 text-sm ${value === key ? 'bg-gradient-to-r from-theme-500 to-purple-600 text-white' : 'border border-white/10'}`} onClick={() => onChange(key)}>{label}</button>)}</div></div>
}

function Segment({ label, value, onChange, options }) {
  return <div><p className="label">{label}</p><div className="flex flex-wrap gap-2">{options.map(opt => <button key={opt} className={`rounded-xl border px-3 py-2 capitalize ${value === opt ? 'border-theme-500 bg-theme-500/20' : 'border-white/10'}`} onClick={() => onChange(opt)}>{opt}</button>)}</div></div>
}

function ToggleRow({ label, checked, onChange }) {
  return <div className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span>{label}</span><ToggleSwitch isOn={checked} onToggle={() => onChange(!checked)} /></div>
}

function PreferenceToggle({ label, k }) {
  const [checked, setChecked] = useState(() => localStorage.getItem(k) !== 'false')

  useEffect(() => {
    const handleSync = () => {
      setChecked(localStorage.getItem(k) !== 'false')
    }
    window.addEventListener('preferences-synced', handleSync)
    return () => window.removeEventListener('preferences-synced', handleSync)
  }, [k])

  return <ToggleRow label={label} checked={checked} onChange={next => { setChecked(next); updatePreference(null, k, next) }} />
}

function MinuteSelector({ value, onChange }) {
  const [selected, setSelected] = useState(String(value))
  const { t } = useLanguage()

  useEffect(() => {
    setSelected(String(value))
  }, [value])

  const mins = ['5', '10', '15', '20', '30']

  return <div><p className="label">{t('settings.remindBeforeClass')}</p><div className="flex flex-wrap gap-2">{mins.map(v => <button key={v} onClick={() => { setSelected(v); onChange(v) }} className={`rounded-full px-4 py-2 text-sm ${selected === v ? 'bg-theme-500 text-white' : 'border border-white/10'}`}>{t(`settings.${v}min`)}</button>)}</div></div>
}

function AttendanceMinuteSelector({ value, onChange }) {
  const [selected, setSelected] = useState(String(value))
  const { t } = useLanguage()

  useEffect(() => {
    setSelected(String(value))
  }, [value])

  const mins = ['5', '10', '15', '20']

  return <div><p className="label">Remind Before Class End</p><div className="flex flex-wrap gap-2">{mins.map(v => <button key={v} onClick={() => { setSelected(v); onChange(v) }} className={`rounded-full px-4 py-2 text-sm ${selected === v ? 'bg-theme-500 text-white' : 'border border-white/10'}`}>{t(`settings.${v}min`)}</button>)}</div></div>
}

function accentHex(color) {
  return { blue: '#3B82F6', purple: '#8B5CF6', green: '#10B981', cyan: '#06B6D4', orange: '#F97316', red: '#EF4444', pink: '#EC4899' }[color] || '#3B82F6'
}

function colorName(value) {
  if (!value?.startsWith?.('#')) return value || 'blue'
  const normalized = value.toUpperCase()
  const match = Object.entries({ blue: '#3B82F6', purple: '#8B5CF6', green: '#10B981', cyan: '#06B6D4', orange: '#F97316', red: '#EF4444', pink: '#EC4899' }).find(([, hex]) => hex === normalized)
  return match?.[0] || 'blue'
}

const backupRowKeys = {
  class: c => [c?.subject, c?.day, c?.start_time, c?.end_time, c?.class_type || '', c?.classroom || '', c?.date || ''].map(v => String(v || '').trim().toLowerCase()).join('|'),
  assignment: a => [a?.title, a?.subject || '', a?.deadline || ''].map(v => String(v || '').trim().toLowerCase()).join('|'),
  exam: e => [e?.subject, e?.exam_date || '', e?.start_time || '', e?.exam_type || 'Final'].map(v => String(v || '').trim().toLowerCase()).join('|'),
  reminder: r => [r?.title, r?.reminder_time || '', r?.repeat_type || 'once'].map(v => String(v || '').trim().toLowerCase()).join('|'),
  linked: p => String(p?.id || p?.name || '').trim().toLowerCase(),
  semester: s => String(s?.name || s?.id || '').trim().toLowerCase()
}

function dedupeByKey(rows, keyFn) {
  const seen = new Set()
  const out = []
  ;(rows || []).forEach(row => {
    if (!row) return
    const key = keyFn(row)
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(row)
  })
  return out
}

function safeParseArray(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
