import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
  XCircle
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeImageWithGroq } from '../lib/groq'
import { formatTime } from '../lib/utils'
import DateInput from './DateInput'
import TimePicker from './TimePicker'

const TIMETABLE_PROMPT = `
Analyze this university timetable image. Extract ALL class sessions and return ONLY a valid JSON array, no markdown, no explanation.

CRITICAL RULES:
1. Detect class_type from text labels inside each cell ONLY — look for: (L), (T), (P), Lec, Tut, Prac, Lecture, Tutorial, Practical
2. If the label says (L) or Lec or Lecture → class_type: "L"
3. If the label says (T) or Tut or Tutorial → class_type: "T"
4. If the label says (P) or Prac or Practical → class_type: "P"
5. If no label found → class_type: "L" (default to Lecture)
6. DO NOT use the cell background color to determine class type
7. Convert all times to 24-hour HH:MM format (e.g. "10:30 AM" → "10:30", "2:30 PM" → "14:30")
8. Day names must be exactly: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
9. For the "subject" field, if the full subject name is available (e.g., "SYSTEMS ANALYSIS AND DESIGN"), extract ONLY the full name without the subject code. If only the subject code is available, extract the code.
10. Scan the timetable grid exhaustively row by row and column by column (from Monday to Sunday). Do NOT skip, combine, or omit any class session. Even if a subject or room appears multiple times across different days or times, extract EVERY single instance as a separate JSON object in the array. Ensure 100% of the class sessions are captured.

Each object in the array must have exactly these fields:
{
  "subject": "Full subject name if available (without code), otherwise subject code",
  "day": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "lecturer": "lecturer name or empty string",
  "classroom": "room code or empty string",
  "class_type": "L|T|P"
}

Return ONLY the JSON array. No other text.`

const EXAM_PROMPT = `
Analyze this university exam timetable image. Extract ALL exams exhaustively and return as a JSON array only, no other text.
Do NOT skip or omit any items. Scan every row carefully. Ensure 100% of the entries shown are extracted.
Each object must have:
{
  "subject": "Full subject name if available (without code), otherwise subject code",
  "exam_date": "YYYY-MM-DD",
  "start_time": "HH:MM or empty string",
  "end_time": "HH:MM or empty string",
  "exam_type": "Test 1|Test 2|Midterm|Final|Practical",
  "venue": "string or empty string",
  "notes": "string or empty string"
}
Return ONLY valid JSON array. No markdown, no explanation.`

const ASSIGNMENT_PROMPT = `
Analyze this university assignment or coursework screenshot. Extract ALL assignments exhaustively and return as a JSON array only, no other text.
Do NOT skip or omit any items. Ensure 100% of the entries shown are extracted.
Each object must have: { "title": "string", "subject": "Full subject name if available (without code), otherwise subject code", "deadline": "YYYY-MM-DD", "priority": "High|Medium|Low", "notes": "string or empty string", "status": "Pending" }
Return ONLY valid JSON array. No markdown, no explanation.`

const RESULT_PROMPT = `
Analyze this university exam result slip, academic transcript, or student portal screenshot.
Extract ALL course results exhaustively and return ONLY a valid JSON array, no markdown, no explanation.
IMPORTANT: If the screenshot shows multiple semesters (e.g. "Year 1 Semester 1", "Year 1 Semester 2", "Semester 1 2023/2024", etc.), identify which semester each course belongs to and put it in "semester_name". If only one semester is shown or no semester name is visible, use the visible semester title or default to "Year 1 Semester 1".
Each object must have:
{
  "semester_name": "semester name e.g. Year 1 Semester 1",
  "course_code": "course code string or empty string",
  "course_name": "full course title string",
  "credit_hours": 3,
  "grade": "A+|A|A-|B+|B|B-|C+|C|F"
}
Ensure letter grades match TAR UMT standard grades (A+, A, A-, B+, B, B-, C+, C, F). Return ONLY valid JSON array.`

const statusMessages = {
  timetable: [
    'Scanning the timetable grid...',
    'Identifying subject codes...',
    'Extracting classroom details...',
    'Converting lecture times...',
    'Detecting class types (L/T/P)...'
  ],
  exam: [
    'Scanning the exam schedule...',
    'Reading subject names...',
    'Extracting exam dates...',
    'Detecting start & end times...',
    'Identifying exam venues...'
  ],
  assignment: [
    'Scanning for assignments...',
    'Reading task titles...',
    'Extracting deadlines...',
    'Detecting priority levels...',
    'Identifying subject names...'
  ],
  result: [
    'Scanning the result slip...',
    'Reading course codes...',
    'Extracting grades...',
    'Counting credit hours...',
    'Identifying semester info...'
  ]
}
const typeBorderClasses = {
  L: 'border-l-blue-500',
  T: 'border-l-emerald-500',
  P: 'border-l-purple-500',
  C: 'border-l-pink-500'
}

const typeBadgeClasses = {
  L: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  T: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  P: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  C: 'bg-pink-500/15 text-pink-400 border-pink-500/30'
}

export const SAMPLE_TIMETABLE_ITEMS = [
  { key: 'sample-1', subject: 'BMIS1043', day: 'Monday', start_time: '13:00', end_time: '14:00', classroom: 'B001K', lecturer: 'Tan Lai Kien', class_type: 'T', color: 'green', selected: true },
  { key: 'sample-2', subject: 'BMIS1043', day: 'Monday', start_time: '14:00', end_time: '15:00', classroom: 'B001K', lecturer: 'Tan Lai Kien', class_type: 'P', color: 'purple', selected: true },
  { key: 'sample-3', subject: 'BMMS1623', day: 'Tuesday', start_time: '11:00', end_time: '13:00', classroom: 'DK ABA', lecturer: 'Tan Li Yin', class_type: 'L', color: 'blue', selected: true },
  { key: 'sample-4', subject: 'BMCS1113', day: 'Wednesday', start_time: '09:00', end_time: '11:00', classroom: 'B102', lecturer: 'Lee Wei Ming', class_type: 'L', color: 'blue', selected: true },
  { key: 'sample-5', subject: 'BMCS1113', day: 'Wednesday', start_time: '11:00', end_time: '12:00', classroom: '', lecturer: 'Lee Wei Ming', class_type: 'T', color: 'green', selected: true },
  { key: 'sample-6', subject: 'BACS2042', day: 'Thursday', start_time: '14:00', end_time: '16:00', classroom: 'DK 1', lecturer: 'Dr. Wong', class_type: 'L', color: 'blue', selected: true },
  { key: 'sample-7', subject: 'BACS2042', day: 'Thursday', start_time: '16:00', end_time: '18:00', classroom: 'Lab 4', lecturer: 'Dr. Wong', class_type: 'P', color: 'purple', selected: true },
  { key: 'sample-8', subject: 'BJEL1023', day: 'Friday', start_time: '10:00', end_time: '12:00', classroom: '', lecturer: 'Ms. Sarah', class_type: 'L', color: 'blue', selected: true },
  { key: 'sample-9', subject: 'BJEL1023', day: 'Friday', start_time: '14:00', end_time: '16:00', classroom: 'B204', lecturer: 'Ms. Sarah', class_type: 'T', color: 'green', selected: true },
  { key: 'sample-10', subject: 'BHEL1012', day: 'Friday', start_time: '15:00', end_time: '17:00', classroom: 'DK 2', lecturer: 'En. Ahmad', class_type: 'C', color: 'pink', selected: true },
]

