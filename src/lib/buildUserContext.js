import { format } from 'date-fns'
import { supabase } from './supabase'
import { formatTime } from './utils'
import { calculateOverallCGPA, calculateSemesterGPA } from './tarumtGrading'

export async function buildUserContext() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isManager = profile?.role === 'manager'

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const dayName = format(today, 'EEEE')
  const displayName = user.user_metadata?.full_name || user.email

  if (isManager) {
    const [studentsRes, feedbackRes, announcementsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'student'),
      supabase.from('feedback').select('message').eq('status', 'pending'),
      supabase.from('announcements').select('title, message')
    ])
    const students = studentsRes.data || []
    const feedback = feedbackRes.data || []
    const announcements = announcementsRes.data || []

    return `
=== MANAGER PROFILE ===
Name: ${displayName}
Email: ${user.email}
Today: ${dayName}, ${format(today, 'dd MMMM yyyy')}

=== SYSTEM OVERVIEW ===
Total Students: ${students.length}
Pending Feedback Tickets: ${feedback.length}
Active Announcements: ${announcements.length}

=== PENDING FEEDBACK ===
${feedback.length === 0 ? 'No pending feedback.' : feedback.slice(0, 15).map(f => `- ${f.message}`).join('\n')}

=== RECENT ANNOUNCEMENTS ===
${announcements.length === 0 ? 'No announcements.' : announcements.slice(0, 5).map(a => `- ${a.title}: ${a.message}`).join('\n')}
`.trim()
  }

  const [classesRes, assignmentsRes, examsRes, remindersRes, semsRes, coursesRes] = await Promise.all([
    supabase.from('classes').select('*').eq('user_id', user.id),
    supabase.from('assignments').select('*').eq('user_id', user.id).neq('status', 'Done'),
    supabase.from('exams').select('*').eq('user_id', user.id).gte('exam_date', todayStr).order('exam_date'),
    supabase.from('reminders').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('student_semesters').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('student_semester_courses').select('*').eq('user_id', user.id).order('created_at')
  ])

  let classes = classesRes.data || []
  const replacements = user.user_metadata?.replacement_classes || []
  const validReplacements = replacements.filter(r => (!r.date || r.date >= todayStr) && (!r.profile_id || r.profile_id === 'account' || r.profile_id === 'live'))
  
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedActive = localStorage.getItem(`axon_active_timetable_${user.id}`) || 'account'
    if (savedActive !== 'account') {
      try {
        const profiles = JSON.parse(localStorage.getItem(`axon_linked_timetables_${user.id}`) || '[]')
        const activeProfile = profiles.find(p => p.id === savedActive)
        if (activeProfile && activeProfile.classes) {
          classes = activeProfile.classes.filter(c => !c.profile_id || c.profile_id === savedActive)
        }
      } catch (e) {
        console.error('Failed to load linked timetable in AI context', e)
      }
    } else {
      classes = [...classes, ...validReplacements]
    }
  } else {
    classes = [...classes, ...validReplacements]
  }

  let semesters = (semsRes.data || []).map(s => {
    const semCourses = (coursesRes.data || []).filter(c => c.semester_id === s.id)
    return { ...s, courses: semCourses }
  })

  if (typeof window !== 'undefined' && window.localStorage && semesters.length === 0) {
    try {
      const savedSems = JSON.parse(localStorage.getItem('axon_exam_results_semesters') || '[]')
      if (Array.isArray(savedSems) && savedSems.length > 0) {
        semesters = savedSems
      }
    } catch (e) {}
  }

  const overall = calculateOverallCGPA(semesters)

  const assignments = assignmentsRes.data || []
  const exams = examsRes.data || []
  const reminders = remindersRes.data || []
  const todayClasses = classes.filter(c => c.is_replacement ? c.date === todayStr : c.day === dayName)

  return `
=== STUDENT PROFILE ===
Name: ${displayName}
Email: ${user.email}
Today: ${dayName}, ${format(today, 'dd MMMM yyyy')}

=== ACADEMIC EXAM RESULTS & CGPA ===
Overall CGPA: ${overall.cgpa} (${overall.overallCredits} Total Credits)
${semesters.length === 0 ? 'No semester exam records recorded.' : semesters.map(sem => {
  const semStat = calculateSemesterGPA(sem.courses)
  const validCourses = (sem.courses || []).filter(c => c.course_name || c.grade)
  return `Semester: ${sem.name} (GPA: ${semStat.gpa}, Credits: ${semStat.totalCredits})\n` +
    validCourses.map(c => `  - ${c.course_code ? c.course_code + ' ' : ''}${c.course_name}: Grade ${c.grade || 'N/A'} (${c.credit_hours} cr)`).join('\n')
}).join('\n\n')}

=== TODAY'S CLASSES (${dayName}) ===
${todayClasses.length === 0 ? 'No classes today.' : todayClasses.map(c => `- ${c.subject} [${c.class_type}] from ${formatTime(c.start_time)} to ${formatTime(c.end_time)} at ${c.classroom || 'TBA'} with ${c.lecturer || 'TBA'}`).join('\n')}

=== ALL CLASSES (Weekly Timetable) ===
${classes.length === 0 ? 'No classes scheduled.' : classes.map(c => `- ${c.subject} [${c.class_type}] on ${c.day} ${formatTime(c.start_time)}-${formatTime(c.end_time)}, Room: ${c.classroom || 'TBA'}, Lecturer: ${c.lecturer || 'TBA'}`).join('\n')}

=== PENDING & IN-PROGRESS ASSIGNMENTS ===
${assignments.length === 0 ? 'No pending assignments.' : assignments.map(a => `- "${a.title}" (${a.subject}) - Due: ${a.deadline}, Priority: ${a.priority}, Status: ${a.status}${a.notes ? ', Notes: ' + a.notes : ''}`).join('\n')}

=== UPCOMING EXAMS ===
${exams.length === 0 ? 'No upcoming exams.' : exams.map(e => `- ${e.subject} ${e.exam_type} on ${e.exam_date} at ${e.venue || 'TBA'}${e.start_time && e.end_time ? `, Time: ${formatTime(e.start_time)}\u2013${formatTime(e.end_time)}` : ''}${e.notes ? ', Notes: ' + e.notes : ''}`).join('\n')}

=== ACTIVE REMINDERS ===
${reminders.length === 0 ? 'No active reminders.' : reminders.map(r => `- "${r.title}" at ${formatTime(r.reminder_time) || 'no time set'} (${r.repeat_type})`).join('\n')}
`.trim()
}
