import { supabase } from './supabase.js'
import { logActivity } from './logActivity.js'
import { clearCache } from './cache.js'
import { updatePreference } from './preferences.js'
import { fetchExerciseData, logExerciseCheckIn, getTodayStr } from './exerciseUtils.js'

export const COMMON_SE_COURSES = {
  'BMCS1013': 'Problem Solving and Programming',
  'BMIT1013': 'Computing Mathematics',
  'BMCS2033': 'Object-Oriented Programming',
  'BACS2063': 'Operating Systems',
  'BMCS2123': 'Database Development and Applications',
  'BMCS2113': 'Web Design and Development',
  'BACS2163': 'Software Engineering',
  'BACS2023': 'Data Structures and Algorithms',
  'BACS3013': 'Computer Networks',
  'BMCS3043': 'Mobile Application Development'
}

function normalizeDay(dayStr) {
  if (!dayStr) return 'Monday'
  const d = String(dayStr).trim().toLowerCase()
  if (d.startsWith('mon')) return 'Monday'
  if (d.startsWith('tue')) return 'Tuesday'
  if (d.startsWith('wed')) return 'Wednesday'
  if (d.startsWith('thu')) return 'Thursday'
  if (d.startsWith('fri')) return 'Friday'
  if (d.startsWith('sat')) return 'Saturday'
  if (d.startsWith('sun')) return 'Sunday'
  return 'Monday'
}

