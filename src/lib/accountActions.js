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
  if (!dayStr) return null
  const d = String(dayStr).trim().toLowerCase()
  if (d.startsWith('mon') || d.includes('一') || d.startsWith('isnin')) return 'Monday'
  if (d.startsWith('tue') || d.includes('二') || d.startsWith('selasa')) return 'Tuesday'
  if (d.startsWith('wed') || d.includes('三') || d.startsWith('rabu')) return 'Wednesday'
  if (d.startsWith('thu') || d.includes('四') || d.startsWith('khamis')) return 'Thursday'
  if (d.startsWith('fri') || d.includes('五') || d.startsWith('jumaat')) return 'Friday'
  if (d.startsWith('sat') || d.includes('六') || d.startsWith('sabtu')) return 'Saturday'
  if (d.startsWith('sun') || d.includes('日') || d.includes('天') || d.startsWith('ahad')) return 'Sunday'
  return null
}

function normalizeTime(timeStr, defaultTime = null) {
  if (!timeStr) return defaultTime
  let s = String(timeStr).trim().toLowerCase()
  if (s.includes('-') || s.includes('~') || s.includes('to')) {
    s = s.split(/[-~to]/)[0].trim()
  }
  const isPm = s.includes('pm') || s.includes('下午') || s.includes('晚上')
  const isAm = s.includes('am') || s.includes('上午') || s.includes('早上')
  s = s.replace(/am|pm|上午|早上|下午|晚上|点|分/g, '').trim()
  s = s.replace('.', ':')
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
  if (!typeStr) return 'C'
  const t = String(typeStr).trim().toUpperCase()
  if (t === 'P' || t.startsWith('PRAC') || t.startsWith('LAB') || t.includes('实验') || t.includes('上机')) return 'P'
  if (t === 'T' || t.startsWith('TUT') || t.includes('辅导')) return 'T'
  if (t === 'L' || t.startsWith('LEC') || t.includes('讲座') || t.includes('大课')) return 'L'
  if (t === 'C' || t.startsWith('CLASS') || t.includes('课')) return 'C'
  return 'C'
}

export { ACTION_SCHEMA_PROMPT } from './actionSchemaPrompt.js'

/**
 * Fallback parser that reconstructs actions from markdown confirmation tables
 * if the AI model outputted the table without the machine <axon_action> tag.
 */
