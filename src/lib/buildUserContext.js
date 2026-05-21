import { format } from 'date-fns'
import { supabase } from './supabase'

export async function buildUserContext() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const dayName = format(today, 'EEEE')
  const displayName = user.user_metadata?.full_name || user.email

  const [classesRes, assignmentsRes, examsRes, remindersRes] = await Promise.all([
    supabase.from('classes').select('*').eq('user_id', user.id),
    supabase.from('assignments').select('*').eq('user_id', user.id).neq('status', 'Done'),
    supabase.from('exams').select('*').eq('user_id', user.id).gte('exam_date', todayStr).order('exam_date'),
    supabase.from('reminders').select('*').eq('user_id', user.id).eq('is_active', true)
  ])

  const classes = classesRes.data || []
  const assignments = assignmentsRes.data || []
  const exams = examsRes.data || []
  const reminders = remindersRes.data || []
  const todayClasses = classes.filter(c => c.day === dayName)

  return `
=== STUDENT PROFILE ===
Name: ${displayName}
Email: ${user.email}
Today: ${dayName}, ${format(today, 'dd MMMM yyyy')}

=== TODAY'S CLASSES (${dayName}) ===
${todayClasses.length === 0 ? 'No classes today.' : todayClasses.map(c => `- ${c.subject} [${c.class_type}] from ${c.start_time} to ${c.end_time} at ${c.classroom || 'TBA'} with ${c.lecturer || 'TBA'}`).join('\n')}

=== ALL CLASSES (Weekly Timetable) ===
${classes.length === 0 ? 'No classes scheduled.' : classes.map(c => `- ${c.subject} [${c.class_type}] on ${c.day} ${c.start_time}-${c.end_time}, Room: ${c.classroom || 'TBA'}, Lecturer: ${c.lecturer || 'TBA'}`).join('\n')}

=== PENDING & IN-PROGRESS ASSIGNMENTS ===
${assignments.length === 0 ? 'No pending assignments.' : assignments.map(a => `- "${a.title}" (${a.subject}) - Due: ${a.deadline}, Priority: ${a.priority}, Status: ${a.status}${a.notes ? ', Notes: ' + a.notes : ''}`).join('\n')}

=== UPCOMING EXAMS ===
${exams.length === 0 ? 'No upcoming exams.' : exams.map(e => `- ${e.subject} ${e.exam_type} on ${e.exam_date} at ${e.venue || 'TBA'}${e.notes ? ', Notes: ' + e.notes : ''}`).join('\n')}

=== ACTIVE REMINDERS ===
${reminders.length === 0 ? 'No active reminders.' : reminders.map(r => `- "${r.title}" at ${r.reminder_time || 'no time set'} (${r.repeat_type})`).join('\n')}
`.trim()
}
