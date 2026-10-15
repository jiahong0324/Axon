import { Calendar, Check, Clock, Loader2, MapPin, RotateCcw, Sparkles, Trash2, Upload, User, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { analyzeImageWithGroq } from '../lib/groq'
import DateInput from './DateInput'

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
const colors = ['blue', 'green', 'purple', 'cyan', 'red', 'yellow']
const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  red: 'bg-red-500',
  yellow: 'bg-amber-500'
}
const colorBorderClasses = {
  blue: 'border-l-blue-500',
  green: 'border-l-emerald-500',
  purple: 'border-l-purple-500',
  cyan: 'border-l-cyan-500',
  red: 'border-l-red-500',
  yellow: 'border-l-amber-500'
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
        const maxDim = 2048
        
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
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        const base64 = dataUrl.split(',')[1]
        
        try {
          const prompt = type === 'exam' ? EXAM_PROMPT : type === 'assignment' ? ASSIGNMENT_PROMPT : type === 'result' ? RESULT_PROMPT : TIMETABLE_PROMPT
          const raw = await analyzeImageWithGroq(base64, 'image/jpeg', prompt)
          
          const parsed = parseAIResponse(raw)
          
          setItems(parsed.map((item, index) => normalizeItem(item, type, index)))
          setStep('results')
        } catch (err) {
          setError(err.message || "AI couldn't read this image clearly")
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

function TimetableResult({ item, index, updateItem, onDelete }) {
  const currentColor = item.color || getColorFromType(item.class_type || 'L')
  const borderClass = colorBorderClasses[currentColor] || 'border-l-blue-500'

  return (
    <div
      className={`group relative rounded-xl border border-l-4 transition-all duration-150 ${borderClass} ${
        item.selected
          ? 'border-white/10 bg-[#151f30] hover:bg-[#19253a] shadow-sm'
          : 'border-white/5 bg-slate-900/30 opacity-40 hover:opacity-60'
      }`}
    >
      <div className="p-2.5 sm:px-3 sm:py-2.5 space-y-1.5">
        {/* Row 1: Checkbox + Subject (Inline Editable) + Class Type Badge + Mini Color Dots + Trash */}
        <div className="flex items-center gap-2">
          {/* Checkbox */}
          <button
            type="button"
            onClick={() => updateItem(index, { selected: !item.selected })}
            className={`h-5 w-5 shrink-0 flex items-center justify-center rounded-md transition-all ${
              item.selected
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : 'border border-slate-600 bg-slate-800/80 text-transparent hover:border-slate-400'
            }`}
            title={item.selected ? 'Deselect session' : 'Select session'}
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </button>

          {/* Subject Name Input */}
          <div className="flex-1 min-w-0">
            <input
              className="w-full bg-transparent hover:bg-white/5 focus:bg-slate-900/90 border border-transparent focus:border-white/20 rounded-lg px-2 py-0.5 text-[14px] font-bold text-white tracking-wide placeholder-slate-500 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              value={item.subject || ''}
              onChange={e => updateItem(index, { subject: e.target.value })}
              placeholder="Subject (e.g. BMIS1043)"
            />
          </div>

          {/* Class Type Badge Selector */}
          <div className="relative shrink-0">
            <select
              value={item.class_type || 'L'}
              onChange={e => {
                const val = e.target.value
                updateItem(index, { class_type: val, color: getColorFromType(val) })
              }}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border cursor-pointer focus:outline-none transition-colors ${
                item.class_type === 'T'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : item.class_type === 'P'
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25'
                  : item.class_type === 'C'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                  : 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25'
              }`}
              title="Class type"
            >
              <option value="L" className="bg-slate-900 text-white">Lecture (L)</option>
              <option value="T" className="bg-slate-900 text-white">Tutorial (T)</option>
              <option value="P" className="bg-slate-900 text-white">Practical (P)</option>
              <option value="C" className="bg-slate-900 text-white">Class (C)</option>
            </select>
          </div>

          {/* Mini Color Dots (Inline, 6 micro dots) */}
          <div className="hidden sm:flex items-center gap-1 shrink-0 px-1 border-l border-white/10">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => updateItem(index, { color: c })}
                className={`h-2.5 w-2.5 rounded-full transition-all ${colorClasses[c]} ${
                  currentColor === c
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-[#151f30] scale-125 opacity-100'
                    : 'opacity-35 hover:opacity-100 hover:scale-125'
                }`}
                title={`Color: ${c}`}
              />
            ))}
          </div>

          {/* Delete Button */}
          <button
            type="button"
            onClick={onDelete}
            className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Remove class"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Row 2: Day, Time, Room, Lecturer */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-7 text-xs text-slate-400">
          {/* Day */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none cursor-pointer"
              value={item.day || 'Monday'}
              onChange={e => updateItem(index, { day: e.target.value })}
            >
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
              ))}
            </select>
          </div>

          <span className="text-white/15 hidden sm:inline">·</span>

          {/* Time */}
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              type="time"
              className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none w-[66px] text-center"
              value={item.start_time || '09:00'}
              onChange={e => updateItem(index, { start_time: e.target.value })}
            />
            <span className="text-slate-600">-</span>
            <input
              type="time"
              className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none w-[66px] text-center"
              value={item.end_time || '10:00'}
              onChange={e => updateItem(index, { end_time: e.target.value })}
            />
          </div>

          <span className="text-white/15 hidden sm:inline">·</span>

          {/* Room */}
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none placeholder-slate-600 w-20 sm:w-24 truncate"
              value={item.classroom || ''}
              onChange={e => updateItem(index, { classroom: e.target.value })}
              placeholder="Room"
            />
          </div>

          <span className="text-white/15 hidden sm:inline">·</span>

          {/* Lecturer */}
          <div className="flex items-center gap-1 flex-1 min-w-[120px]">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              className="bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-white/10 focus:outline-none placeholder-slate-600 w-full truncate"
              value={item.lecturer || ''}
              onChange={e => updateItem(index, { lecturer: e.target.value })}
              placeholder="Lecturer (optional)"
            />
          </div>

          {/* Mobile Color Dots */}
          <div className="flex sm:hidden items-center gap-1.5 ml-auto pt-0.5">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => updateItem(index, { color: c })}
                className={`h-2.5 w-2.5 rounded-full transition-all ${colorClasses[c]} ${
                  currentColor === c
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-[#151f30] scale-125'
                    : 'opacity-40'
                }`}
              />
            ))}
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
function getColorFromType(classType) { return classType === 'T' ? 'green' : classType === 'P' ? 'purple' : classType === 'C' ? 'yellow' : 'blue' }
function normalizeItem(item, type, index) {
  const class_type = ['L', 'T', 'P', 'C'].includes(item.class_type) ? item.class_type : 'L'
  const base = {
    ...item,
    key: `${index}-${item.subject || item.title || item.course_name || index}`,
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
    return {
      subject: item.subject || '',
      day: item.day || 'Monday',
      start_time: item.start_time || '09:00',
      end_time: item.end_time || '10:00',
      lecturer: item.lecturer || '',
      classroom: item.classroom || '',
      class_type: class_type || 'L',
      color: color || getColorFromType(class_type || 'L')
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