export function parseTableFallback(content = '') {
  const actions = []

  // 1. Workout table fallback: | ACTIVITY | DATE |
  if (/\|\s*ACTIVITY\s*\|\s*DATE/i.test(content) || /Workout logged/i.test(content)) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line.startsWith('|')) continue
      if (!line.replace(/[|\s\-:]/g, '')) continue
      if (/\|\s*ACTIVITY\s*\|/i.test(line)) continue

      const parts = line.split('|').map(s => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        const activity = parts[0]
        const dateStr = parts[1]
        if (activity) {
          actions.push({
            type: 'log_exercise',
            data: {
              activity_type: activity || 'Gym',
              log_date: /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && dateStr !== '2026-10-15' ? dateStr : getTodayStr()
            }
          })
          break
        }
      }
    }
  }

  // 2. Timetable Class table fallback: | TYPE | COURSE | DAY | TIME |
  if (/\|\s*(TYPE\s*\|\s*COURSE|COURSE\s*\|\s*DAY)/i.test(content) && /\|\s*DAY\s*\|/i.test(content)) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line.startsWith('|')) continue
      if (!line.replace(/[|\s\-:]/g, '')) continue
      if (/\|\s*(TYPE|COURSE)\s*\|/i.test(line) && /\|\s*DAY\s*\|/i.test(line)) continue

      const parts = line.split('|').map(s => s.trim()).filter(Boolean)
      if (parts.length >= 4) {
        let classType = 'C'
        let subject = ''
        let day = ''
        let time = ''
        let venue = 'TBA'
        let lecturer = 'TBA'

        if (/lecture|tutorial|practical|class/i.test(parts[0])) {
          classType = parts[0]
          subject = parts[1]
          day = parts[2]
          time = parts[3]
          venue = parts[4] || 'TBA'
          lecturer = parts[5] || 'TBA'
        } else {
          subject = parts[0]
          day = parts[1]
          time = parts[2]
          venue = parts[3] || 'TBA'
          lecturer = parts[4] || 'TBA'
        }

        if (subject && day && time) {
          const timeParts = time.split(/[-–—to~]/i).map(s => s.trim())
          actions.push({
            type: 'add_class',
            data: {
              subject,
              day,
              start_time: timeParts[0] || time,
              end_time: timeParts[1] || undefined,
              classroom: venue,
              lecturer,
              class_type: classType
            }
          })
        }
      }
    }
  }

  // 3. Exam table fallback: | TYPE | COURSE | TITLE | DATE | TIME |
  if (/\|\s*(TYPE\s*\|\s*COURSE|COURSE\s*\|\s*TITLE|TITLE.*PRACTICAL)/i.test(content) && /\|\s*DATE/i.test(content) && !/ACTIVITY/i.test(content)) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line.startsWith('|')) continue
      if (!line.replace(/[|\s\-:]/g, '')) continue
      if (/\|\s*(TYPE|COURSE)\s*\|/i.test(line) && /\|\s*DATE\s*\|/i.test(line)) continue

      const parts = line.split('|').map(s => s.trim()).filter(Boolean)
      if (parts.length >= 4) {
        let examType = 'Exam'
        let subject = ''
        let title = ''
        let examDate = ''
        let time = ''
        let venue = 'TBA'

        if (/exam|test|quiz|practical|midterm|final/i.test(parts[0])) {
          examType = parts[0]
          subject = parts[1]
          title = parts[2]
          examDate = parts[3]
          time = parts[4] || ''
          venue = parts[5] || 'TBA'
        } else {
          subject = parts[0]
          title = parts[1]
          examDate = parts[2]
          time = parts[3] || ''
          venue = parts[4] || 'TBA'
        }

        const dateMatch = examDate.match(/\d{4}-\d{2}-\d{2}/)
        if (subject && dateMatch) {
          const timeParts = time ? time.split(/[-–—to~]/i).map(s => s.trim()) : []
          actions.push({
            type: 'add_exam',
            data: {
              subject,
              exam_date: dateMatch[0],
              start_time: timeParts[0] || '09:00',
              end_time: timeParts[1] || undefined,
              venue: venue.replace(/Alert.*/i, '').trim() || 'TBA',
              exam_type: examType,
              notes: title && title !== subject ? title : undefined
            }
          })
        }
      }
    }
  }

  // 4. Assignment table fallback: | ASSIGNMENT | COURSE | DEADLINE |
  if (/\|\s*ASSIGNMENT\s*\|\s*COURSE/i.test(content) && /\|\s*DEADLINE/i.test(content)) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line.startsWith('|')) continue
      if (!line.replace(/[|\s\-:]/g, '')) continue
      if (/\|\s*ASSIGNMENT\s*\|/i.test(line)) continue

      const parts = line.split('|').map(s => s.trim()).filter(Boolean)
      if (parts.length >= 3) {
        const title = parts[0]
        const subject = parts[1]
        const deadline = parts[2]
        const priority = parts[3] || 'Medium'
        const status = parts[4] || 'Pending'

        const dateMatch = deadline.match(/\d{4}-\d{2}-\d{2}/)
        if (title && (dateMatch || deadline)) {
          actions.push({
            type: 'add_assignment',
            data: {
              title,
              subject: subject || title,
              deadline: dateMatch ? dateMatch[0] : deadline,
              priority: /high/i.test(priority) ? 'High' : /low/i.test(priority) ? 'Low' : 'Medium',
              status: /done/i.test(status) ? 'Done' : /progress/i.test(status) ? 'In Progress' : 'Pending'
            }
          })
        }
      }
    }
  }

  // 5. Reminder table fallback: | REMINDER | TIME |
  if (/\|\s*REMINDER\s*\|\s*TIME/i.test(content)) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line.startsWith('|')) continue
      if (!line.replace(/[|\s\-:]/g, '')) continue
      if (/\|\s*REMINDER\s*\|/i.test(line)) continue

      const parts = line.split('|').map(s => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        const title = parts[0]
        const time = parts[1]
        const repeat = parts[2] || 'once'

        if (title && time) {
          actions.push({
            type: 'add_reminder',
            data: {
              title,
              reminder_time: time,
              repeat_type: /daily/i.test(repeat) ? 'daily' : /weekday/i.test(repeat) ? 'weekdays' : /week/i.test(repeat) ? 'weekly' : 'once'
            }
          })
        }
      }
    }
  }

  // 6. Diet / Food table fallback: | MEAL TYPE | FOOD ITEM | PORTION | CALORIES | PROTEIN | CARBS | FATS |
  if (/\|\s*(MEAL\s*TYPE|FOOD\s*ITEM)\s*\|/i.test(content) && /\|\s*(CALORIES|PROTEIN)\s*\|/i.test(content)) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line.startsWith('|')) continue
      if (!line.replace(/[|\s\-:]/g, '')) continue
      if (/\|\s*(MEAL\s*TYPE|FOOD\s*ITEM)\s*\|/i.test(line)) continue

      const parts = line.split('|').map(s => s.trim()).filter(Boolean)
      if (parts.length >= 4) {
        let mealType = 'Snack'
        let name = ''
        let portion = ''
        let calories = 0
        let protein = 0
        let carbs = 0
        let fats = 0

        if (parts.length >= 7) {
          mealType = parts[0]
          name = parts[1]
          portion = parts[2]
          calories = parseFloat(parts[3].replace(/[^\d.]/g, '')) || 0
          protein = parseFloat(parts[4].replace(/[^\d.]/g, '')) || 0
          carbs = parseFloat(parts[5].replace(/[^\d.]/g, '')) || 0
          fats = parseFloat(parts[6].replace(/[^\d.]/g, '')) || 0
        } else if (parts.length >= 5) {
          name = parts[0]
          portion = parts[1]
          calories = parseFloat(parts[2].replace(/[^\d.]/g, '')) || 0
          protein = parseFloat(parts[3].replace(/[^\d.]/g, '')) || 0
          carbs = parseFloat(parts[4].replace(/[^\d.]/g, '')) || 0
          fats = parts[5] ? (parseFloat(parts[5].replace(/[^\d.]/g, '')) || 0) : 0
        } else {
          name = parts[0]
          calories = parseFloat(parts[1].replace(/[^\d.]/g, '')) || 0
          protein = parseFloat(parts[2].replace(/[^\d.]/g, '')) || 0
          carbs = parseFloat(parts[3].replace(/[^\d.]/g, '')) || 0
        }

        if (name && calories > 0) {
          actions.push({
            type: 'log_diet',
            data: {
              name,
              calories,
              protein,
              carbs,
              fats,
              meal_type: mealType || 'Snack',
              notes: portion || '',
              date: getTodayDateStr(),
              meal_time: getCurrentTimeStr()
            }
          })
          break
        }
      }
    }
  }

  // 7. Settings / Preference table fallback: | SETTING | VALUE |
  if (/\|\s*(SETTING|PREFERENCE)\s*\|/i.test(content) && /\|\s*(VALUE|STATUS|SELECTION)\s*\|/i.test(content)) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line.startsWith('|')) continue
      if (!line.replace(/[|\s\-:]/g, '')) continue
      if (/\|\s*(SETTING|PREFERENCE)\s*\|/i.test(line)) continue

      const parts = line.split('|').map(s => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        const rawKey = parts[0]
        const rawVal = parts[1]
        if (rawKey && rawVal) {
          actions.push({
            type: 'update_preference',
            data: {
              key: rawKey,
              value: rawVal
            }
          })
        }
      }
    }
  }

  return actions
}

