import { supabase } from './supabase.js'
import { logActivity } from './logActivity.js'
import { clearCache } from './cache.js'
import { updatePreference } from './preferences.js'
import { fetchExerciseData, logExerciseCheckIn, getTodayStr } from './exerciseUtils.js'
import {
  fetchNutritionData,
  saveFoodLogItem,
  deleteFoodLogItem,
  saveNutritionGoals,
  getMealTypeFromTime,
  getTodayDateStr,
  getCurrentTimeStr
} from './nutritionUtils.js'

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

function parseNutrient(v) {
  if (typeof v === 'number') return isNaN(v) ? 0 : v
  if (!v) return 0
  const cleaned = String(v).replace(/[^\d.]/g, '')
  return parseFloat(cleaned) || 0
}

function normalizePrefKey(k) {
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

function normalizePrefValue(normKey, val) {
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

export { ACTION_SCHEMA_PROMPT } from './actionSchemaPrompt.js'

export function extractDateFromText(text = '') {
  if (!text) return null
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (isoMatch && isoMatch[1] !== '2026-10-15') return isoMatch[1]

  const monthNames = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  }
  const datePattern = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+(20\d{2}))?\b/i
  const dmMatch = text.match(datePattern)
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, '0')
    const mon = monthNames[dmMatch[2].slice(0, 3).toLowerCase()] || '01'
    const yr = dmMatch[3] || '2026'
    return `${yr}-${mon}-${day}`
  }

  const zhDateMatch = text.match(/(?:(\d{4})年)?\s*(\d{1,2})月(\d{1,2})日/)
  if (zhDateMatch) {
    const yr = zhDateMatch[1] || '2026'
    const mon = String(zhDateMatch[2]).padStart(2, '0')
    const day = String(zhDateMatch[3]).padStart(2, '0')
    return `${yr}-${mon}-${day}`
  }

  if (/tomorrow|明天|esok/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  return null
}

function getCol(parts, headers, pattern) {
  const idx = headers.findIndex(h => pattern.test(h))
  return idx >= 0 && parts[idx] ? parts[idx] : null
}

/**
 * Fallback parser that reconstructs actions from markdown confirmation tables
 * with dynamic column position detection and flexible header names.
 */