const CLASS_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHORT_DAYS = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' }

const CLASS_TYPE_CONFIG = {
  L: { label: 'Lecture', short: 'L', dot: 'bg-blue-400', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/25', blockBg: 'bg-blue-500/15 border-blue-500/40 text-blue-200' },
  T: { label: 'Tutorial', short: 'T', dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', blockBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' },
  P: { label: 'Practical', short: 'P', dot: 'bg-purple-400', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/25', blockBg: 'bg-purple-500/15 border-purple-500/40 text-purple-200' },
  C: { label: 'Class', short: 'C', dot: 'bg-pink-400', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/25', blockBg: 'bg-pink-500/15 border-pink-500/40 text-pink-200' },
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const parts = String(timeStr).trim().split(':')
  if (parts.length < 2) return 0
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
}

function formatTimeRange(start, end) {
  if (!start) return 'TBA'
  const s = formatTime(start)
  const e = end ? formatTime(end) : ''
  return e ? `${s} – ${e}` : s
}

export default function ImageUploadAnalyzer({ type, onResult, onStepChange }) {
  const inputRef = useRef(null)
  const [step, setStep] = useState('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [items, setItems] = useState([])
  const [messageIndex, setMessageIndex] = useState(0)
  const [error, setError] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const messages = statusMessages[type] || statusMessages.timetable

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  useEffect(() => {
    if (step !== 'analyzing') return undefined
    setMessageIndex(0)
    const id = setInterval(() => setMessageIndex(i => (i + 1) % messages.length), 2000)
    return () => clearInterval(id)
  }, [step, type, messages.length])

  // Support pasting screenshot from clipboard (Ctrl+V / Cmd+V)
  useEffect(() => {
    if (step !== 'upload') return
    const handlePaste = (e) => {
      const clipboardItems = e.clipboardData?.items
      if (!clipboardItems) return
      for (const item of clipboardItems) {
        if (item.type && item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (blob) {
            pickFile(blob)
            break
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [step])

  function pickFile(nextFile) {
    if (!nextFile) return
    setFile(nextFile)
    setPreview(URL.createObjectURL(nextFile))
    setItems([])
    setError('')
    setStep('ready')
  }

  async function analyze() {
    if (!file) return

    setStep('analyzing')
    setError(null)
    
    // Compress image before setting to avoid payload limits and timeouts
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 2560
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
        const base64 = dataUrl.split(',')[1]
        
        try {
          const prompt = type === 'exam' ? EXAM_PROMPT : type === 'assignment' ? ASSIGNMENT_PROMPT : type === 'result' ? RESULT_PROMPT : TIMETABLE_PROMPT
          const raw = await analyzeImageWithGroq(base64, 'image/jpeg', prompt)
          
          const parsed = parseAIResponse(raw)
          
          setItems(parsed.map((item, index) => normalizeItem(item, type, index)))
          setStep('results')
        } catch (err) {
          console.warn('Image analyzer error:', err)
          const raw = String(err?.message || '')
          if (raw.includes('AI_RATE_LIMIT_OR_BUSY') || raw.includes('Vision API error') || raw.includes('Gemini') || raw.includes('OpenRouter') || raw.includes('429')) {
            setError('AI rate limit reached or service temporarily busy. Please wait 3–5 minutes and try again.')
          } else {
            setError(err.message && !err.message.includes('API') && !err.message.includes('model') ? err.message : "AI couldn't read this image clearly")
          }
          setStep('error')
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  async function handleImport() {
    if (isImporting) return
    setIsImporting(true)
    try {
      await onResult(selected.map(item => cleanItem(item, type)))
    } catch (err) {
      console.error(err)
    } finally {
      setIsImporting(false)
    }
  }

  function updateItem(index, updates) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }

  function deleteItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function setAll(selected) {
    setItems(prev => prev.map(item => ({ ...item, selected })))
  }

  function startOver() {
    setStep('upload')
    setFile(null)
    setPreview('')
    setItems([])
    setError('')
  }

  const selected = items.filter(item => item.selected)
  const label = type === 'exam' ? 'EXAMS' : type === 'assignment' ? 'ASSIGNMENTS' : type === 'result' ? 'COURSE RESULTS' : 'CLASS SESSIONS'

  if (step === 'results' && type === 'timetable') {
    return (
      <TimetableResultsWorkspace
        items={items.length ? items : SAMPLE_TIMETABLE_ITEMS}
        preview={preview}
        updateItem={(index, updates) => {
          if (!items.length) {
            setItems(SAMPLE_TIMETABLE_ITEMS.map((item, i) => i === index ? { ...item, ...updates } : item))
          } else {
            updateItem(index, updates)
          }
        }}
        deleteItem={(index) => {
          if (!items.length) {
            setItems(SAMPLE_TIMETABLE_ITEMS.filter((_, i) => i !== index))
          } else {
            deleteItem(index)
          }
        }}
        setAll={(selected) => {
          if (!items.length) {
            setItems(SAMPLE_TIMETABLE_ITEMS.map(item => ({ ...item, selected })))
          } else {
            setAll(selected)
          }
        }}
        startOver={startOver}
        handleImport={async () => {
          const toImport = (items.length ? items : SAMPLE_TIMETABLE_ITEMS).filter(item => item.selected)
          if (isImporting) return
          setIsImporting(true)
          try {
            await onResult(toImport.map(item => cleanItem(item, type)))
          } catch (err) {
            console.error(err)
          } finally {
            setIsImporting(false)
          }
        }}
        isImporting={isImporting}
      />
    )
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full">
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pr-1">
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center w-full py-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
              onDrop={e => { e.preventDefault(); setIsDragging(false); pickFile(e.dataTransfer.files?.[0]) }}
              className={`group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed py-10 sm:py-12 px-6 sm:px-8 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/10 scale-[1.01]'
                  : 'border-theme-500/30 bg-theme-500/5 hover:border-theme-500/50 hover:bg-theme-500/10'
              }`}
            >
              <div className="mb-4 sm:mb-5 flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform duration-200">
                <Upload className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>

              <span className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">Upload screenshot</span>

              <span className="text-sm sm:text-base text-slate-400 max-w-[340px] leading-relaxed mb-6 sm:mb-7">
                Take a screenshot of your {type === 'exam' ? 'exam dates' : type === 'assignment' ? 'assignments list' : type === 'result' ? 'exam results slip' : 'timetable'} and upload it here
              </span>

              <span className="btn-import pointer-events-none px-7 py-3 text-sm sm:text-base font-semibold rounded-xl shadow-lg shadow-emerald-500/25">
                Browse Files
              </span>
            </button>
          </div>
        )}
        <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={e => pickFile(e.target.files?.[0])} />

        {step === 'ready' && (
          <div className="flex flex-col items-center justify-center w-full py-3 sm:py-4 text-center animate-[fadeIn_.2s_ease]">
            <div className="relative group max-w-sm w-full mb-4 rounded-2xl overflow-hidden border border-white/10 bg-black/30 shadow-2xl transition-transform duration-200">
              <img
                src={preview}
                alt={file?.name ? `Schedule preview: ${file.name}` : "Uploaded document preview"}
                className="mx-auto max-h-52 w-full object-contain rounded-2xl p-2"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                <span className="text-xs text-slate-300 truncate max-w-[200px]">{file?.name}</span>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-md backdrop-blur-sm transition-colors"
                >
                  Change
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mb-5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 max-w-xs truncate">
              <span className="truncate text-slate-200 font-medium">{file?.name}</span>
              <span className="text-slate-500">·</span>
              <span className="shrink-0">{Math.round((file?.size || 0) / 1024)} KB</span>
            </div>

            <div className="flex flex-col w-full max-w-xs gap-2.5 sm:flex-row sm:max-w-sm justify-center">
              <button
                type="button"
                className="btn-ghost !min-h-0 !py-2.5 text-sm flex-1"
                onClick={() => inputRef.current?.click()}
              >
                Change Image
              </button>
              <button
                type="button"
                className="btn-import !min-h-0 !py-2.5 text-sm flex-1"
                onClick={analyze}
              >
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span>Analyze with AI</span>
              </button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center w-full py-7 text-center space-y-4 animate-[fadeIn_.2s_ease]">
            <div className="relative">
              <div className="relative h-28 w-28 rounded-2xl overflow-hidden border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <img
                  src={preview}
                  alt="Schedule document being analyzed"
                  className="h-full w-full object-cover blur-[1px] opacity-50 scale-105"
                />
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-scan" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Loader2 className="h-9 w-9 animate-spin text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {type === 'exam' ? 'Reading Exam Schedule'
                  : type === 'assignment' ? 'Reading Assignments'
                  : type === 'result' ? 'Reading Result Slip'
                  : 'AI is Reading Your Image'}
              </h3>
              <p className="text-emerald-400 font-semibold text-xs sm:text-sm animate-pulse min-h-[20px]">
                {messages[messageIndex]}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                {type === 'exam'
                  ? 'Extracting exam dates, times, and venues directly from your screenshot.'
                  : type === 'assignment'
                  ? 'Extracting assignment titles, deadlines, and priorities.'
                  : type === 'result'
                  ? 'Extracting course codes, grades, and credit hours.'
                  : 'Extracting classes, time slots, classrooms, and lecturers.'}
              </p>
            </div>

            <div className="flex justify-center gap-1.5 pt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80 animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/80 animate-pulse [animation-delay:0.2s]" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/80 animate-pulse [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center w-full py-8 text-center animate-[fadeIn_.2s_ease]">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-3.5 shadow-lg shadow-red-500/5">
              <XCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">Analysis Failed</h3>
            <p className="text-red-400 text-xs sm:text-sm font-medium mb-2 max-w-xs leading-relaxed">{error}</p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-5">
              Make sure the image is clear and contains readable schedule information.
            </p>
            <div className="flex gap-2.5 w-full max-w-xs">
              <button type="button" className="btn-ghost flex-1 !min-h-0 !py-2.5 text-sm" onClick={startOver}>
                Upload Another
              </button>
              <button type="button" className="btn-import flex-1 !min-h-0 !py-2.5 text-sm" onClick={analyze}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="animate-[fadeIn_.2s_ease] space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-5 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 text-[11px] font-bold text-emerald-400">
                  {selected.length} of {items.length} selected
                </span>
                <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                  {label} DETECTED
                </span>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-theme-400 hover:text-theme-300 transition-colors"
                onClick={() => setAll(selected.length !== items.length)}
              >
                {selected.length === items.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
              {items.map((item, index) => type === 'timetable'
                ? <TimetableResult key={item.key} item={item} index={index} updateItem={updateItem} onDelete={() => deleteItem(index)} />
                : type === 'result'
                ? <ResultItemRow key={item.key} item={item} index={index} updateItem={updateItem} onDelete={() => deleteItem(index)} />
                : <SimpleResult key={item.key} item={item} index={index} updateItem={updateItem} onDelete={() => deleteItem(index)} type={type} />)}
            </div>
          </div>
        )}
      </div>

      {step === 'results' && (
        <div className="mt-3 flex shrink-0 items-center justify-between gap-3 border-t border-white/10 pt-3">
          <button
            type="button"
            className="btn-ghost !min-h-0 !py-2 !px-3.5 text-xs sm:text-sm font-medium hover:bg-white/5 transition-colors"
            onClick={startOver}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Start Over</span>
          </button>
          <button
            type="button"
            className="btn-import !min-h-0 !py-2.5 !px-5 text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selected.length === 0 || isImporting}
            onClick={handleImport}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 stroke-[2.5]" />
                <span>Import Selected ({selected.length})</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function TimetableResultsWorkspace({
  items,
  preview,
  updateItem,
  deleteItem,
  setAll,
  startOver,
  handleImport,
  isImporting
}) {
  const [hoveredKey, setHoveredKey] = useState(null)
  const [expandedKey, setExpandedKey] = useState(null)
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'conflicts' | 'review'
  const [showScreenshot, setShowScreenshot] = useState(false)
  const [mobileTab, setMobileTab] = useState('list') // 'list' | 'week'

  function handleUpdateByKey(key, updates) {
    const idx = items.findIndex(it => it.key === key)
    if (idx !== -1) updateItem(idx, updates)
  }

  function handleDeleteByKey(key) {
    const idx = items.findIndex(it => it.key === key)
    if (idx !== -1) deleteItem(idx)
  }

  // Conflict detection: overlapping times on same day
  const conflictData = useMemo(() => {
    const map = new Map()
    const pairs = new Set()

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]
        if (a.day && b.day && a.day.toLowerCase() === b.day.toLowerCase()) {
          const aStart = timeToMinutes(a.start_time)
          const aEnd = timeToMinutes(a.end_time)
          const bStart = timeToMinutes(b.start_time)
          const bEnd = timeToMinutes(b.end_time)
          if (aStart < bEnd && bStart < aEnd) {
            if (!map.has(a.key)) map.set(a.key, [])
            if (!map.has(b.key)) map.set(b.key, [])
            map.get(a.key).push({ key: b.key, subject: b.subject || 'Class', time: formatTimeRange(b.start_time, b.end_time) })
            map.get(b.key).push({ key: a.key, subject: a.subject || 'Class', time: formatTimeRange(a.start_time, a.end_time) })
            const pairKey = [a.key, b.key].sort().join('-')
            pairs.add(pairKey)
          }
        }
      }
    }
    return { map, pairCount: pairs.size }
  }, [items])

  // Review detection
  const reviewMap = useMemo(() => {
    const map = new Map()
    items.forEach(item => {
      const issues = []
      if (item.needsReview) {
        issues.push(typeof item.needsReview === 'string' ? item.needsReview : 'Low OCR confidence')
      }
      if (!item.classroom || !item.classroom.trim()) {
        issues.push('Missing room')
      }
      if (!item.subject || item.subject.trim().length < 3) {
        issues.push('Uncertain subject name')
      }
      if (!item.start_time || !item.end_time) {
        issues.push('Missing class time')
      } else if (timeToMinutes(item.end_time) <= timeToMinutes(item.start_time)) {
        issues.push('Invalid time range')
      }
      if (issues.length > 0) {
        map.set(item.key, issues)
      }
    })
    return map
  }, [items])

  // Filtering
  const filteredItems = useMemo(() => {
    if (filterMode === 'conflicts') {
      return items.filter(it => conflictData.map.has(it.key))
    }
    if (filterMode === 'review') {
      return items.filter(it => reviewMap.has(it.key))
    }
    return items
  }, [items, filterMode, conflictData, reviewMap])

  // Grouping by day
  const groupedByDay = useMemo(() => {
    const groups = {}
    CLASS_DAYS.forEach(d => { groups[d] = [] })
    filteredItems.forEach(item => {
      const d = item.day || 'Monday'
      if (!groups[d]) groups[d] = []
      groups[d].push(item)
    })
    Object.keys(groups).forEach(d => {
      groups[d].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
    })
    return CLASS_DAYS.filter(d => groups[d]?.length > 0).map(d => ({
      day: d,
      items: groups[d]
    }))
  }, [filteredItems])

  const selectedCount = items.filter(it => it.selected).length

  function handleSelectBlock(key) {
    setExpandedKey(key)
    setMobileTab('list')
    setTimeout(() => {
      document.getElementById(`session-row-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-full overflow-x-hidden">
      {/* 4. SMART REVIEW & HEADER STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10 shrink-0 w-full min-w-0">
        {/* Clickable Summary Strip */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`!min-h-0 !min-w-0 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
              filterMode === 'all'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{items.length} sessions detected</span>
          </button>
          <span className="text-white/20 select-none">·</span>
          <button
            type="button"
            onClick={() => setFilterMode(filterMode === 'conflicts' ? 'all' : 'conflicts')}
            className={`!min-h-0 !min-w-0 px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterMode === 'conflicts'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : conflictData.pairCount > 0
                ? 'text-amber-400/90 hover:bg-amber-500/10 hover:text-amber-300'
                : 'text-slate-500'
            }`}
            title={conflictData.pairCount > 0 ? 'Filter to conflicting sessions' : 'No conflicts detected'}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>{conflictData.pairCount} {conflictData.pairCount === 1 ? 'conflict' : 'conflicts'}</span>
          </button>
          <span className="text-white/20 select-none">·</span>
          <button
            type="button"
            onClick={() => setFilterMode(filterMode === 'review' ? 'all' : 'review')}
            className={`!min-h-0 !min-w-0 px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterMode === 'review'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : reviewMap.size > 0
                ? 'text-sky-400/90 hover:bg-sky-500/10 hover:text-sky-300'
                : 'text-slate-500'
            }`}
            title={reviewMap.size > 0 ? 'Filter to items needing review' : 'All fields verified'}
          >
            <AlertCircle className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span>{reviewMap.size} need review</span>
          </button>
        </div>

        {/* Right Controls: Screenshot Toggle & Selection Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {preview && (
            <button
              type="button"
              onClick={() => setShowScreenshot(!showScreenshot)}
              className={`!min-h-0 !min-w-0 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                showScreenshot
                  ? 'bg-white/15 text-white border-white/20 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-white/[0.03] border-white/10 hover:bg-white/5'
              }`}
              title="Toggle source screenshot"
            >
              <ImageIcon className="h-3.5 w-3.5 text-slate-300" />
              <span className="hidden sm:inline">{showScreenshot ? 'Hide Source' : 'View Source'}</span>
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-5 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 text-[10px] sm:text-[11px] font-bold text-emerald-400 shrink-0">
              {selectedCount} of {items.length} selected
            </span>
            <button
              type="button"
              onClick={() => setAll(selectedCount !== items.length)}
              className="!min-h-0 !min-w-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
            >
              {selectedCount === items.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Source Screenshot Drawer */}
      {showScreenshot && preview && (
        <div className="my-2 rounded-xl border border-white/10 bg-black/40 p-2.5 shrink-0 animate-[fadeIn_.15s_ease] motion-reduce:animate-none w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-white/5 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-slate-400" /> Original Screenshot
            </span>
            <button
              type="button"
              onClick={() => setShowScreenshot(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/60 flex items-center justify-center p-1">
            <img
              src={preview}
              alt="Original timetable upload"
              className="max-h-44 object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* Active Filter Pill if filter is on */}
      {filterMode !== 'all' && (
        <div className="my-2 flex items-center justify-between bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-lg text-xs text-slate-300 shrink-0 w-full min-w-0">
          <span className="truncate min-w-0">
            Filtering by <strong className="text-white capitalize">{filterMode === 'conflicts' ? 'Time Conflicts' : 'Needs Review'}</strong> ({filteredItems.length} matching)
          </span>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold shrink-0 ml-2"
          >
            Show all
          </button>
        </div>
      )}

      {/* MOBILE SEGMENTED TOGGLE (< 900px / lg) */}
      <div className="flex lg:hidden p-1 bg-black/40 border border-white/10 rounded-xl my-2 shrink-0 w-full min-w-0">
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`!min-h-0 !min-w-0 flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
            mobileTab === 'list'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Session List ({filteredItems.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('week')}
          className={`!min-h-0 !min-w-0 flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 truncate ${
            mobileTab === 'week'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Week Preview</span>
        </button>
      </div>

      {/* TWO-PANE LAYOUT */}
      <div className="flex flex-1 min-h-0 pt-2 gap-4 overflow-hidden w-full max-w-full">
        {/* LEFT PANE: Day-grouped Session List (~60% desktop, full mobile when list tab) */}
        <div
          className={`w-full max-w-full min-w-0 lg:w-[58%] xl:w-[60%] flex-col min-h-0 overflow-hidden ${
            mobileTab === 'list' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden scrollbar-hide rounded-xl border border-white/5 bg-slate-900/30">
            {groupedByDay.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <p className="text-sm">No sessions match the selected filter.</p>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              groupedByDay.map(({ day, items: dayItems }) => (
                <div key={day} className="relative w-full min-w-0">
                  {/* Sticky Day Header */}
                  <div className="sticky top-0 z-10 flex items-center justify-between w-full min-w-0 bg-[#0b121e]/95 backdrop-blur-md px-3 py-1.5 border-b border-white/10 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{day}</span>
                    </span>
                    <span className="text-[11px] font-normal text-slate-400 lowercase shrink-0">
                      {dayItems.length} {dayItems.length === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>

                  {/* Sessions in day */}
                  <div className="divide-y divide-white/5 w-full min-w-0">
                    {dayItems.map(item => (
                      <TimetableSessionRow
                        key={item.key}
                        item={item}
                        isExpanded={expandedKey === item.key}
                        onToggleExpand={() => setExpandedKey(expandedKey === item.key ? null : item.key)}
                        onUpdate={(updates) => handleUpdateByKey(item.key, updates)}
                        onDelete={() => handleDeleteByKey(item.key)}
                        onToggleSelect={() => handleUpdateByKey(item.key, { selected: !item.selected })}
                        isHovered={hoveredKey === item.key}
                        setHoveredKey={setHoveredKey}
                        conflicts={conflictData.map.get(item.key) || []}
                        reviewIssues={reviewMap.get(item.key) || []}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE: Live Weekly Timetable Preview (~40% desktop, full mobile when week tab) */}
        <div
          className={`w-full max-w-full min-w-0 lg:w-[42%] xl:w-[40%] flex-col min-h-0 pl-0 lg:pl-1 overflow-hidden ${
            mobileTab === 'week' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <LiveTimetablePreview
            items={items}
            hoveredKey={hoveredKey}
            setHoveredKey={setHoveredKey}
            onSelectBlock={handleSelectBlock}
            conflictMap={conflictData.map}
          />
        </div>
      </div>

      {/* 5. STICKY FOOTER */}
      <div className="mt-3 flex shrink-0 items-center justify-between gap-2.5 sm:gap-3 border-t border-white/10 pt-3 w-full min-w-0">
        <button
          type="button"
          className="btn-ghost !min-h-0 !min-w-0 !py-2 !px-3 sm:!px-3.5 text-xs sm:text-sm font-medium hover:bg-white/5 transition-colors shrink-0"
          onClick={startOver}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Start Over</span>
        </button>

        <button
          type="button"
          className="btn-import !min-h-0 !min-w-0 !py-2.5 !px-3.5 sm:!px-5 text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          disabled={selectedCount === 0 || isImporting}
          onClick={handleImport}
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Importing...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>Import {selectedCount} {selectedCount === 1 ? 'session' : 'sessions'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function TimetableSessionRow({
  item,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onToggleSelect,
  isHovered,
  setHoveredKey,
  conflicts = [],
  reviewIssues = []
}) {
  const typeConfig = CLASS_TYPE_CONFIG[item.class_type] || CLASS_TYPE_CONFIG.L
  const hasConflict = conflicts.length > 0
  const needsReview = reviewIssues.length > 0
  const className = (item.subject || item.course_code || item.course_name || item.course || item.subject_code || item.class_name || item.title || item.name || '').trim() || 'Class'

  return (
    <div
      id={`session-row-${item.key}`}
      role="checkbox"
      aria-checked={item.selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === ' ') {
          e.preventDefault()
          onToggleSelect()
        } else if (e.key === 'Enter') {
          e.preventDefault()
          onToggleExpand()
        }
      }}
      onMouseEnter={() => setHoveredKey?.(item.key)}
      onMouseLeave={() => setHoveredKey?.(null)}
      className={`group relative transition-colors duration-150 border-b border-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 motion-reduce:transition-none w-full max-w-full min-w-0 overflow-hidden ${
        isHovered
          ? 'bg-white/[0.05]'
          : 'hover:bg-white/[0.02]'
      } ${
        !item.selected
          ? 'opacity-40 hover:opacity-75'
          : ''
      } ${
        isExpanded ? 'bg-white/[0.03]' : ''
      }`}
    >
      {/* Read-only row: single unified line on desktop, 2 lines on mobile */}
      <div
        onClick={onToggleExpand}
        className="py-2 px-2.5 sm:py-2.5 sm:px-3 cursor-pointer select-none w-full max-w-full min-w-0 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5 min-w-0 w-full">
          {/* Top Line on Mobile / Left Group on Desktop: Checkbox + Dot + Class Name + Type Badge */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 sm:max-w-[340px] md:max-w-[400px] lg:max-w-[460px] xl:max-w-[540px] 2xl:max-w-[620px] w-full sm:w-auto">
            {/* Rounded Checkbox */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect()
              }}
              className={`!min-h-0 !min-w-0 !h-5 !w-5 h-5 w-5 shrink-0 flex items-center justify-center rounded-md transition-all motion-reduce:transition-none ${
                item.selected
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                  : 'border border-slate-600 bg-slate-800/80 text-transparent hover:border-slate-400'
              }`}
              title={item.selected ? 'Deselect session' : 'Select session'}
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </button>

            {/* Class Type Dot */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${typeConfig.dot}`}
              title={`${typeConfig.label} (${typeConfig.short})`}
            />

            {/* Class Name (Course Code / Subject Title) */}
            <span
              className="font-bold text-white text-sm tracking-wide truncate min-w-0 flex-1 sm:flex-initial"
              title={className}
            >
              {className}
            </span>

            {/* Plain text type badge (L / T / P / C) */}
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${typeConfig.badge}`}
            >
              {typeConfig.short}
            </span>

            {/* Mobile Actions on line 1 */}
            <div className="sm:hidden ml-auto flex items-center gap-1 shrink-0">
              {hasConflict && (
                <div
                  className="shrink-0 flex items-center text-amber-400"
                  title={`Conflict: ${conflicts.map(c => `${c.subject} (${c.time})`).join(', ')}`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
              )}
              {needsReview && (
                <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Review
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleExpand()
                }}
                className="!min-h-0 !min-w-0 h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-white"
                title="Edit session"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Bottom Line on Mobile / Middle & Right on Desktop: Time · Room · Lecturer */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 pl-7 sm:pl-0 flex-1 min-w-0 w-full sm:w-auto text-[11px] sm:text-xs text-slate-400 overflow-hidden">
            {/* Time range */}
            <span className="inline-flex items-center gap-1 font-mono text-slate-300 shrink-0 text-[11px] sm:text-xs">
              <Clock className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>{formatTimeRange(item.start_time, item.end_time)}</span>
            </span>

            <span className="text-white/20 select-none shrink-0">·</span>

            {/* Room */}
            <span className="inline-flex items-center gap-1 shrink-0 max-w-[85px] sm:max-w-[110px] truncate text-[11px] sm:text-xs">
              <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
              <span className={item.classroom?.trim() ? 'text-slate-300 font-medium truncate' : 'text-amber-400/80 italic truncate'}>
                {item.classroom?.trim() || 'Room TBA'}
              </span>
            </span>

            {item.lecturer?.trim() && (
              <>
                <span className="text-white/20 select-none shrink-0">·</span>
                {/* Lecturer - min-w-0 so it gracefully truncates instead of stretching the row */}
                <span className="inline-flex items-center gap-1 flex-1 min-w-0 max-w-[180px] truncate text-[11px] sm:text-xs">
                  <User className="h-3 w-3 text-slate-500 shrink-0" />
                  <span className="text-slate-300 truncate" title={item.lecturer}>
                    {item.lecturer}
                  </span>
                </span>
              </>
            )}

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-1 ml-auto shrink-0">
              {hasConflict && (
                <div
                  className="shrink-0 flex items-center text-amber-400 cursor-help"
                  title={`Conflict with: ${conflicts.map(c => `${c.subject} (${c.time})`).join(', ')}`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
              )}
              {needsReview && (
                <span
                  className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 cursor-help"
                  title={reviewIssues.join(' • ')}
                >
                  Review
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleExpand()
                }}
                className="!min-h-0 !min-w-0 h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Edit session"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="!min-h-0 !min-w-0 h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-70 group-hover:opacity-100"
                title="Delete session"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Expanded Editor */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="px-3 pb-3 pt-1 border-t border-white/5 space-y-3 bg-black/25 animate-[fadeIn_.15s_ease] motion-reduce:animate-none w-full max-w-full min-w-0 overflow-hidden"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full min-w-0">
            {/* Subject Input */}
            <div className="min-w-0">
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Course Code / Subject</label>
              <input
                type="text"
                value={item.subject || ''}
                onChange={(e) => onUpdate({ subject: e.target.value })}
                className="w-full max-w-full box-border bg-slate-900/90 border border-white/15 focus:border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                placeholder="e.g. BMIS1043"
              />
            </div>

            {/* Class Type Pills */}
            <div className="min-w-0">
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Class Type</label>
              <div className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full min-w-0">
                {['L', 'T', 'P', 'C'].map(ct => {
                  const isSelected = (item.class_type || 'L') === ct
                  const conf = CLASS_TYPE_CONFIG[ct]
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => onUpdate({ class_type: ct, color: getColorFromType(ct) })}
                      className={`!min-h-0 !min-w-0 py-1.5 px-1 text-xs font-semibold rounded-lg border transition-all truncate text-center ${
                        isSelected
                          ? `${conf.badge} border-white/30 shadow-sm`
                          : 'bg-white/[0.03] text-slate-400 border-white/10 hover:bg-white/5'
                      }`}
                      title={`${conf.short} - ${conf.label}`}
                    >
                      <span>{conf.short}</span>
                      <span className="hidden sm:inline text-[10px] font-normal ml-0.5">({conf.label.slice(0, 3)})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Day and Times */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full min-w-0">
              <div className="min-w-0">
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Day of Week</label>
                <select
                  value={item.day || 'Monday'}
                  onChange={(e) => onUpdate({ day: e.target.value })}
                  className="w-full max-w-full box-border bg-slate-900/90 border border-white/15 focus:border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  {CLASS_DAYS.map(d => (
                    <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Start Time</label>
                <TimePicker
                  value={item.start_time || '09:00'}
                  onChange={(val) => onUpdate({ start_time: val })}
                  title="Start Time"
                />
              </div>

              <div className="min-w-0">
                <label className="text-[11px] font-medium text-slate-400 block mb-1">End Time</label>
                <TimePicker
                  value={item.end_time || '10:00'}
                  onChange={(val) => onUpdate({ end_time: val })}
                  title="End Time"
                />
              </div>
            </div>

            {/* Room and Lecturer */}
            <div className="min-w-0">
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Classroom / Room {(!item.classroom || !item.classroom.trim()) && <span className="text-amber-400">(Needs Room)</span>}
              </label>
              <input
                type="text"
                value={item.classroom || ''}
                onChange={(e) => onUpdate({ classroom: e.target.value })}
                className={`w-full max-w-full box-border bg-slate-900/90 border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
                  !item.classroom?.trim()
                    ? 'border-amber-500/50 focus:border-amber-400 focus:ring-amber-500/30'
                    : 'border-white/15 focus:border-emerald-500/50 focus:ring-emerald-500/40'
                }`}
                placeholder="e.g. B001K, DK 1, Lab 4"
              />
            </div>

            <div className="min-w-0">
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Lecturer (Optional)</label>
              <input
                type="text"
                value={item.lecturer || ''}
                onChange={(e) => onUpdate({ lecturer: e.target.value })}
                className="w-full max-w-full box-border bg-slate-900/90 border border-white/15 focus:border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                placeholder="e.g. Dr. Wong"
              />
            </div>
          </div>

          {/* Expanded Bottom Row */}
          <div className="flex items-center justify-between pt-1 w-full min-w-0">
            <button
              type="button"
              onClick={onDelete}
              className="!min-h-0 !min-w-0 text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 py-1 px-2 rounded hover:bg-red-500/10 transition-colors shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete session</span>
            </button>

            <button
              type="button"
              onClick={onToggleExpand}
              className="!min-h-0 !min-w-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300 py-1 px-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 shrink-0"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LiveTimetablePreview({
  items,
  hoveredKey,
  setHoveredKey,
  onSelectBlock,
  conflictMap
}) {
  const displayedDays = useMemo(() => {
    const active = CLASS_DAYS.filter(d => items.some(it => it.day?.toLowerCase() === d.toLowerCase()))
    return active.length > 0 ? active : CLASS_DAYS.slice(0, 5)
  }, [items])

  const { startHour, endHour, totalHours } = useMemo(() => {
    let minH = 8
    let maxH = 18
    items.forEach(it => {
      if (it.start_time) {
        const h = Math.floor(timeToMinutes(it.start_time) / 60)
        if (h > 0 && h < minH) minH = Math.max(6, h)
      }
      if (it.end_time) {
        const h = Math.ceil(timeToMinutes(it.end_time) / 60)
        if (h > maxH) maxH = Math.min(23, h)
      }
    })
    return { startHour: minH, endHour: maxH, totalHours: Math.max(1, maxH - minH) }
  }, [items])

  const hoursList = useMemo(() => {
    const list = []
    for (let h = startHour; h <= endHour; h++) {
      list.push(h)
    }
    return list
  }, [startHour, endHour])

  function formatHour(h) {
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hr = h % 12 === 0 ? 12 : h % 12
    return `${hr} ${ampm}`
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-white/5 shrink-0">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-emerald-400" />
          <span>Weekly Timetable Preview</span>
        </span>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Live sync with edits
        </span>
      </div>

      {/* Grid container with scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-hide p-2 relative">
        <div className="min-w-[420px] sm:min-w-[440px] w-full flex flex-col h-full">
          {/* Day Column Headers */}
          <div
            className="grid grid-cols-[46px_repeat(var(--day-count),1fr)] sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md pb-1 border-b border-white/10"
            style={{ '--day-count': displayedDays.length }}
          >
            <div className="text-[10px] font-mono text-slate-500 text-center py-1">Time</div>
            {displayedDays.map(day => (
              <div key={day} className="text-center py-1">
                <span className="text-xs font-bold text-slate-200">
                  {SHORT_DAYS[day] || day.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>

          {/* Timetable Hour Grid */}
          <div className="relative flex-1 mt-1" style={{ minHeight: `${totalHours * 48}px` }}>
            {/* Horizontal Hour Lines & Labels */}
            {hoursList.map((h, i) => {
              const topPercent = (i / totalHours) * 100
              return (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-white/5 flex items-start"
                  style={{ top: `${topPercent}%` }}
                >
                  <span className="w-[46px] text-[10px] font-mono text-slate-500 -mt-2 text-right pr-2 select-none shrink-0">
                    {formatHour(h)}
                  </span>
                  <div className="flex-1 h-0 border-t border-white/[0.04]" />
                </div>
              )
            })}

            {/* Vertical Day Column Lines */}
            <div
              className="absolute inset-y-0 left-[46px] right-0 grid grid-cols-[repeat(var(--day-count),1fr)] pointer-events-none"
              style={{ '--day-count': displayedDays.length }}
            >
              {displayedDays.map((day, idx) => (
                <div
                  key={day}
                  className={`h-full border-r border-white/[0.04] ${idx === 0 ? 'border-l border-white/[0.04]' : ''}`}
                />
              ))}
            </div>

            {/* Session Blocks */}
            <div
              className="absolute inset-y-0 left-[46px] right-0 grid grid-cols-[repeat(var(--day-count),1fr)]"
              style={{ '--day-count': displayedDays.length }}
            >
              {displayedDays.map(day => {
                const daySessions = items.filter(it => it.day?.toLowerCase() === day.toLowerCase())
                return (
                  <div key={day} className="relative h-full px-0.5">
                    {daySessions.map(item => {
                      const sMins = timeToMinutes(item.start_time)
                      const eMins = timeToMinutes(item.end_time)
                      const baseMins = startHour * 60
                      const totalMins = totalHours * 60

                      const topPct = Math.max(0, Math.min(100, ((sMins - baseMins) / totalMins) * 100))
                      const heightPct = Math.max(4, Math.min(100 - topPct, ((eMins - sMins) / totalMins) * 100))

                      const typeConfig = CLASS_TYPE_CONFIG[item.class_type] || CLASS_TYPE_CONFIG.L
                      const isHovered = hoveredKey === item.key
                      const hasConflict = conflictMap.has(item.key)
                      const durationMins = Math.max(0, eMins - sMins)
                      const isSpacious = durationMins >= 90

                      return (
                        <div
                          key={item.key}
                          onClick={() => onSelectBlock(item.key)}
                          onMouseEnter={() => setHoveredKey(item.key)}
                          onMouseLeave={() => setHoveredKey(null)}
                          style={{
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                          }}
                          className={`absolute inset-x-0.5 rounded-lg border p-1 sm:p-1.5 flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-150 motion-reduce:transition-none ${
                            typeConfig.blockBg
                          } ${
                            !item.selected
                              ? 'opacity-25 border-dashed border-white/20 bg-slate-900/50'
                              : ''
                          } ${
                            hasConflict
                              ? 'border-amber-400/90 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                              : ''
                          } ${
                            isHovered
                              ? 'ring-2 ring-emerald-400 z-30 scale-[1.02] shadow-lg shadow-emerald-500/20 brightness-125'
                              : 'z-10'
                          }`}
                          title={`${item.subject} (${item.class_type}) • ${formatTimeRange(item.start_time, item.end_time)}${item.classroom ? ` • ${item.classroom}` : ''}`}
                        >
                          <div className="flex items-start justify-between gap-1 leading-tight min-w-0">
                            <span
                              className={`text-[10px] font-bold text-white min-w-0 ${
                                isSpacious ? 'line-clamp-2 break-words' : 'truncate'
                              }`}
                              title={item.subject || 'Class'}
                            >
                              {item.subject || 'Class'}
                            </span>
                            <span className={`text-[9px] font-bold px-1 rounded uppercase shrink-0 ${typeConfig.badge}`}>
                              {typeConfig.short}
                            </span>
                          </div>

                          <div className="text-[9px] font-mono text-slate-300 truncate">
                            {formatTimeRange(item.start_time, item.end_time)}
                          </div>

                          {item.classroom && (
                            <div className="text-[9px] text-slate-400 truncate">
                              {item.classroom}
                            </div>
                          )}

                          {hasConflict && (
                            <div className="absolute bottom-0.5 right-0.5 bg-amber-500 text-slate-950 rounded-full p-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SimpleResult({ item, index, updateItem, onDelete, type }) {
  const borderClass = type === 'exam' ? 'border-l-purple-500' : 'border-l-blue-500'
  return (
    <div
      className={`group relative rounded-xl border border-l-4 transition-all duration-150 ${borderClass} ${
        item.selected
          ? 'border-white/10 bg-[#151f30] hover:bg-[#19253a] shadow-sm'
          : 'border-white/5 bg-slate-900/30 opacity-40 hover:opacity-60'
      }`}
    >
      <div className="p-2.5 sm:px-3 sm:py-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateItem(index, { selected: !item.selected })}
            className={`h-5 w-5 shrink-0 flex items-center justify-center rounded-md transition-all ${
              item.selected
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : 'border border-slate-600 bg-slate-800/80 text-transparent hover:border-slate-400'
            }`}
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </button>

          <div className="flex-1 min-w-0">
            <input
              className="w-full bg-transparent hover:bg-white/5 focus:bg-slate-900/90 border border-transparent focus:border-white/20 rounded-lg px-2 py-0.5 text-[14px] font-bold text-white tracking-wide placeholder-slate-500 transition-colors focus:outline-none"
              value={type === 'exam' ? (item.subject || '') : (item.title || '')}
              onChange={e => updateItem(index, type === 'exam' ? { subject: e.target.value } : { title: e.target.value })}
              placeholder={type === 'exam' ? 'e.g. MATH 201 Advanced Calculus' : 'e.g. Lab Report 1'}
            />
          </div>

          {type === 'exam' ? (
            <select
              value={item.exam_type || 'Final'}
              onChange={e => updateItem(index, { exam_type: e.target.value })}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md border border-purple-500/30 bg-purple-500/15 text-purple-400 cursor-pointer focus:outline-none"
            >
              {['Test 1', 'Test 2', 'Midterm', 'Final', 'Practical'].map(et => (
                <option key={et} value={et} className="bg-slate-900 text-white">{et}</option>
              ))}
            </select>
          ) : (
            <select
              value={item.priority || 'Medium'}
              onChange={e => updateItem(index, { priority: e.target.value })}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border cursor-pointer focus:outline-none ${
                item.priority === 'High'
                  ? 'border-red-500/30 bg-red-500/15 text-red-400'
                  : item.priority === 'Low'
                  ? 'border-slate-500/30 bg-slate-500/15 text-slate-400'
                  : 'border-amber-500/30 bg-amber-500/15 text-amber-400'
              }`}
            >
              {['High', 'Medium', 'Low'].map(p => (
                <option key={p} value={p} className="bg-slate-900 text-white">{p}</option>
              ))}
            </select>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-7 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <DateInput
              className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none w-28"
              value={type === 'exam' ? (item.exam_date || '') : (item.deadline || '')}
              onChange={e => updateItem(index, type === 'exam' ? { exam_date: e.target.value } : { deadline: e.target.value })}
            />
          </div>

          {type === 'exam' && (
            <>
              <span className="text-white/15 hidden sm:inline">·</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="time"
                  className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none w-[66px] text-center"
                  value={item.start_time || ''}
                  onChange={e => updateItem(index, { start_time: e.target.value })}
                  placeholder="Start"
                />
                <span className="text-slate-600">-</span>
                <input
                  type="time"
                  className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none w-[66px] text-center"
                  value={item.end_time || ''}
                  onChange={e => updateItem(index, { end_time: e.target.value })}
                  placeholder="End"
                />
              </div>

              <span className="text-white/15 hidden sm:inline">·</span>
              <div className="flex items-center gap-1 flex-1 min-w-[100px]">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none placeholder-slate-600 w-full truncate"
                  value={item.venue || ''}
                  onChange={e => updateItem(index, { venue: e.target.value })}
                  placeholder="Venue (e.g. Hall A)"
                />
              </div>
            </>
          )}

          {type === 'assignment' && (
            <>
              <span className="text-white/15 hidden sm:inline">·</span>
              <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                <span className="text-slate-500">Subject:</span>
                <input
                  className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none placeholder-slate-600 w-full truncate"
                  value={item.subject || ''}
                  onChange={e => updateItem(index, { subject: e.target.value })}
                  placeholder="Subject code/name"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultItemRow({ item, index, updateItem, onDelete }) {
  const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'F']
  return (
    <div
      className={`group relative rounded-xl border border-l-4 border-l-emerald-500 transition-all duration-150 ${
        item.selected
          ? 'border-white/10 bg-[#151f30] hover:bg-[#19253a] shadow-sm'
          : 'border-white/5 bg-slate-900/30 opacity-40 hover:opacity-60'
      }`}
    >
      <div className="p-2.5 sm:px-3 sm:py-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => updateItem(index, { selected: !item.selected })}
          className={`h-5 w-5 shrink-0 flex items-center justify-center rounded-md transition-all ${
            item.selected
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : 'border border-slate-600 bg-slate-800/80 text-transparent hover:border-slate-400'
          }`}
        >
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </button>

        <div className="w-24 sm:w-28 shrink-0">
          <input
            className="w-full bg-transparent hover:bg-white/5 focus:bg-slate-900/90 border border-transparent focus:border-white/20 rounded-lg px-2 py-0.5 text-xs sm:text-sm font-bold text-white tracking-wide uppercase placeholder-slate-500 transition-colors focus:outline-none"
            value={item.course_code || ''}
            onChange={e => updateItem(index, { course_code: e.target.value.toUpperCase() })}
            placeholder="Code"
          />
        </div>

        <div className="flex-1 min-w-0">
          <input
            className="w-full bg-transparent hover:bg-white/5 focus:bg-slate-900/90 border border-transparent focus:border-white/20 rounded-lg px-2 py-0.5 text-xs sm:text-sm font-semibold text-slate-200 placeholder-slate-500 transition-colors focus:outline-none truncate"
            value={item.course_name || ''}
            onChange={e => updateItem(index, { course_name: e.target.value })}
            placeholder="Course Name"
          />
        </div>

        <div className="w-16 shrink-0">
          <select
            className="w-full bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2 py-0.5 text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer text-center"
            value={item.grade || 'A'}
            onChange={e => updateItem(index, { grade: e.target.value })}
          >
            {grades.map(g => <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>)}
          </select>
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function getColorFromType(classType) { return classType === 'T' ? 'green' : classType === 'P' ? 'purple' : classType === 'C' ? 'pink' : 'blue' }
function normalizeItem(item, type, index) {
  const class_type = ['L', 'T', 'P', 'C'].includes(item.class_type || item.classType || item.type)
    ? (item.class_type || item.classType || item.type)
    : 'L'
  const subject = (item.subject || item.course_code || item.course_name || item.course || item.subject_code || item.class_name || item.title || item.name || '').trim() || 'Class'
  const classroom = (item.classroom || item.room || item.venue || item.location || '').trim()
  const lecturer = (item.lecturer || item.teacher || item.instructor || item.lecturer_name || item.lecturerName || '').trim()
  const start_time = item.start_time || item.startTime || ''
  const end_time = item.end_time || item.endTime || ''
  const day = item.day || item.day_of_week || item.dayOfWeek || 'Monday'

  const base = {
    ...item,
    subject,
    classroom,
    lecturer,
    start_time,
    end_time,
    day,
    key: `${index}-${subject || item.title || item.course_name || index}`,
    selected: true,
  }
  if (type === 'timetable') {
    return {
      ...base,
      class_type,
      color: getColorFromType(class_type)
    }
  }
  if (type === 'result') {
    return {
      ...base,
      credit_hours: Number(item.credit_hours) || 3,
      grade: item.grade || 'A'
    }
  }
  return {
    ...base,
    class_type,
    color: getColorFromType(class_type),
    credit_hours: Number(item.credit_hours) || 3,
    grade: item.grade || 'A'
  }
}
function cleanItem({ key, selected, class_type, color, ...item }, type) {
  if (type === 'timetable') {
    const resolvedType = class_type || item.classType || 'L'
    return {
      subject: (item.subject || item.course_code || item.course_name || item.course || item.subject_code || item.class_name || item.title || '').trim() || 'Class',
      day: item.day || item.day_of_week || 'Monday',
      start_time: item.start_time || item.startTime || '09:00',
      end_time: item.end_time || item.endTime || '10:00',
      lecturer: (item.lecturer || item.teacher || item.instructor || item.lecturer_name || '').trim(),
      classroom: (item.classroom || item.room || item.venue || item.location || '').trim(),
      class_type: resolvedType,
      color: color || getColorFromType(resolvedType)
    }
  }
  if (type === 'exam') {
    const validExamTypes = ['Test 1', 'Test 2', 'Midterm', 'Final', 'Practical']
    return {
      subject: item.subject || '',
      exam_date: item.exam_date || '',
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      exam_type: validExamTypes.includes(item.exam_type) ? item.exam_type : 'Final',
      venue: item.venue || '',
      notes: item.notes || ''
    }
  }
  if (type === 'assignment') {
    return {
      title: item.title || '',
      subject: item.subject || '',
      deadline: item.deadline || '',
      priority: ['High', 'Medium', 'Low'].includes(item.priority) ? item.priority : 'Medium',
      notes: item.notes || '',
      status: 'Pending'
    }
  }
  if (type === 'result') {
    return {
      semester_name: item.semester_name || 'Year 1 Semester 1',
      course_code: item.course_code || '',
      course_name: item.course_name || '',
      credit_hours: Number(item.credit_hours) || 3,
      grade: item.grade || 'A'
    }
  }
  return item
}
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function parseAIResponse(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty response received from AI')
  }

  let cleaned = raw.replace(/```json|```/g, '').trim()

  const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/)
  if (match) {
    cleaned = match[0]
  } else {
    const openIndex = cleaned.indexOf('[')
    if (openIndex !== -1) {
      cleaned = cleaned.substring(openIndex)
    }
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch (e) {
    // Continue to repair attempts
  }

  try {
    let repaired = cleaned
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/[\u0000-\u001F]+/g, ' ')
    const parsed = JSON.parse(repaired)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch (e) {
    // Continue to truncation recovery
  }

  let str = cleaned
  while (str.lastIndexOf('}') !== -1) {
    const lastBrace = str.lastIndexOf('}')
    str = str.substring(0, lastBrace + 1)
    try {
      const candidate = str.replace(/,\s*$/, '') + ']'
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.warn(`Recovered ${parsed.length} items from truncated JSON response.`)
        return parsed
      }
    } catch (e) {
      str = str.substring(0, lastBrace)
    }
  }

  throw new Error("AI response format was invalid or incomplete. Please try again with a clearer image.")
}