/**
 * Extracts and parses all <axon_action> JSON blocks from AI response text.
 */
export function parseAccountActions(content = '') {
  if (!content || typeof content !== 'string') return []
  const actions = []

  // 1. Unescape HTML entities
  const cleanContent = content
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')

  // 2. Parse <axon_action> or <action> blocks (including unclosed tags at message end)
  const tagRegex = /<(?:axon_)?action>([\s\S]*?)(?:<\/(?:axon_)?action>|$)/gi
  let match

  while ((match = tagRegex.exec(cleanContent)) !== null) {
    let rawJson = match[1]?.trim() || ''
    // Clean code blocks
    rawJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/```$/s, '').trim()
    // Remove single line comments
    rawJson = rawJson.replace(/\/\/[^\n]*\n/g, '')
    // Remove trailing commas before closing braces or brackets
    rawJson = rawJson.replace(/,\s*([\]}])/g, '$1')

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

  // 3. If no actions from tags, check for standalone JSON code block with "type" and "data"
  if (actions.length === 0) {
    const jsonBlockRegex = /```(?:json)?\s*({[\s\S]*?"type"\s*:[\s\S]*?})\s*```/gi
    let jsonMatch
    while ((jsonMatch = jsonBlockRegex.exec(cleanContent)) !== null) {
      let rawJson = jsonMatch[1].trim()
      rawJson = rawJson.replace(/,\s*([\]}])/g, '$1')
      try {
        const parsed = JSON.parse(rawJson)
        if (parsed && parsed.type && parsed.data) {
          actions.push(parsed)
        }
      } catch (e) {}
    }
  }

  // 4. If still no actions, fall back to parsing Markdown confirmation tables
  if (actions.length === 0) {
    const tableActions = parseTableFallback(cleanContent)
    if (tableActions.length > 0) {
      actions.push(...tableActions)
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
  return content
    .replace(/<(?:axon_)?action>[\s\S]*?(?:<\/(?:axon_)?action>|$)/gi, '')
    .trim()
}

/**
 * Executes a single parsed account action in Supabase using the authenticated user's session.
 */
export async function executeAccountAction(action, user, contextMeta = {}) {
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
        const subject = (data.subject || '').trim()
        const examDate = (data.exam_date || '').trim()
        if (!subject) {
          return { success: false, error: 'Cannot add exam: Course or subject name is missing.' }
        }
        if (!examDate) {
          return { success: false, error: 'Cannot add exam: Exam date is missing. Please ask the user for the exam date.' }
        }

        const startTime = normalizeTime(data.start_time)
        if (!startTime) {
          return { success: false, error: 'Cannot add exam: Exam start time is missing. Please ask the user what time the exam starts.' }
        }

        let endTime = normalizeTime(data.end_time)
        if (!endTime) {
          const [h, m] = startTime.split(':').map(Number)
          const endH = Math.min(23, h + 2)
          endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        }

        const payload = {
          user_id: currentUser.id,
          subject,
          exam_date: examDate,
          start_time: startTime,
          end_time: endTime,
          exam_type: data.exam_type ? data.exam_type.trim() : 'Exam',
          venue: (data.venue || '').trim() || 'TBA',
          notes: data.notes ? data.notes.trim() : ''
        }

        const { data: inserted, error } = await supabase
          .from('exams')
          .insert(payload)
          .select()
          .maybeSingle()

        if (error) throw error

        await logActivity('Added exam', 'exam', payload.subject, currentUser.id, {
          exam_date: payload.exam_date,
          start_time: payload.start_time,
          end_time: payload.end_time,
          venue: payload.venue,
          exam_type: payload.exam_type
        })
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

        await logActivity('Updated exam', 'exam', data.subject || 'Exam', currentUser.id, {
          exam_date: data.exam_date,
          start_time: data.start_time,
          end_time: data.end_time,
          venue: data.venue,
          exam_type: data.exam_type
        })
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

        await logActivity('Deleted exam', 'exam', data.subject || 'Exam', currentUser.id, {
          exam_date: data.exam_date
        })
        window.dispatchEvent(new CustomEvent('axon_exams_updated'))

        return { success: true, type, message: `Deleted exam "${data.subject || ''}"` }
      }

      // 4. ADD ASSIGNMENT
      case 'add_assignment': {
        const title = (data.title || data.subject || '').trim()
        const deadline = (data.deadline || '').trim()
        if (!title) {
          return { success: false, error: 'Cannot add assignment: Assignment title is missing.' }
        }
        if (!deadline) {
          return { success: false, error: 'Cannot add assignment: Deadline due date is missing. Please ask the user when it is due.' }
        }

        const payload = {
          user_id: currentUser.id,
          title,
          subject: (data.subject || '').trim(),
          deadline,
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

        await logActivity('Added assignment', 'assignment', payload.title, currentUser.id, {
          subject: payload.subject,
          deadline: payload.deadline,
          priority: payload.priority
        })
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

        await logActivity('Updated assignment', 'assignment', data.title || 'Assignment', currentUser.id, {
          subject: data.subject,
          deadline: data.deadline,
          priority: data.priority,
          status: data.status
        })
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

        await logActivity('Deleted assignment', 'assignment', data.title || 'Assignment', currentUser.id, {
          subject: data.subject
        })
        window.dispatchEvent(new CustomEvent('axon_assignments_updated'))

        return { success: true, type, message: `Deleted assignment "${data.title || ''}"` }
      }

      // 7. ADD CLASS / REPLACEMENT CLASS
      case 'add_class': {
        const subject = (data.subject || '').trim()
        const day = normalizeDay(data.day)
        const startTime = normalizeTime(data.start_time)

        if (!subject) {
          return { success: false, error: 'Cannot add class: Course or subject name is missing.' }
        }
        if (!day) {
          return { success: false, error: 'Cannot add class: Day of the week is missing. Please ask the user which day.' }
        }
        if (!startTime) {
          return { success: false, error: 'Cannot add class: Class start time is missing. Please ask the user what time.' }
        }

        let endTime = normalizeTime(data.end_time)
        if (!endTime && data.start_time && /[-~to]/i.test(String(data.start_time))) {
          const rangeParts = String(data.start_time).split(/[-~to]/i)
          if (rangeParts[1]) endTime = normalizeTime(rangeParts[1])
        }
        if (!endTime) {
          const [h, m] = startTime.split(':').map(Number)
          const endH = Math.min(23, h + 1)
          endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        }

        const classroom = (data.classroom || '').trim() || 'TBA'
        const lecturer = (data.lecturer || '').trim() || 'TBA'
        const classType = normalizeClassType(data.class_type)
        const color = data.color || (classType === 'L' ? 'blue' : classType === 'T' ? 'green' : classType === 'P' ? 'purple' : 'pink')
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
        await logActivity('Added class', 'class', subject, currentUser.id, {
          day,
          start_time: startTime,
          end_time: endTime,
          classroom,
          lecturer,
          class_type: classType
        })
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
        await logActivity('Updated class', 'class', data.subject || 'Class', currentUser.id, {
          day: data.day ? normalizeDay(data.day) : undefined,
          start_time: data.start_time ? normalizeTime(data.start_time) : undefined,
          end_time: data.end_time ? normalizeTime(data.end_time) : undefined,
          classroom: data.classroom,
          lecturer: data.lecturer,
          class_type: data.class_type ? normalizeClassType(data.class_type) : undefined
        })
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
        await logActivity('Deleted class', 'class', data.subject || 'Class', currentUser.id, {
          day: cleanDay
        })
        window.dispatchEvent(new CustomEvent('axon_classes_updated'))

        return { success: true, type, message: `Deleted class "${data.subject || ''}"` }
      }

      // 10. ADD REMINDER
      case 'add_reminder': {
        const title = (data.title || '').trim()
        const reminderTime = normalizeTime(data.reminder_time)
        if (!title) {
          return { success: false, error: 'Cannot add reminder: Reminder task or title is missing.' }
        }
        if (!reminderTime) {
          return { success: false, error: 'Cannot add reminder: Reminder time is missing. Please ask the user what time.' }
        }

        const payload = {
          user_id: currentUser.id,
          title,
          reminder_time: reminderTime,
          repeat_type: data.repeat_type || 'once',
          is_active: data.is_active !== false
        }

        const { data: inserted, error } = await supabase
          .from('reminders')
          .insert(payload)
          .select()
          .maybeSingle()

        if (error) throw error

        await logActivity('Added reminder', 'reminder', payload.title, currentUser.id, {
          reminder_time: payload.reminder_time
        })
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

        await logActivity('Updated reminder', 'reminder', data.title || 'Reminder', currentUser.id, {
          reminder_time: data.reminder_time
        })
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
        const activityType = (data.activity_type || 'Gym').trim() || 'Gym'
        const isStaleExampleDate = data.log_date === '2026-10-15'
        const logDate = (!data.log_date || data.log_date === 'today' || isStaleExampleDate) ? getTodayStr() : data.log_date

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

        // Broadcast exercise update event to all active windows/tabs
        window.dispatchEvent(new CustomEvent('axon_exercise_updated'))
        await logActivity('Exercise check-in', 'exercise', activityType, currentUser.id, {
          activity_type: activityType,
          log_date: logDate,
          duration: data.duration,
          distance: data.distance,
          calories: data.calories
        })

        if (checkInResult?.error === 'Already checked in today') {
          return {
            success: true,
            type,
            data: { activityType, logDate },
            message: `You are already checked in for today (${activityType})! Streak is active 🔥`
          }
        }

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

      // 16. UPDATE PREFERENCE / SETTINGS
      case 'update_preference':
      case 'update_preferences':
      case 'update_setting':
      case 'update_settings':
      case 'change_setting':
      case 'change_settings': {
        const normalizePrefKey = (k) => {
          const lk = String(k || '').trim().toLowerCase().replace(/[_\s-]+/g, '')
          if (lk === 'theme' || lk === 'darkmode' || lk === 'lightmode' || lk === 'appearance') return 'theme'
          if (lk.includes('accent') || lk === 'color' || lk === 'themecolor') return 'accentColor'
          if (lk.includes('font') || lk === 'size' || lk === 'fontsize') return 'fontSize'
          if (lk.includes('compact')) return 'compactMode'
          if (lk === 'language' || lk === 'applanguage' || lk === 'interfacelanguage') return 'appLanguage'
          if (lk === 'ailanguage') return 'aiLanguage'
          if (lk === 'aistyle') return 'aiStyle'
          if (lk.includes('timeformat') || lk === 'time') return 'timeFormat'
          if (lk.includes('firstday') || lk.includes('startofweek')) return 'firstDay'
          if (lk.includes('dailytip')) return 'dailyTipEnabled'
          if (lk.includes('classnotif')) return 'axon_class_notify'
          if (lk.includes('examnotif')) return 'axon_exam_notify'
          if (lk.includes('notifyminute') || lk.includes('leadtime')) return 'axon_notify_minutes'
          return k
        }

        const normalizePrefValue = (normKey, val) => {
          let s = String(val || '').trim().toLowerCase()
          if (normKey === 'theme') {
            if (s.includes('dark')) return 'dark'
            if (s.includes('light')) return 'light'
            if (s.includes('sys') || s.includes('auto')) return 'system'
            return s
          }
          if (normKey === 'compactMode' || normKey === 'dailyTipEnabled' || normKey === 'axon_class_notify' || normKey === 'axon_exam_notify') {
            if (s === 'true' || s.includes('enable') || s.includes('on') || s.includes('yes')) return 'true'
            if (s === 'false' || s.includes('disable') || s.includes('off') || s.includes('no')) return 'false'
            return s
          }
          if (normKey === 'appLanguage') {
            if (s.includes('zh') || s.includes('中文') || s.includes('chinese')) return 'zh'
            if (s.includes('en') || s.includes('eng')) return 'en'
            return s
          }
          if (normKey === 'timeFormat') {
            if (s.includes('12')) return '12hr'
            if (s.includes('24')) return '24hr'
            return s
          }
          if (normKey === 'firstDay') {
            if (s.includes('sun')) return 'Sunday'
            if (s.includes('mon')) return 'Monday'
            return s
          }
          if (normKey === 'fontSize') {
            if (s.includes('sm')) return 'small'
            if (s.includes('lg') || s.includes('big') || s.includes('lar')) return 'large'
            return 'medium'
          }
          return String(val).trim()
        }

        const entriesToUpdate = []
        if (data.key && data.value !== undefined) {
          const k = normalizePrefKey(data.key)
          const v = normalizePrefValue(k, data.value)
          entriesToUpdate.push([k, v])
        } else {
          const reserved = ['type', 'id', 'user_id']
          for (const [k, v] of Object.entries(data)) {
            if (reserved.includes(k) || v === undefined || v === null) continue
            const normKey = normalizePrefKey(k)
            const normVal = normalizePrefValue(normKey, v)
            entriesToUpdate.push([normKey, normVal])
          }
        }

        const updatedMessages = []
        for (const [k, v] of entriesToUpdate) {
          await updatePreference(currentUser, k, String(v))
          await logActivity('Updated preference', 'settings', `${k}: ${v}`, currentUser.id)
          updatedMessages.push(`${k} -> ${v}`)
        }

        return {
          success: true,
          type,
          data: Object.fromEntries(entriesToUpdate),
          message: updatedMessages.length > 0 ? `Updated settings: ${updatedMessages.join(', ')}` : 'Settings updated.'
        }
      }

      // 17. ADD EXAM RESULT / COURSE GRADE
      case 'add_exam_result': {
        const rawCode = (data.course_code || '').trim().toUpperCase()
        const rawName = (data.course_name || '').trim()
        const courseCode = rawCode || (Object.keys(COMMON_SE_COURSES).find(k => COMMON_SE_COURSES[k].toLowerCase() === rawName.toLowerCase()) || '')
        const courseName = rawName || COMMON_SE_COURSES[rawCode] || rawCode || ''

        if (!courseCode && !courseName) {
          return { success: false, error: 'Cannot record exam result: Course code or name is missing.' }
        }

        const rawGrade = (data.grade || '').trim().toUpperCase()
        if (!rawGrade) {
          return { success: false, error: 'Cannot record exam result: Grade is missing (e.g. A, B+, C). Please ask the user what grade they received.' }
        }

        const rawCredit = data.credit_hours !== undefined && data.credit_hours !== null && String(data.credit_hours).trim() !== '' ? Number(data.credit_hours) : null
        if (rawCredit === null || isNaN(rawCredit) || rawCredit <= 0) {
          return { success: false, error: 'Cannot record exam result: Credit hours is missing. Please ask the user how many credit hours this course is (e.g. 3 or 4 credits).' }
        }
        const creditHours = rawCredit

        const targetSemName = (data.semester_name || '').trim()
        if (!targetSemName) {
          return { success: false, error: 'Cannot record exam result: Semester is missing. Please ask the user which semester this course was taken in (e.g. Year 1 Semester 1).' }
        }

        const grade = rawGrade

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

      // 21. LOG DIET / FOOD
      case 'log_diet':
      case 'add_food':
      case 'log_food':
      case 'add_diet': {
        const foodName = (data.name || data.food_name || '').trim()
        if (!foodName) {
          return { success: false, error: 'Cannot log food: Food or meal name is missing.' }
        }

        const calories = Math.max(0, Math.round(Number(data.calories) || 0))
        const protein = Math.max(0, Math.round((Number(data.protein) || 0) * 10) / 10)
        const carbs = Math.max(0, Math.round((Number(data.carbs) || 0) * 10) / 10)
        const fats = Math.max(0, Math.round((Number(data.fats) || 0) * 10) / 10)

        const date = (data.date || data.log_date || getTodayDateStr()).trim()
        const mealTime = (data.meal_time || getCurrentTimeStr()).trim()
        const mealType = data.meal_type || getMealTypeFromTime(mealTime)
        const notes = (data.notes || data.portion || '').trim()
        const imageUrl = (data.image_url || contextMeta?.image_url || '').trim()

        const nutritionData = await fetchNutritionData(currentUser.id)
        const currentLogs = nutritionData.logs || []

        const foodItem = {
          user_id: currentUser.id,
          date,
          meal_type: mealType,
          meal_time: mealTime,
          name: foodName,
          calories,
          protein,
          carbs,
          fats,
          notes,
          image_url: imageUrl
        }

        const result = await saveFoodLogItem(currentUser.id, foodItem, currentLogs)
        window.dispatchEvent(new CustomEvent('axon_diet_updated'))

        return {
          success: true,
          type: 'log_diet',
          data: result.item,
          message: `Logged "${foodName}" (${calories} kcal, ${protein}g protein) to your diet!`
        }
      }

      // 22. DELETE DIET / FOOD ITEM
      case 'delete_diet':
      case 'delete_food':
      case 'delete_diet_log': {
        const nutritionData = await fetchNutritionData(currentUser.id)
        const currentLogs = nutritionData.logs || []
        let targetId = data.id
        if (!targetId && (data.name || data.food_name)) {
          const searchName = (data.name || data.food_name).toLowerCase().trim()
          const match = currentLogs.find(l => (l.name || '').toLowerCase().includes(searchName))
          if (match) targetId = match.id
        }
        if (!targetId) {
          return { success: false, error: 'Cannot find meal item to delete.' }
        }

        await deleteFoodLogItem(currentUser.id, targetId, currentLogs)
        window.dispatchEvent(new CustomEvent('axon_diet_updated'))
        return { success: true, type: 'delete_diet', message: `Deleted meal from your diet log.` }
      }

      // 23. UPDATE DIET GOALS
      case 'update_diet_goals':
      case 'update_nutrition_goals': {
        const saved = await saveNutritionGoals(currentUser.id, {
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats
        })
        window.dispatchEvent(new CustomEvent('axon_diet_updated'))
        return { success: true, type: 'update_diet_goals', message: `Updated daily nutrition goals to ${saved.calories} kcal!` }
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
export async function parseAndExecuteActions(content = '', user, contextMeta = {}) {
  const actions = parseAccountActions(content)
  if (!actions || actions.length === 0) return []

  const results = []
  for (const act of actions) {
    const res = await executeAccountAction(act, user, contextMeta)
    results.push(res)
  }
  return results
}