export function parseTableFallback(content = '') {
  const actions = []
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'))
  if (lines.length < 2) return actions

  let headerIndex = -1
  let headers = []
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.replace(/[|\s\-:]/g, '')) continue
    const parts = raw.split('|').map(s => s.trim().toLowerCase()).filter(Boolean)
    if (parts.length >= 2) {
      headerIndex = i
      headers = parts
      break
    }
  }

  if (headerIndex === -1 || headerIndex >= lines.length - 1) return actions

  const isClassTable = headers.some(h => /day|hari|星期|周期/i.test(h)) && headers.some(h => /time|masa|时间/i.test(h))
  const isWorkoutTable = headers.some(h => /activity|workout|exercise|运动|健身/i.test(h))
  const isDietTable = headers.some(h => /calorie|kcal|protein|热量|卡路里/i.test(h))
  const isExamTable = headers.some(h => /exam|test|quiz|考试|测验/i.test(h)) || (headers.some(h => /course|subject|科目/i.test(h)) && headers.some(h => /date|日期/i.test(h)) && !isClassTable)
  const isAssignTable = headers.some(h => /assignment|task|coursework|作业|任务/i.test(h)) || headers.some(h => /deadline|due|截止/i.test(h))
  const isSettingsTable = headers.some(h => /setting|preference|设置|偏好/i.test(h)) && headers.some(h => /value|status|值|状态/i.test(h))
  const isResultTable = headers.some(h => /grade|score|成绩/i.test(h)) && headers.some(h => /credit|学分/i.test(h))
  const isReminderTable = headers.some(h => /reminder|remind|提醒/i.test(h)) && headers.some(h => /time|时间/i.test(h))

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.replace(/[|\s\-:]/g, '')) continue
    const parts = line.split('|').map(s => s.trim()).filter(Boolean)
    if (parts.length < 2) continue

    // 1. Workout table
    if (isWorkoutTable) {
      const act = getCol(parts, headers, /activity|workout|exercise|运动/i) || parts[0]
      const rawDate = getCol(parts, headers, /date|日期/i)
      const date = (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate !== '2026-10-15') ? rawDate : getTodayStr()
      if (act && !/activity|workout/i.test(act)) {
        actions.push({
          type: 'log_exercise',
          data: {
            activity_type: act,
            log_date: date
          }
        })
        break
      }
    }

    // 2. Timetable class table
    else if (isClassTable) {
      const subj = getCol(parts, headers, /subject|course|class|module|name|科目/i) || parts[0]
      const rawDay = getCol(parts, headers, /day|hari|星期|周期/i)
      const day = normalizeDay(rawDay)
      const rawTime = getCol(parts, headers, /time|masa|时间/i)
      const room = getCol(parts, headers, /venue|room|loc|classroom|地点/i) || 'TBA'
      const lec = getCol(parts, headers, /lecturer|teacher|instructor|讲师/i) || 'TBA'
      const type = getCol(parts, headers, /type|jenis|类型/i) || 'C'

      let startTime = normalizeTime(rawTime)
      let endTime = null
      if (rawTime && /[-~to]/i.test(rawTime)) {
        const tParts = rawTime.split(/[-~to]/i)
        startTime = normalizeTime(tParts[0])
        endTime = normalizeTime(tParts[1])
      }
      if (subj && day && startTime) {
        actions.push({
          type: 'add_class',
          data: {
            subject: subj,
            day,
            start_time: startTime,
            end_time: endTime || startTime,
            classroom: room,
            lecturer: lec,
            class_type: type,
            color: 'pink'
          }
        })
      }
    }

    // 3. Exam table
    else if (isExamTable) {
      const subj = getCol(parts, headers, /subject|course|module|name|title|科目/i) || parts[0]
      const rawDate = getCol(parts, headers, /date|tarikh|日期/i)
      const date = extractDateFromText(rawDate)
      const rawTime = getCol(parts, headers, /time|masa|时间/i)
      const startTime = normalizeTime(rawTime)
      const venue = getCol(parts, headers, /venue|room|loc|地点/i) || 'TBA'
      const type = getCol(parts, headers, /type|jenis|类型/i) || 'Exam'

      if (subj && date && startTime) {
        actions.push({
          type: 'add_exam',
          data: {
            subject: subj,
            exam_date: date,
            start_time: startTime,
            end_time: startTime,
            venue: venue.replace(/Alert.*/i, '').trim() || 'TBA',
            exam_type: type
          }
        })
      }
    }

    // 4. Assignment table
    else if (isAssignTable) {
      const title = getCol(parts, headers, /assignment|task|coursework|title|name|作业/i) || parts[0]
      const rawDate = getCol(parts, headers, /deadline|due|tarikh|截止/i)
      const deadline = extractDateFromText(rawDate)
      const subj = getCol(parts, headers, /subject|course|科目/i) || ''
      const prio = getCol(parts, headers, /priority|优先级/i) || 'Medium'

      if (title && deadline) {
        actions.push({
          type: 'add_assignment',
          data: {
            title,
            subject: subj,
            deadline,
            priority: /high/i.test(prio) ? 'High' : /low/i.test(prio) ? 'Low' : 'Medium',
            status: 'Pending'
          }
        })
      }
    }

    // 5. Diet / Food table
    else if (isDietTable) {
      const name = getCol(parts, headers, /food|item|meal|dish|食物|菜品/i) || parts[0]
      const rawCal = getCol(parts, headers, /calorie|kcal|热量|卡路里/i)
      const cal = parseNutrient(rawCal)
      const rawProt = getCol(parts, headers, /protein|蛋白质/i)
      const prot = parseNutrient(rawProt)
      const rawCarb = getCol(parts, headers, /carb|碳水/i)
      const carbs = parseNutrient(rawCarb)
      const rawFat = getCol(parts, headers, /fat|脂肪/i)
      const fats = parseNutrient(rawFat)
      const mealType = getCol(parts, headers, /meal\s*type|type|餐别/i) || 'Snack'
      const portion = getCol(parts, headers, /portion|份量/i) || ''

      if (name && (cal > 0 || prot > 0)) {
        actions.push({
          type: 'log_diet',
          data: {
            name,
            calories: cal,
            protein: prot,
            carbs,
            fats,
            meal_type: mealType,
            notes: portion,
            date: getTodayDateStr(),
            meal_time: getCurrentTimeStr()
          }
        })
        break
      }
    }

    // 6. Settings table
    else if (isSettingsTable) {
      const k = getCol(parts, headers, /setting|preference|设置/i) || parts[0]
      const v = getCol(parts, headers, /value|status|值/i) || parts[1]
      if (k && v) {
        actions.push({ type: 'update_preference', data: { key: k, value: v } })
      }
    }

    // 7. Exam Result table
    else if (isResultTable) {
      const code = getCol(parts, headers, /code|course|subject|科目/i) || parts[0]
      const grade = getCol(parts, headers, /grade|score|成绩/i)
      const credit = getCol(parts, headers, /credit|ch|学分/i)
      const sem = getCol(parts, headers, /semester|term|学期/i) || 'Year 1 Semester 1'
      if (code && grade) {
        actions.push({
          type: 'add_exam_result',
          data: {
            course_code: code,
            grade: grade.toUpperCase(),
            credit_hours: parseInt(credit, 10) || 3,
            semester_name: sem
          }
        })
      }
    }

    // 8. Reminder table
    else if (isReminderTable) {
      const title = getCol(parts, headers, /reminder|task|remind|提醒/i) || parts[0]
      const rawTime = getCol(parts, headers, /time|时间/i)
      const time = normalizeTime(rawTime)
      const repeat = getCol(parts, headers, /repeat|频率/i) || 'once'
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

  return actions
}