function normalizeTime(timeStr, defaultTime = '09:00') {
  if (!timeStr) return defaultTime
  let s = String(timeStr).trim().toLowerCase()
  const isPm = s.includes('pm')
  const isAm = s.includes('am')
  s = s.replace(/am|pm/g, '').trim()
  const parts = s.split(':')
  let hour = parseInt(parts[0], 10)
  let minute = parts.length > 1 ? parseInt(parts[1], 10) : 0
  if (isNaN(hour)) return defaultTime
  if (isNaN(minute)) minute = 0
  if (isPm && hour < 12) hour += 12
  if (isAm && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function normalizeClassType(typeStr) {
  if (!typeStr) return 'L'
  const t = String(typeStr).trim().toUpperCase()
  if (t === 'P' || t.startsWith('PRAC') || t.startsWith('LAB')) return 'P'
  if (t === 'T' || t.startsWith('TUT')) return 'T'
  return 'L'
}

export const ACTION_SCHEMA_PROMPT = `
=== AUTONOMOUS ACCOUNT ACTIONS ENGINE ===
You have FULL AUTONOMOUS AUTHORITY and DIRECT DATABASE ACCESS to modify, create, update, and manage the student's account records.
When the user asks you to record, add, schedule, log, track, edit, update, complete, or delete ANYTHING in their account (or mentions having an exam, practical test, quiz, assignment, class, reminder, workout session, profile detail, or course grade), you MUST execute the action by including one or more <axon_action> blocks in your response.

Supported Action Types & Data Format:
1. Add Exam / Practical Test / Quiz:
<axon_action>
{
  "type": "add_exam",
  "data": {
    "subject": "BMCS1013",
    "exam_date": "2026-10-15",
    "exam_type": "Practical Test",
    "start_time": "09:00",
    "end_time": "11:00",
    "venue": "TBD",
    "notes": "Problem Solving and Programming – Practical Test"
  }
}
</axon_action>
(exam_type can be 'Final', 'Midterm', 'Practical Test', 'Quiz', or 'Test'. If time or venue is not specified, use a standard university exam slot like 09:00-11:00 and venue "TBD").

2. Update Exam:
<axon_action>
{
  "type": "update_exam",
  "data": {
    "id": "exam-uuid-if-known",
    "subject": "BMCS1013",
    "exam_date": "2026-10-15",
    "venue": "Block B Lab 2",
    "start_time": "14:00",
    "end_time": "16:00"
  }
}
</axon_action>

3. Delete Exam:
<axon_action>
{
  "type": "delete_exam",
  "data": {
    "id": "exam-uuid-if-known",
    "subject": "BMCS1013",
    "exam_date": "2026-10-15"
  }
}
</axon_action>

4. Add Assignment:
<axon_action>
{
  "type": "add_assignment",
  "data": {
    "title": "Assignment 1",
    "subject": "BMCS1013",
    "deadline": "2026-10-22",
    "priority": "High",
    "status": "Pending",
    "notes": "Problem Solving and Programming – Assignment 1"
  }
}
</axon_action>
(priority can be 'High', 'Medium', or 'Low'. status can be 'Pending', 'In Progress', or 'Done').

5. Update Assignment (e.g. mark as Done or update deadline):
<axon_action>
{
  "type": "update_assignment",
  "data": {
    "id": "assignment-uuid-if-known",
    "title": "Assignment 1",
    "status": "Done"
  }
}
</axon_action>

6. Delete Assignment:
<axon_action>
{
  "type": "delete_assignment",
  "data": {
    "id": "assignment-uuid-if-known",
    "title": "Assignment 1"
  }
}
</axon_action>

7. Add Class / Timetable Class (Weekly Schedule):
When user asks to add a class, timetable entry, or replacement class (e.g. "Add to my timetable BMCS1013 on Monday 09:00-11:00", "I have lecture on Tuesday 10am", "Add class"):
<axon_action>
{
  "type": "add_class",
  "data": {
    "subject": "BMCS1013",
    "day": "Monday",
    "start_time": "09:00",
    "end_time": "11:00",
    "classroom": "DK1",
    "lecturer": "Dr Lee",
    "class_type": "L",
    "color": "blue"
  }
}
</axon_action>
(day must be one of: 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'. class_type: 'L' for Lecture, 'T' for Tutorial, 'P' for Practical. If multiple classes are requested, output an <axon_action> block for each or a JSON array).

8. Update Class:
<axon_action>
{
  "type": "update_class",
  "data": {
    "subject": "BMCS1013",
    "day": "Monday",
    "classroom": "DK2"
  }
}
</axon_action>

9. Delete Class:
<axon_action>
{
  "type": "delete_class",
  "data": {
    "subject": "BMCS1013",
    "day": "Monday"
  }
}
</axon_action>

10. Add Reminder:
<axon_action>
{
  "type": "add_reminder",
  "data": {
    "title": "Revise Chapter 4 Trees",
    "reminder_time": "20:00",
    "repeat_type": "once"
  }
}
</axon_action>
(repeat_type can be 'once', 'daily', 'weekdays', or 'weekly').

11. Update / Toggle Reminder:
<axon_action>
{
  "type": "update_reminder",
  "data": {
    "title": "Revise Chapter 4 Trees",
    "is_active": false
  }
}
</axon_action>

12. Delete Reminder:
<axon_action>
{
  "type": "delete_reminder",
  "data": {
    "title": "Revise Chapter 4 Trees"
  }
}
</axon_action>

13. Log Exercise / Workout Check-in:
<axon_action>
{
  "type": "log_exercise",
  "data": {
    "activity_type": "Gym",
    "log_date": "2026-10-15",
    "notes": "Chest & Triceps workout"
  }
}
</axon_action>
(activity_type can be 'Gym', 'Run', 'Yoga', 'Sports', 'Swim', 'Walk', or 'Other').

14. Update Weekly Exercise Goal:
<axon_action>
{
  "type": "update_exercise_goal",
  "data": {
    "weekly_goal": 5
  }
}
</axon_action>

15. Update Profile:
<axon_action>
{
  "type": "update_profile",
  "data": {
    "full_name": "New Name",
    "course": "Software Engineering",
    "university": "TAR UMT",
    "student_id": "24WMR01234"
  }
}
</axon_action>

16. Update Preference:
<axon_action>
{
  "type": "update_preference",
  "data": {
    "key": "aiLanguage",
    "value": "English"
  }
}
</axon_action>
(keys include: 'aiLanguage', 'aiStyle', 'reminderLeadTime', 'firstDay', 'timeFormat', 'theme', 'accentColor').

17. Add Academic Course Grade / Exam Result (Exam Results & CGPA):
When user asks to record an exam result, course grade, or semester GPA (e.g. "Add my result for BMCS1013 Grade A", "Record my grade A for BMCS1013", "My result is BMCS1013 A (3 credits)", "Record result for semester 1"):
<axon_action>
{
  "type": "add_exam_result",
  "data": {
    "semester_name": "Year 1 Semester 1",
    "course_code": "BMCS1013",
    "course_name": "Problem Solving and Programming",
    "credit_hours": 3,
    "grade": "A"
  }
}
</axon_action>
(grade: 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'F'. credit_hours: defaults to 3. If semester_name is not specified, use the student's active semester or "Year 1 Semester 1").

18. Delete Course Result:
<axon_action>
{
  "type": "delete_exam_result",
  "data": {
    "semester_name": "Year 1 Semester 1",
    "course_code": "BMCS1013"
  }
}
</axon_action>

=== RESPONSE PRESENTATION RULES (MANDATORY FORMAT) ===
Whenever you perform an account action (such as adding an exam, assignment, class, reminder, or workout), structure your visible response EXACTLY like this:
1. Lead with a clear action status header with a green checkmark emoji, e.g.:
✅ Added to your schedule
(or ✅ Added to your assignments / ✅ Added to your timetable / ✅ Reminder created / ✅ Workout logged! / ✅ Profile updated / ✅ Removed from your schedule)

2. Follow immediately with a clean, beautifully formatted Markdown table with uppercase column headers detailing the entry:
For an exam/test:
| TYPE | COURSE | TITLE (PRACTICAL TEST) | DATE (YYYY-MM-DD) | TIME | LOCATION | REMINDER |
| Practical Test | BMCS1013 | Problem Solving and Programming – Practical Test | 2026-10-15 | 09:00-11:00 *(adjust if you know the exact slot)* | TBD | Alert on 14 Oct 2026 (24 h before) |

For an assignment:
| ASSIGNMENT | COURSE | DEADLINE | PRIORITY | STATUS |
| Lab Report 2 | BMCS1013 | 2026-10-22 | High | Pending |

For a class:
| TYPE | COURSE | DAY | TIME | VENUE | LECTURER |
| Lecture | BMCS1013 | Monday | 09:00-11:00 | DK1 | Dr Lee |

For a reminder:
| REMINDER | TIME | REPEAT | STATUS |
| Revise Chapter 4 | 20:00 | Daily | Active |

For a workout:
| ACTIVITY | DATE | XP EARNED | STREAK |
| Gym | 2026-10-15 | +20 XP | Active |

3. Follow with bullet points:
• What this does: Explain exactly where this item now appears in their account (e.g. "The test now appears in your “Upcoming Exams” list, and a reminder will pop up on 14 Oct (your default 1-day lead-time).")
• Next steps: Provide a helpful suggestion on what they can adjust or provide next (e.g. "If you know the exact venue or time, just let me know and I'll update it.")

4. End with a warm, encouraging closing message (e.g. "Good luck prepping! 🎓 If you'd like a quick revision plan or any topic help, just ask.").
`

/**
 * Extracts and parses all <axon_action> JSON blocks from AI response text.
 */
export function parseAccountActions(content = '') {
  if (!content || typeof content !== 'string') return []
  const actions = []
  const regex = /<axon_action>([\s\S]*?)<\/axon_action>/gi
  let match

  while ((match = regex.exec(content)) !== null) {
    let rawJson = match[1]?.trim() || ''
    // Clean up potential markdown formatting within tags
    rawJson = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/s, '').trim()
    try {
      const parsed = JSON.parse(rawJson)
      if (Array.isArray(parsed)) {
        actions.push(...parsed)
      } else if (parsed && parsed.type) {
        actions.push(parsed)
      }
    } catch (err) {
      console.warn('Failed to parse <axon_action> block:', rawJson, err)
    }
  }

  return actions
}

/**
 * Strips all <axon_action>...</axon_action> blocks from the content so only
 * the clean markdown presentation is displayed to the user.
 */
export function stripActionTags(content = '') {
  if (!content || typeof content !== 'string') return ''
  return content.replace(/<axon_action>[\s\S]*?<\/axon_action>/gi, '').trim()
}

/**
 * Executes a single parsed account action in Supabase using the authenticated user's session.
 */
export async function executeAccountAction(action, user) {
  if (!action || !action.type || !action.data) {
    return { success: false, error: 'Invalid action payload' }
  }

  let currentUser = user
  if (!currentUser) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    currentUser = authUser
  }
  if (!currentUser) {
    return { success: false, error: 'User is not authenticated' }
  }

  const { type, data } = action

  try {
    switch (type) {
      // 1. ADD EXAM
      case 'add_exam': {
        const payload = {
          user_id: currentUser.id,
          subject: (data.subject || 'Exam').trim(),
          exam_date: (data.exam_date || getTodayStr()).trim(),
          start_time: data.start_time ? data.start_time.trim() : '09:00',
          end_time: data.end_time ? data.end_time.trim() : '11:00',
          exam_type: data.exam_type ? data.exam_type.trim() : 'Final',
          venue: data.venue ? data.venue.trim() : 'TBD',
          notes: data.notes ? data.notes.trim() : ''
        }

        const { data: inserted, error } = await supabase
          .from('exams')
          .insert(payload)
          .select()
          .maybeSingle()

        if (error) throw error

        await logActivity('Added exam', 'exam', payload.subject, currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_exams_updated', { detail: inserted || payload }))

        return {
          success: true,
          type,
          data: payload,
          message: `Added exam "${payload.subject}" on ${payload.exam_date}`
        }
      }

      // 2. UPDATE EXAM
      case 'update_exam': {
        const updates = {}
        if (data.subject) updates.subject = data.subject.trim()
        if (data.exam_date) updates.exam_date = data.exam_date.trim()
        if (data.start_time) updates.start_time = data.start_time.trim()
        if (data.end_time) updates.end_time = data.end_time.trim()
        if (data.exam_type) updates.exam_type = data.exam_type.trim()
        if (data.venue) updates.venue = data.venue.trim()
        if (data.notes !== undefined) updates.notes = data.notes.trim()

        let query = supabase.from('exams').update(updates).eq('user_id', currentUser.id)
        if (data.id) {
          query = query.eq('id', data.id)
        } else if (data.subject) {
          query = query.ilike('subject', `%${data.subject.trim()}%`)
          if (data.exam_date) query = query.eq('exam_date', data.exam_date.trim())
        }

        const { error } = await query
        if (error) throw error

        await logActivity('Updated exam', 'exam', data.subject || 'Exam', currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_exams_updated'))

        return { success: true, type, message: `Updated exam "${data.subject || ''}"` }
      }

      // 3. DELETE EXAM
      case 'delete_exam': {
        let query = supabase.from('exams').delete().eq('user_id', currentUser.id)
        if (data.id) {
          query = query.eq('id', data.id)
        } else if (data.subject) {
          query = query.ilike('subject', `%${data.subject.trim()}%`)
          if (data.exam_date) query = query.eq('exam_date', data.exam_date.trim())
        }

        const { error } = await query
        if (error) throw error

        await logActivity('Deleted exam', 'exam', data.subject || 'Exam', currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_exams_updated'))

        return { success: true, type, message: `Deleted exam "${data.subject || ''}"` }
      }

      // 4. ADD ASSIGNMENT
      case 'add_assignment': {
        const payload = {
          user_id: currentUser.id,
          title: (data.title || 'Assignment').trim(),
          subject: (data.subject || '').trim(),
          deadline: (data.deadline || getTodayStr()).trim(),
          priority: data.priority || 'Medium',
          status: data.status || 'Pending',
          notes: (data.notes || '').trim()
        }

        const { data: inserted, error } = await supabase
          .from('assignments')
          .insert(payload)
          .select()
          .maybeSingle()

        if (error) throw error

        await logActivity('Added assignment', 'assignment', payload.title, currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_assignments_updated', { detail: inserted || payload }))

        return {
          success: true,
          type,
          data: payload,
          message: `Added assignment "${payload.title}"`
        }
      }

      // 5. UPDATE ASSIGNMENT
      case 'update_assignment': {
        const updates = {}
        if (data.title) updates.title = data.title.trim()
        if (data.subject) updates.subject = data.subject.trim()
        if (data.deadline) updates.deadline = data.deadline.trim()
        if (data.priority) updates.priority = data.priority
        if (data.status) updates.status = data.status
        if (data.notes !== undefined) updates.notes = data.notes.trim()

        let query = supabase.from('assignments').update(updates).eq('user_id', currentUser.id)
        if (data.id) {
          query = query.eq('id', data.id)
        } else if (data.title) {
          query = query.ilike('title', `%${data.title.trim()}%`)
        }

        const { error } = await query
        if (error) throw error

        await logActivity('Updated assignment', 'assignment', data.title || 'Assignment', currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_assignments_updated'))

        return { success: true, type, message: `Updated assignment "${data.title || ''}"` }
      }

      // 6. DELETE ASSIGNMENT
      case 'delete_assignment': {
        let query = supabase.from('assignments').delete().eq('user_id', currentUser.id)
        if (data.id) {
          query = query.eq('id', data.id)
        } else if (data.title) {
          query = query.ilike('title', `%${data.title.trim()}%`)
        }

        const { error } = await query
        if (error) throw error

        await logActivity('Deleted assignment', 'assignment', data.title || 'Assignment', currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_assignments_updated'))

        return { success: true, type, message: `Deleted assignment "${data.title || ''}"` }
      }

      // 7. ADD CLASS / REPLACEMENT CLASS
      case 'add_class': {
        const subject = (data.subject || 'Class').trim()
        const day = normalizeDay(data.day)
        const startTime = normalizeTime(data.start_time, '09:00')
        const endTime = normalizeTime(data.end_time, '10:00')
        const classroom = (data.classroom || 'TBA').trim()
        const lecturer = (data.lecturer || 'TBA').trim()
        const classType = normalizeClassType(data.class_type)
        const color = data.color || (classType === 'L' ? 'blue' : classType === 'T' ? 'green' : 'purple')
        const isReplacement = Boolean(data.is_replacement || data.date)
        const date = data.date || ''

        const savedActive = (typeof window !== 'undefined' && localStorage.getItem(`axon_active_timetable_${currentUser.id}`)) || 'account'

        if (savedActive !== 'account') {
          // Add to active linked profile
          try {
            const raw = localStorage.getItem(`axon_linked_timetables_${currentUser.id}`) || '[]'
            const profiles = JSON.parse(raw)
            const activeProfile = profiles.find(p => p.id === savedActive)
            if (activeProfile) {
              const newClass = {
                id: `local-${Date.now()}`,
                subject,
                day,
                start_time: startTime,
                end_time: endTime,
                classroom,
                lecturer,
                class_type: classType,
                color,
                profile_id: savedActive
              }
              activeProfile.classes = [...(activeProfile.classes || []), newClass]
              localStorage.setItem(`axon_linked_timetables_${currentUser.id}`, JSON.stringify(profiles))
              await supabase.auth.updateUser({ data: { linked_timetables: profiles } }).catch(() => {})
            }
          } catch (e) {
            console.error('Error adding to linked timetable profile:', e)
          }
        } else if (isReplacement) {
          // Add to replacement_classes in user_metadata
          const { data: authData } = await supabase.auth.getUser()
          const activeUser = authData?.user || currentUser
          const replacements = activeUser.user_metadata?.replacement_classes || []
          const newRep = {
            id: `rep-${Date.now()}`,
            subject,
            day,
            start_time: startTime,
            end_time: endTime,
            classroom,
            lecturer,
            class_type: classType,
            color,
            is_replacement: true,
            date: date || getTodayStr(),
            profile_id: 'account'
          }
          await supabase.auth.updateUser({
            data: { replacement_classes: [...replacements, newRep] }
          })
        } else {
          // Insert into SQL classes table (ONLY valid columns: subject, day, start_time, end_time, classroom, lecturer, class_type, color, user_id)
          const dbRow = {
            user_id: currentUser.id,
            subject,
            day,
            start_time: startTime,
            end_time: endTime,
            classroom,
            lecturer,
            class_type: classType,
            color
          }

          const { error } = await supabase.from('classes').insert(dbRow)
          if (error) {
            console.error('Supabase classes insert error:', error)
            throw error
          }
        }

        clearCache(`axon_classes_${currentUser.id}`)
        await logActivity('Added class', 'class', subject, currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_classes_updated'))

        return {
          success: true,
          type,
          data: { subject, day, start_time: startTime, end_time: endTime, classroom, lecturer, class_type: classType },
          message: `Added class "${subject}" on ${day} (${startTime} - ${endTime})`
        }
      }

      // 8. UPDATE CLASS
      case 'update_class': {
        const updates = {}
        if (data.subject) updates.subject = data.subject.trim()
        if (data.day) updates.day = normalizeDay(data.day)
        if (data.start_time) updates.start_time = normalizeTime(data.start_time)
        if (data.end_time) updates.end_time = normalizeTime(data.end_time)
        if (data.classroom) updates.classroom = data.classroom.trim()
        if (data.lecturer) updates.lecturer = data.lecturer.trim()
        if (data.class_type) updates.class_type = normalizeClassType(data.class_type)
        if (data.color) updates.color = data.color

        let query = supabase.from('classes').update(updates).eq('user_id', currentUser.id)
        if (data.id) {
          query = query.eq('id', data.id)
        } else if (data.subject) {
          query = query.ilike('subject', `%${data.subject.trim()}%`)
          if (data.day) query = query.eq('day', normalizeDay(data.day))
        }

        const { error } = await query
        if (error) throw error

        clearCache(`axon_classes_${currentUser.id}`)
        await logActivity('Updated class', 'class', data.subject || 'Class', currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_classes_updated'))

        return { success: true, type, message: `Updated class "${data.subject || ''}"` }
      }

      // 9. DELETE CLASS
      case 'delete_class': {
        const cleanDay = data.day ? normalizeDay(data.day) : null
        let query = supabase.from('classes').delete().eq('user_id', currentUser.id)
        if (data.id) {
          query = query.eq('id', data.id)
        } else if (data.subject) {
          query = query.ilike('subject', `%${data.subject.trim()}%`)
          if (cleanDay) query = query.eq('day', cleanDay)
        }

        const { error } = await query
        if (error) throw error

        // Also remove from replacement_classes if any
        if (currentUser.user_metadata?.replacement_classes) {
          const reps = currentUser.user_metadata.replacement_classes.filter(r => {
            if (data.id && r.id === data.id) return false
            if (data.subject && r.subject?.toLowerCase().includes(data.subject.toLowerCase())) {
              if (cleanDay && r.day !== cleanDay) return true
              return false
            }
            return true
          })
          if (reps.length !== currentUser.user_metadata.replacement_classes.length) {
            await supabase.auth.updateUser({ data: { replacement_classes: reps } }).catch(() => {})
          }
        }

        clearCache(`axon_classes_${currentUser.id}`)
        await logActivity('Deleted class', 'class', data.subject || 'Class', currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_classes_updated'))

        return { success: true, type, message: `Deleted class "${data.subject || ''}"` }
      }

      // 10. ADD REMINDER
      case 'add_reminder': {
        const payload = {
          user_id: currentUser.id,
          title: (data.title || 'Reminder').trim(),
          reminder_time: data.reminder_time || '09:00',
          repeat_type: data.repeat_type || 'once',
          is_active: data.is_active !== false
        }

        const { data: inserted, error } = await supabase
          .from('reminders')
          .insert(payload)
          .select()
          .maybeSingle()

        if (error) throw error

        await logActivity('Added reminder', 'reminder', payload.title, currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_reminder_updated', { detail: inserted || payload }))

        return {
          success: true,
          type,
          data: payload,
          message: `Created reminder "${payload.title}"`
        }
      }

      // 11. UPDATE REMINDER
      case 'update_reminder': {
        const updates = {}
        if (data.title) updates.title = data.title.trim()
        if (data.reminder_time) updates.reminder_time = data.reminder_time
        if (data.repeat_type) updates.repeat_type = data.repeat_type
        if (data.is_active !== undefined) updates.is_active = Boolean(data.is_active)

        let query = supabase.from('reminders').update(updates).eq('user_id', currentUser.id)
        if (data.id) {
          query = query.eq('id', data.id)
        } else if (data.title) {
          query = query.ilike('title', `%${data.title.trim()}%`)
        }

        const { error } = await query
        if (error) throw error

        await logActivity('Updated reminder', 'reminder', data.title || 'Reminder', currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_reminder_updated'))

        return { success: true, type, message: `Updated reminder "${data.title || ''}"` }
      }

      // 12. DELETE REMINDER
      case 'delete_reminder': {
        let query = supabase.from('reminders').delete().eq('user_id', currentUser.id)
        if (data.id) {
          query = query.eq('id', data.id)
        } else if (data.title) {
          query = query.ilike('title', `%${data.title.trim()}%`)
        }

        const { error } = await query
        if (error) throw error

        await logActivity('Deleted reminder', 'reminder', data.title || 'Reminder', currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_reminder_updated'))

        return { success: true, type, message: `Deleted reminder "${data.title || ''}"` }
      }

      // 13. LOG EXERCISE
      case 'log_exercise': {
        const activityType = data.activity_type || 'Gym'
        const logDate = data.log_date || getTodayStr()

        const exerciseData = await fetchExerciseData(currentUser.id)
        const checkInResult = await logExerciseCheckIn({
          userId: currentUser.id,
          logDate,
          activityType,
          currentWeeklyGoal: exerciseData.weeklyGoal,
          currentXpTotal: exerciseData.xpTotal,
          currentFreezes: exerciseData.freezesAvailable,
          currentFrozenDates: exerciseData.frozenDates,
          logs: exerciseData.logs
        })

        // Even if already checked in or special status, emit update
        window.dispatchEvent(new CustomEvent('axon_exercise_updated'))
        await logActivity('Exercise check-in', 'exercise', activityType, currentUser.id)

        return {
          success: true,
          type,
          data: { activityType, logDate },
          message: `Logged ${activityType} workout (+20 XP)!`
        }
      }

      // 14. UPDATE EXERCISE GOAL
      case 'update_exercise_goal': {
        const goal = Math.min(7, Math.max(1, parseInt(data.weekly_goal, 10) || 4))
        const { error } = await supabase
          .from('profiles')
          .update({ weekly_exercise_goal: goal })
          .eq('id', currentUser.id)

        if (error) throw error

        await logActivity('Updated exercise goal', 'exercise', `${goal} days/week`, currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_exercise_updated'))

        return { success: true, type, message: `Weekly exercise goal set to ${goal} days.` }
      }

      // 15. UPDATE PROFILE
      case 'update_profile': {
        const updates = {}
        if (data.full_name) updates.full_name = data.full_name.trim()
        if (data.university) updates.university = data.university.trim()
        if (data.course) updates.course = data.course.trim()
        if (data.student_id) updates.student_id = data.student_id.trim()
        if (data.avatar_color) updates.avatar_color = data.avatar_color

        if (Object.keys(updates).length > 0) {
          const { error: profileErr } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id)

          if (profileErr) throw profileErr

          await supabase.auth.updateUser({ data: updates }).catch(() => {})
          await logActivity('Updated profile', 'profile', 'Account settings', currentUser.id)
          window.dispatchEvent(new CustomEvent('axon_profile_updated'))
        }

        return { success: true, type, message: 'Updated account profile details.' }
      }

      // 16. UPDATE PREFERENCE
      case 'update_preference': {
        if (data.key && data.value !== undefined) {
          await updatePreference(currentUser, data.key, String(data.value))
          await logActivity('Updated preference', 'settings', `${data.key}: ${data.value}`, currentUser.id)
        }
        return { success: true, type, message: `Updated preference ${data.key}.` }
      }

      // 17. ADD EXAM RESULT / COURSE GRADE
      case 'add_exam_result': {
        const rawCode = (data.course_code || '').trim().toUpperCase()
        const courseName = (data.course_name || COMMON_SE_COURSES[rawCode] || rawCode || 'Course').trim()
        const courseCode = rawCode || (Object.keys(COMMON_SE_COURSES).find(k => COMMON_SE_COURSES[k].toLowerCase() === courseName.toLowerCase()) || '')
        const creditHours = Number(data.credit_hours) || 3
        const grade = (data.grade || 'A').trim().toUpperCase()
        const targetSemName = (data.semester_name || '').trim()

        // 1. Load existing semesters from localStorage / user_metadata / SQL
        let semesters = []
        try {
          const cached = typeof window !== 'undefined' ? localStorage.getItem('axon_exam_results_semesters') : null
          if (cached) semesters = JSON.parse(cached)
        } catch (e) {}

        if (!Array.isArray(semesters) || semesters.length === 0) {
          if (Array.isArray(currentUser.user_metadata?.axon_exam_results_semesters)) {
            semesters = [...currentUser.user_metadata.axon_exam_results_semesters]
          }
        }

        if (!Array.isArray(semesters) || semesters.length === 0) {
          const { data: semsData } = await supabase.from('student_semesters').select('*').eq('user_id', currentUser.id).order('created_at')
          const { data: coursesData } = await supabase.from('student_semester_courses').select('*').eq('user_id', currentUser.id)
          if (semsData && semsData.length > 0) {
            semesters = semsData.map(s => ({
              ...s,
              is_submitted: true,
              courses: (coursesData || []).filter(c => c.semester_id === s.id)
            }))
          }
        }

        if (!Array.isArray(semesters) || semesters.length === 0) {
          semesters = [{
            id: `sem-${Date.now()}`,
            name: targetSemName || 'Year 1 Semester 1',
            is_submitted: true,
            courses: []
          }]
        }

        // 2. Locate or create target semester
        let sem = null
        if (targetSemName) {
          sem = semesters.find(s => s.name?.toLowerCase().includes(targetSemName.toLowerCase()))
          if (!sem) {
            sem = {
              id: `sem-${Date.now()}`,
              name: targetSemName,
              is_submitted: true,
              courses: []
            }
            semesters.push(sem)
          }
        } else {
          // Default to latest semester
          sem = semesters[semesters.length - 1] || semesters[0]
        }

        if (!Array.isArray(sem.courses)) sem.courses = []

        // 3. Find or add course
        let existingCourse = sem.courses.find(c =>
          (courseCode && c.course_code?.toUpperCase() === courseCode) ||
          (courseName && c.course_name?.toLowerCase() === courseName.toLowerCase())
        )

        if (existingCourse) {
          existingCourse.course_code = courseCode || existingCourse.course_code
          existingCourse.course_name = courseName || existingCourse.course_name
          existingCourse.credit_hours = creditHours
          existingCourse.grade = grade
        } else {
          // Check for empty placeholder row
          const emptySlot = sem.courses.find(c => (!c.grade || c.grade === '') && (!c.course_name || c.course_name === '') && (!c.course_code || c.course_code === ''))
          if (emptySlot) {
            emptySlot.course_code = courseCode
            emptySlot.course_name = courseName
            emptySlot.credit_hours = creditHours
            emptySlot.grade = grade
          } else {
            sem.courses.push({
              id: `course-${Date.now()}`,
              semester_id: sem.id,
              course_code: courseCode,
              course_name: courseName,
              credit_hours: creditHours,
              grade
            })
          }
        }

        sem.is_submitted = true

        // 4. Save to localStorage and user_metadata
        if (typeof window !== 'undefined') {
          localStorage.setItem('axon_exam_results_semesters', JSON.stringify(semesters))
        }
        await supabase.auth.updateUser({
          data: { axon_exam_results_semesters: semesters }
        }).catch(() => {})

        // 5. Also upsert to SQL tables student_semesters and student_semester_courses
        try {
          let sqlSemId = null
          const { data: dbSem } = await supabase.from('student_semesters').select('id').eq('user_id', currentUser.id).eq('name', sem.name).maybeSingle()
          if (dbSem?.id) {
            sqlSemId = dbSem.id
          } else {
            const { data: newDbSem } = await supabase.from('student_semesters').insert({ user_id: currentUser.id, name: sem.name }).select('id').maybeSingle()
            sqlSemId = newDbSem?.id
          }

          if (sqlSemId) {
            let courseQuery = supabase.from('student_semester_courses').select('id').eq('semester_id', sqlSemId).eq('user_id', currentUser.id)
            if (courseCode) {
              courseQuery = courseQuery.eq('course_code', courseCode)
            } else {
              courseQuery = courseQuery.eq('course_name', courseName)
            }
            const { data: dbCourse } = await courseQuery.maybeSingle()

            if (dbCourse?.id) {
              await supabase.from('student_semester_courses').update({
                course_code: courseCode,
                course_name: courseName,
                credit_hours: creditHours,
                grade
              }).eq('id', dbCourse.id)
            } else {
              await supabase.from('student_semester_courses').insert({
                semester_id: sqlSemId,
                user_id: currentUser.id,
                course_code: courseCode,
                course_name: courseName,
                credit_hours: creditHours,
                grade
              })
            }
          }
        } catch (dbErr) {
          console.warn('SQL exam results sync warning:', dbErr)
        }

        await logActivity('Recorded course grade', 'exam_result', `${courseCode || courseName} (${grade})`, currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_exam_results_updated'))

        return {
          success: true,
          type,
          data: { semester_name: sem.name, course_code: courseCode, course_name: courseName, credit_hours: creditHours, grade },
          message: `Recorded grade ${grade} for ${courseCode || courseName} in ${sem.name}`
        }
      }

      // 18. DELETE EXAM RESULT
      case 'delete_exam_result': {
        const courseCode = (data.course_code || '').trim().toUpperCase()
        const courseName = (data.course_name || '').trim().toLowerCase()

        let semesters = []
        try {
          const cached = typeof window !== 'undefined' ? localStorage.getItem('axon_exam_results_semesters') : null
          if (cached) semesters = JSON.parse(cached)
        } catch (e) {}

        if (!Array.isArray(semesters) || semesters.length === 0) {
          if (Array.isArray(currentUser.user_metadata?.axon_exam_results_semesters)) {
            semesters = [...currentUser.user_metadata.axon_exam_results_semesters]
          }
        }

        if (Array.isArray(semesters)) {
          semesters.forEach(s => {
            if (Array.isArray(s.courses)) {
              s.courses = s.courses.filter(c => {
                if (courseCode && c.course_code?.toUpperCase() === courseCode) return false
                if (courseName && c.course_name?.toLowerCase() === courseName) return false
                return true
              })
            }
          })
          if (typeof window !== 'undefined') {
            localStorage.setItem('axon_exam_results_semesters', JSON.stringify(semesters))
          }
          await supabase.auth.updateUser({ data: { axon_exam_results_semesters: semesters } }).catch(() => {})
        }

        try {
          let query = supabase.from('student_semester_courses').delete().eq('user_id', currentUser.id)
          if (courseCode) {
            query = query.ilike('course_code', `%${courseCode}%`)
          } else if (courseName) {
            query = query.ilike('course_name', `%${courseName}%`)
          }
          await query
        } catch (err) {}

        await logActivity('Deleted course grade', 'exam_result', courseCode || courseName, currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_exam_results_updated'))

        return { success: true, type, message: `Deleted course ${courseCode || courseName}` }
      }

      // 19. ADD ANNOUNCEMENT (Manager)
      case 'add_announcement': {
        const payload = {
          manager_id: currentUser.id,
          title: (data.title || 'Announcement').trim(),
          message: (data.message || '').trim(),
          type: data.type || 'info',
          expires_at: data.expires_at || null
        }

        const { error } = await supabase.from('announcements').insert(payload)
        if (error) throw error

        await logActivity('Created announcement', 'announcement', payload.title, currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_announcements_updated'))

        return { success: true, type, message: `Created announcement "${payload.title}"` }
      }

      // 20. DELETE ANNOUNCEMENT (Manager)
      case 'delete_announcement': {
        let query = supabase.from('announcements').delete()
        if (data.id) {
          query = query.eq('id', data.id)
        } else if (data.title) {
          query = query.ilike('title', `%${data.title.trim()}%`)
        }

        const { error } = await query
        if (error) throw error

        await logActivity('Deleted announcement', 'announcement', data.title || 'Announcement', currentUser.id)
        window.dispatchEvent(new CustomEvent('axon_announcements_updated'))

        return { success: true, type, message: `Deleted announcement "${data.title || ''}"` }
      }

      default:
        console.warn('Unknown account action type:', type)
        return { success: false, error: `Unknown action type: ${type}` }
    }
  } catch (err) {
    console.error(`Error executing action "${type}":`, err)
    return { success: false, type, error: err.message || 'Execution error' }
  }
}

/**
 * Parses and executes all account actions found in the content.
 */
export async function parseAndExecuteActions(content = '', user) {
  const actions = parseAccountActions(content)
  if (!actions || actions.length === 0) return []

  const results = []
  for (const act of actions) {
    const res = await executeAccountAction(act, user)
    results.push(res)
  }
  return results
}
