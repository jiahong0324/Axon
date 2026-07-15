import { format } from 'date-fns'
import { supabase } from './supabase'
import { formatTime } from './utils'
import { calculateOverallCGPA, calculateSemesterGPA } from './tarumtGrading'
import { fetchExerciseData, calculateStreakAndStats, getLevelInfo } from './exerciseUtils'
import { translations } from './i18n/translations'
import { DEFAULT_PREFERENCES } from './preferences'
import { faqs } from '../pages/landing/LandingFAQ'

export async function buildUserContext() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  const isManager = profile?.role === 'manager'

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const dayName = format(today, 'EEEE')
  const displayName = user.user_metadata?.full_name || user.email

  if (isManager) {
    const [
      studentsRes,
      feedbackRes,
      announcementsRes,
      activityRes,
      exerciseLogsRes,
      classesRes,
      assignmentsRes,
      examsRes,
      blogsRes,
      semestersRes,
      coursesRes,
      remindersRes,
      aiChatsRes
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
      supabase.from('feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(60),
      supabase.from('exercise_logs').select('*').order('log_date', { ascending: false }).limit(60),
      supabase.from('classes').select('*'),
      supabase.from('assignments').select('*').neq('status', 'Done'),
      supabase.from('exams').select('*').gte('exam_date', todayStr).order('exam_date'),
      supabase.from('blog_posts').select('id, slug, title, category, read_time, description, views_count, likes_count, created_at').order('created_at', { ascending: false }),
      supabase.from('student_semesters').select('*').order('created_at'),
      supabase.from('student_semester_courses').select('*').order('created_at'),
      supabase.from('reminders').select('*').eq('is_active', true),
      supabase.from('student_ai_chats').select('user_id, role, content, created_at').eq('is_manager', false).order('created_at', { ascending: false }).limit(30)
    ])

    const students = studentsRes.data || []
    const feedback = feedbackRes.data || []
    const announcements = announcementsRes.data || []
    const activityLogs = activityRes.data || []
    const exerciseLogs = exerciseLogsRes.data || []
    const classes = classesRes.data || []
    const assignments = assignmentsRes.data || []
    const exams = examsRes.data || []
    const blogPosts = blogsRes.data || []
    const semesters = semestersRes.data || []
    const courses = coursesRes.data || []
    const reminders = remindersRes.data || []
    const aiChats = aiChatsRes.data || []

    const studentMap = new Map(students.map(s => [s.id, s.full_name || s.email || 'Student']))
    const getStudentName = (id) => studentMap.get(id) || 'Student (' + (id ? id.slice(0, 6) : 'unknown') + ')'

    const todayCheckIns = exerciseLogs.filter(l => l.log_date === todayStr)
    const pendingFeedback = feedback.filter(f => f.status === 'pending')
    const activeAnnouncements = announcements.filter(a => !a.expires_at || new Date(a.expires_at) > new Date())

    return `
=== MANAGER AI CONTROL CENTER INSTRUCTIONS ===
You are the Axon Manager Control Center AI Assistant. You have full, secure, comprehensive access to ALL student accounts, profiles, check-in records, workout logs, system activity logs, feedback tickets, announcements, blog posts, assignments, timetables, exams, reminders, academic GPA/CGPA results, and AI study topics across the entire university platform as detailed below.
When the manager asks about any student, check-in statistics, feedback, assignments, classes, exams, or system overview, answer directly, accurately, and thoroughly using this data without claiming you lack access.

=== MANAGER PROFILE ===
Name: ${displayName}
Email: ${user.email}
Today: ${dayName}, ${format(today, 'dd MMMM yyyy')}

=== SYSTEM & PLATFORM OVERVIEW ===
Total Active Students: ${students.length}
Pending Feedback Tickets: ${pendingFeedback.length} (Total Feedback: ${feedback.length})
Active Announcements: ${activeAnnouncements.length} (Total Sent: ${announcements.length})
Total Published Blog Posts: ${blogPosts.length}
Total Scheduled Classes Across Students: ${classes.length}
Total Active Assignments Across Students: ${assignments.length}
Total Upcoming Exams Across Students: ${exams.length}
Total Active Reminders Across Students: ${reminders.length}
Today's Check-ins (${todayStr}): ${todayCheckIns.length} students checked in

=== ALL STUDENT PROFILES DIRECTORY ===
${students.length === 0 ? 'No student profiles recorded.' : students.map(s => `- ${s.full_name || 'Unnamed Student'} (${s.email}) | ID: ${s.student_id || 'N/A'} | Course: ${s.course || 'N/A'} | Uni: ${s.university || 'TAR UMT'} | Total XP: ${s.xp_total || 0} | Weekly Goal: ${s.weekly_exercise_goal || 4} days`).join('\n')}

=== RECENT STUDENT EXERCISE CHECK-INS & WORKOUTS ===
Today (${todayStr}) Check-ins (${todayCheckIns.length}): ${todayCheckIns.map(l => getStudentName(l.user_id) + ' (' + (l.activity_type || 'Workout') + ')').join(', ') || 'None yet today'}
Recent Exercise Logs:
${exerciseLogs.length === 0 ? 'No exercise logs found.' : exerciseLogs.slice(0, 25).map(l => `- [${l.log_date}] ${getStudentName(l.user_id)} logged ${l.activity_type || 'Workout'} (+${l.xp_earned || 20} XP)`).join('\n')}

=== RECENT SYSTEM ACTIVITY LOGS ===
${activityLogs.length === 0 ? 'No recent activities logged.' : activityLogs.slice(0, 30).map(l => `- ${getStudentName(l.user_id)} ${l.action} ${l.entity_name ? '"' + l.entity_name + '"' : ''} [${l.entity_type || 'system'}] (${format(new Date(l.created_at), 'yyyy-MM-dd HH:mm')})`).join('\n')}

=== STUDENT FEEDBACK TICKETS ===
Pending Tickets (${pendingFeedback.length}):
${pendingFeedback.length === 0 ? 'No pending feedback tickets.' : pendingFeedback.map(f => `- [PENDING] From ${f.name || getStudentName(f.user_id)} (${f.email || 'no email'}): "${f.message}" (${format(new Date(f.created_at), 'yyyy-MM-dd')})`).join('\n')}
Other Recent Feedback:
${feedback.filter(f => f.status !== 'pending').slice(0, 15).map(f => `- [${(f.status || 'reviewed').toUpperCase()}] From ${f.name || getStudentName(f.user_id)}: "${f.message}"`).join('\n') || 'None'}

=== ANNOUNCEMENTS ===
${announcements.length === 0 ? 'No announcements.' : announcements.slice(0, 10).map(a => `- [${(a.type || 'info').toUpperCase()}] "${a.title}": ${a.message} (Expires: ${a.expires_at || 'No expiration'})`).join('\n')}

=== BLOG POSTS OVERVIEW ===
${blogPosts.length === 0 ? 'No blog posts.' : blogPosts.slice(0, 15).map(b => `- "${b.title}" [Category: ${b.category}] (${b.read_time}, ${b.views_count || 0} views, ${b.likes_count || 0} likes) - Slug: /blog/${b.slug}`).join('\n')}

=== STUDENT ASSIGNMENTS & UPCOMING EXAMS ===
Active Assignments:
${assignments.length === 0 ? 'No active assignments across students.' : assignments.slice(0, 25).map(a => `- ${getStudentName(a.user_id)} has assignment "${a.title}" (${a.subject}) due ${a.deadline} [Priority: ${a.priority}, Status: ${a.status}]`).join('\n')}
Upcoming Exams:
${exams.length === 0 ? 'No upcoming exams across students.' : exams.slice(0, 25).map(e => `- ${getStudentName(e.user_id)} has exam "${e.subject}" (${e.exam_type}) on ${e.exam_date} at ${e.venue || 'TBA'}`).join('\n')}

=== STUDENT ACADEMIC SEMESTER & COURSE RECORDS ===
${semesters.length === 0 ? 'No student semester records recorded.' : semesters.slice(-15).map(sem => {
  const semCourses = courses.filter(c => c.semester_id === sem.id)
  return `- ${getStudentName(sem.user_id)} | Semester: ${sem.name} (${semCourses.length} courses recorded)`
}).join('\n')}

=== RECENT STUDENT AI STUDY TOPICS & QUESTIONS ===
${aiChats.length === 0 ? 'No recent student AI queries.' : aiChats.filter(c => c.role === 'user').slice(0, 15).map(c => `- ${getStudentName(c.user_id)} asked AI: "${c.content.slice(0, 100)}${c.content.length > 100 ? '...' : ''}"`).join('\n')}

=== FREQUENTLY ASKED QUESTIONS (Axon FAQ) ===
${faqs.map(f => `- Q: ${f.question}\n  A: ${f.answer}`).join('\n\n')}
`.trim()
  }

  const [classesRes, assignmentsRes, examsRes, remindersRes, semsRes, coursesRes, exerciseData, blogRes] = await Promise.all([
    supabase.from('classes').select('*').eq('user_id', user.id),
    supabase.from('assignments').select('*').eq('user_id', user.id).neq('status', 'Done'),
    supabase.from('exams').select('*').eq('user_id', user.id).gte('exam_date', todayStr).order('exam_date'),
    supabase.from('reminders').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('student_semesters').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('student_semester_courses').select('*').eq('user_id', user.id).order('created_at'),
    fetchExerciseData(user.id),
    supabase.from('blog_posts').select('slug, title, category, read_time, description, views_count, likes_count').order('created_at', { ascending: false }).limit(20)
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
  const blogPosts = blogRes.data || []
  const todayClasses = classes.filter(c => c.is_replacement ? c.date === todayStr : c.day === dayName)

  const exerciseStats = calculateStreakAndStats(exerciseData.logs, exerciseData.weeklyGoal, exerciseData.freezesAvailable, todayStr, exerciseData.xpTotal)
  const exerciseLevel = getLevelInfo(exerciseData.xpTotal, (key) => translations.en[key] || key)
  const unlockedBadges = exerciseStats.badgeStatuses.filter(b => b.unlocked)

  const university = profile?.university || user.user_metadata?.university || 'Not specified'
  const course = profile?.course || user.user_metadata?.course || 'Not specified'
  const studentId = profile?.student_id || user.user_metadata?.student_id || 'Not specified'
  const prefs = { ...DEFAULT_PREFERENCES, ...(user.user_metadata?.preferences || {}) }
  const aiLanguage = prefs.aiLanguage || 'English'
  const aiStyle = prefs.aiStyle || 'Casual'
  const reminderLeadTime = prefs.reminderLeadTime || '3 days'
  const firstDay = prefs.firstDay || 'Monday'
  const timeFormat = prefs.timeFormat || '24hr'

  return `
=== STUDENT PROFILE & SETTINGS ===
Name: ${displayName}
Email: ${user.email}
University: ${university}
Course / Major: ${course}
Student ID: ${studentId}
AI Preferences: Language (${aiLanguage}), Style (${aiStyle})
Planner Settings: First Day of Week (${firstDay}), Time Format (${timeFormat}), Deadline Alert Lead Time (${reminderLeadTime})
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

=== EXERCISE & HABIT TRACKING ===
Current Streak: ${exerciseStats.currentStreak} days (Longest: ${exerciseStats.longestStreak} days)
Weekly Goal Progress: ${exerciseStats.weeklyCount} / ${exerciseStats.weeklyGoal} days completed this week
Level & Rank: Level ${exerciseLevel.level} - ${exerciseLevel.title} (${exerciseData.xpTotal} Total XP)
Streak Protection: ${exerciseData.freezesAvailable} freezes available
Checked In Today (${todayStr}): ${exerciseStats.isCheckedInToday ? `Yes (${exerciseData.logs.find(l => l.log_date === todayStr)?.activity_type || 'Workout'})` : 'No (Not checked in yet)'}
Unlocked Badges (${unlockedBadges.length} total): ${unlockedBadges.map(b => b.titleKey).join(', ') || 'None yet'}
Recent Workout History:
${exerciseData.logs.length === 0 ? 'No workouts logged yet.' : exerciseData.logs.slice(0, 10).map(l => `- ${l.log_date}: ${l.activity_type || 'Workout'} (+${l.xp_earned || 20} XP)`).join('\n')}

=== PUBLIC BLOG ARTICLES & STUDY GUIDES ===
${blogPosts.length === 0 ? 'No blog posts found.' : blogPosts.map(p => `- [${p.category}] "${p.title}" (${p.read_time}, ${p.views_count || 0} views, ${p.likes_count || 0} likes)\n  Slug: /blog/${p.slug}\n  Summary: ${p.description}`).join('\n\n')}

=== FREQUENTLY ASKED QUESTIONS (Axon FAQ) ===
${faqs.map(f => `- Q: ${f.question}\n  A: ${f.answer}`).join('\n\n')}
`.trim()
}