/**
 * Extracts account actions directly from conversational intent (natural language)
 * if the AI responded positively to the user's action request without tags or tables.
 */
export function parseConversationalIntent(content = '', userPrompt = '') {
  const actions = []
  const combo = `${userPrompt}\n${content}`

  // 1. Workout Intent
  const isWorkoutReq = /(log|check\s*in|record|track|did|completed?)\s*(my\s*)?(workout|gym|exercise|run|training)|workout\s*today|gym\s*today|运动打卡|健身打卡/i.test(userPrompt)
  const isWorkoutConfirmed = /(logged|checked\s*in|recorded|done|great job|streak|active|\+20\s*xp|打卡成功|已记录)/i.test(content)
  const isWorkoutDenied = /(please specify|what workout|which activity|could you tell me)/i.test(content)

  if (isWorkoutReq && isWorkoutConfirmed && !isWorkoutDenied) {
    let act = 'Gym'
    if (/run|jog|跑步/i.test(combo)) act = 'Run'
    else if (/swim|游泳/i.test(combo)) act = 'Swim'
    else if (/yoga|瑜伽/i.test(combo)) act = 'Yoga'
    else if (/basketball|篮球/i.test(combo)) act = 'Basketball'
    else if (/walk|散步|徒步/i.test(combo)) act = 'Walk'

    actions.push({
      type: 'log_exercise',
      data: {
        activity_type: act,
        log_date: getTodayStr()
      }
    })
    return actions
  }

  // 2. Settings Intent
  if (/dark\s*mode|theme\s*to\s*dark|switch.*dark|深色模式|暗黑模式/i.test(userPrompt)) {
    actions.push({ type: 'update_preference', data: { key: 'theme', value: 'dark' } })
    return actions
  } else if (/light\s*mode|theme\s*to\s*light|switch.*light|浅色模式|明亮模式/i.test(userPrompt)) {
    actions.push({ type: 'update_preference', data: { key: 'theme', value: 'light' } })
    return actions
  }

  const accentMatch = userPrompt.match(/accent\s*(?:color)?\s*(?:to\s*)?(purple|blue|emerald|green|rose|pink|amber|orange|cyan|indigo)/i)
  if (accentMatch) {
    actions.push({ type: 'update_preference', data: { key: 'accentColor', value: accentMatch[1].toLowerCase() } })
    return actions
  }

  const fontMatch = userPrompt.match(/font\s*(?:size)?\s*(?:to\s*)?(small|medium|large)/i)
  if (fontMatch) {
    actions.push({ type: 'update_preference', data: { key: 'fontSize', value: fontMatch[1].toLowerCase() } })
    return actions
  }

  // 3. Timetable Class Intent
  const isClassReq = /(add|put|schedule|insert).*(class|timetable|course|lecture|tutorial|practical)|(加课|添加课表|加到课表)/i.test(userPrompt)
  const isClassConfirmed = /(added|scheduled|timetable|put on your schedule|已添加|已安排|安排在)/i.test(content)
  if (isClassReq && isClassConfirmed) {
    const dayMatch = combo.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期日)\b/i)
    const normDay = dayMatch ? normalizeDay(dayMatch[1]) : null

    const timeRangeMatch = combo.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to|~)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)
    const singleTimeMatch = !timeRangeMatch ? combo.match(/\b(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i) : null

    let start = null
    let end = null
    if (timeRangeMatch) {
      start = normalizeTime(timeRangeMatch[1])
      end = normalizeTime(timeRangeMatch[2])
    } else if (singleTimeMatch) {
      start = normalizeTime(singleTimeMatch[1])
      const [h, m] = start.split(':').map(Number)
      end = `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const courseCodeMatch = combo.match(/\b([A-Z]{4}\d{4})\b/i)
    let subject = courseCodeMatch ? courseCodeMatch[1].toUpperCase() : ''
    if (!subject) {
      const nameMatch = userPrompt.match(/(?:name|course|subject|class)\s+([A-Za-z0-9\s]{2,20})/i)
      if (nameMatch) subject = nameMatch[1].trim()
    }
    if (!subject) {
      const addedMatch = content.match(/(?:added|scheduled)\s+([A-Za-z0-9\s]+?)\s+(?:on|for|every|to|at)/i)
      if (addedMatch) subject = addedMatch[1].trim()
    }

    if (subject && normDay && start) {
      actions.push({
        type: 'add_class',
        data: {
          subject,
          day: normDay,
          start_time: start,
          end_time: end || start,
          classroom: 'TBA',
          lecturer: 'TBA',
          class_type: /practical|lab|实验/i.test(combo) ? 'P' : /tutorial|辅导/i.test(combo) ? 'T' : /lecture|大课/i.test(combo) ? 'L' : 'C',
          color: 'pink'
        }
      })
      return actions
    }
  }

  // 4. Exam / Test Intent
  const isExamReq = /(add|record|schedule|got\s*a).*(exam|test|quiz|midterm|final|测验|考试)/i.test(userPrompt)
  const isExamConfirmed = /(added|recorded|scheduled|countdown|已添加|已记录)/i.test(content)
  if (isExamReq && isExamConfirmed) {
    const examDate = extractDateFromText(combo)
    const timeMatch = combo.match(/\b(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)
    const startTime = timeMatch ? normalizeTime(timeMatch[1]) : null

    const courseCodeMatch = combo.match(/\b([A-Z]{4}\d{4})\b/i)
    let subject = courseCodeMatch ? courseCodeMatch[1].toUpperCase() : ''
    if (!subject) {
      const subjMatch = userPrompt.match(/(?:for|exam\s*for|test\s*for)\s+([A-Za-z0-9\s]{2,25})/i)
      if (subjMatch) subject = subjMatch[1].trim()
    }
    if (!subject) {
      const addedMatch = content.match(/(?:added|scheduled)\s+(?:your\s+)?([A-Za-z0-9\s]+?)\s+(?:exam|test|on|at)/i)
      if (addedMatch) subject = addedMatch[1].trim()
    }

    if (subject && examDate && startTime) {
      actions.push({
        type: 'add_exam',
        data: {
          subject,
          exam_date: examDate,
          start_time: startTime,
          end_time: startTime,
          venue: 'TBA',
          exam_type: /quiz|小测/i.test(combo) ? 'Quiz' : /practical/i.test(combo) ? 'Practical Test' : 'Exam'
        }
      })
      return actions
    }
  }

  // 5. Assignment Intent
  const isAssignReq = /(add|record|new).*(assignment|homework|coursework|project|lab\s*report|作业)/i.test(userPrompt)
  const isAssignConfirmed = /(added|recorded|deadline|due|已添加|已记录)/i.test(content)
  if (isAssignReq && isAssignConfirmed) {
    const deadline = extractDateFromText(combo)
    const titleMatch = userPrompt.match(/(?:assignment|homework|coursework|project)\s*(?:named|called|title)?\s*([A-Za-z0-9\s]{2,30})/i)
    let title = titleMatch ? titleMatch[1].trim() : ''
    if (!title) {
      const addedMatch = content.match(/(?:added|recorded)\s+([A-Za-z0-9\s]+?)\s+(?:due|to|with)/i)
      if (addedMatch) title = addedMatch[1].trim()
    }
    if (deadline && title) {
      actions.push({
        type: 'add_assignment',
        data: {
          title,
          deadline,
          priority: 'Medium',
          status: 'Pending'
        }
      })
      return actions
    }
  }

  // 6. Diet / Food Intent
  const isDietReq = /(log|record|ate|eat|had|track).*(food|meal|apple|rice|chicken|bread|snack|calories|diet|吃|热量|饮食)/i.test(userPrompt)
  const isDietConfirmed = /(logged|recorded|added to your diet|kcal|calories|已记录|已添加)/i.test(content)
  if (isDietReq && isDietConfirmed) {
    const calMatch = combo.match(/(\d{2,4})\s*(?:kcal|calories|cal|大卡|卡路里)/i)
    const calories = calMatch ? parseInt(calMatch[1], 10) : 0
    let foodName = ''
    const foodMatch = userPrompt.match(/(?:ate|log|had|eat)\s+([a-zA-Z\s]{2,20})(?:\s+\d|\s+for|\s+with|$)/i)
    if (foodMatch) foodName = foodMatch[1].trim()
    if (!foodName) {
      const addedMatch = content.match(/(?:logged|added)\s+(?:a\s+|an\s+|\d+\s+)?([A-Za-z\s]+?)\s+(?:with|to|for|\()/i)
      if (addedMatch) foodName = addedMatch[1].trim()
    }

    if (foodName && calories > 0) {
      actions.push({
        type: 'log_diet',
        data: {
          name: foodName,
          calories,
          protein: 0,
          carbs: 0,
          fats: 0,
          meal_type: 'Snack',
          date: getTodayDateStr(),
          meal_time: getCurrentTimeStr()
        }
      })
      return actions
    }
  }

  return actions
}

/**
 * Extracts and parses all <axon_action> JSON blocks from AI response text.
 * Falls back to dynamic table parsing and conversational intent inference.
 */
export function parseAccountActions(content = '', userPrompt = '') {
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

  // 4. Fall back to parsing Markdown confirmation tables
  if (actions.length === 0) {
    const tableActions = parseTableFallback(cleanContent)
    if (tableActions.length > 0) {
      actions.push(...tableActions)
    }
  }

  // 5. Fall back to conversational intent inference
  if (actions.length === 0 && (userPrompt || cleanContent)) {
    const intentActions = parseConversationalIntent(cleanContent, userPrompt)
    if (intentActions.length > 0) {
      actions.push(...intentActions)
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

        const calories = Math.max(0, Math.round(parseNutrient(data.calories)))
        const protein = Math.max(0, Math.round(parseNutrient(data.protein) * 10) / 10)
        const carbs = Math.max(0, Math.round(parseNutrient(data.carbs) * 10) / 10)
        const fats = Math.max(0, Math.round(parseNutrient(data.fats) * 10) / 10)

        let date = (data.date || data.log_date || '').trim()
        if (!date || date.toLowerCase() === 'today' || date === '今天' || date === '2026-10-15') {
          date = getTodayDateStr()
        }

        let mealTime = (data.meal_time || '').trim()
        if (!mealTime || mealTime.toLowerCase() === 'now' || mealTime === '现在') {
          mealTime = getCurrentTimeStr()
        } else {
          mealTime = normalizeTime(mealTime, getCurrentTimeStr())
        }

        let mealType = data.meal_type || ''
        if (mealType) {
          const m = String(mealType).toLowerCase()
          if (m.includes('break') || m.includes('早') || m.includes('sarapan')) mealType = 'Breakfast'
          else if (m.includes('lunch') || m.includes('午') || m.includes('tengah')) mealType = 'Lunch'
          else if (m.includes('din') || m.includes('晚') || m.includes('malam')) mealType = 'Dinner'
          else if (m.includes('snack') || m.includes('零') || m.includes('加') || m.includes('snek')) mealType = 'Snack'
          else mealType = 'Snack'
        } else {
          mealType = getMealTypeFromTime(mealTime)
        }

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
  const userPrompt = contextMeta.userPrompt || ''
  const actions = parseAccountActions(content, userPrompt)
  if (!actions || actions.length === 0) return []

  const results = []
  for (const act of actions) {
    const res = await executeAccountAction(act, user, contextMeta)
    results.push(res)
  }
  return results
}
