import { Check, Loader2, RotateCcw, Sparkles, Upload, XCircle } from 'lucide-react'
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
  blue: 'bg-theme-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500'
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
    <div className={`flex flex-1 min-h-0 flex-col ${step !== 'results' ? 'max-w-xl mx-auto w-full' : 'w-full'}`}>
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pr-1">
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center w-full py-1 sm:py-2">
            <div
              onClick={() => inputRef.current?.click()}
              onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
              onDrop={e => { e.preventDefault(); setIsDragging(false); pickFile(e.dataTransfer.files?.[0]) }}
              className={`group relative flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/10 scale-[1.01]'
                  : 'border-white/15 bg-white/[0.02] hover:border-emerald-500/50 hover:bg-emerald-500/[0.04]'
              }`}
            >
              <div className={`mb-3.5 flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border transition-all duration-300 ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300 scale-110 shadow-lg shadow-emerald-500/30'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 group-hover:scale-105 group-hover:border-emerald-400/50 group-hover:bg-emerald-500/15'
              }`}>
                <Upload className="h-6 w-6" />
              </div>

              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white mb-1.5">
                {isDragging ? 'Drop screenshot here' : 'Upload screenshot'}
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 max-w-[320px] leading-relaxed mb-5">
                Drag & drop your {type === 'exam' ? 'exam schedule' : type === 'assignment' ? 'assignments list' : type === 'result' ? 'result slip' : 'timetable'} screenshot, or click to browse
              </p>

              <div className="flex flex-col items-center gap-2.5">
                <span className="btn-import !py-2.5 !px-5 !min-h-0 text-sm shadow-md shadow-emerald-500/20">
                  <Upload className="h-4 w-4" /> Browse Files
                </span>

                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                  or paste with <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-slate-300 font-mono text-[10px] border border-white/10">Ctrl+V</kbd>
                </span>
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                PNG, JPG, WebP
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                AI auto-extracts timetable details
              </span>
            </div>
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
          <div className="animate-[fadeIn_.25s_ease] space-y-3">
            <div className="rounded-2xl border border-white/10 bg-navy-950/40 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 items-center justify-center rounded-md bg-emerald-500/10 px-2 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                    {selected.length} / {items.length}
                  </span>
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-slate-300">
                    {label} DETECTED
                  </h3>
                </div>
                <button
                  type="button"
                  className="min-h-0 min-w-0 text-xs font-semibold text-theme-400 hover:text-theme-300 transition-colors"
                  onClick={() => setAll(selected.length !== items.length)}
                >
                  {selected.length === items.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                {items.map((item, index) => type === 'timetable'
                  ? <TimetableResult key={item.key} item={item} index={index} updateItem={updateItem} />
                  : type === 'result'
                  ? <ResultItemRow key={item.key} item={item} index={index} updateItem={updateItem} />
                  : <SimpleResult key={item.key} item={item} index={index} updateItem={updateItem} type={type} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {step === 'results' && (
        <div className="mt-4 flex shrink-0 flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-4">
          <button type="button" className="btn-ghost w-full sm:w-auto !min-h-0 !py-2.5 text-sm" onClick={startOver}>
            <RotateCcw className="h-4 w-4" /> Start Over
          </button>
          <button
            type="button"
            className="btn-import w-full sm:w-auto !min-h-0 !py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                <Check className="h-4 w-4" />
                <span>Import Selected ({selected.length})</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function TimetableResult({ item, index, updateItem }) {
  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-200 ${
      item.selected 
        ? 'border-emerald-500/30 bg-emerald-500/[0.03] shadow-sm shadow-emerald-500/5' 
        : 'border-white/5 bg-white/[0.01] opacity-50'
    }`}>
      {/* Top bar: Checkbox + Subject Name + Class Type toggle */}
      <div className="flex items-center gap-2.5">
        <button 
          type="button"
          className={`shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 ${
            item.selected 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20' 
              : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
          } h-8 w-8 min-h-0 min-w-0`} 
          onClick={() => updateItem(index, { selected: !item.selected })}
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
        </button>
        
        <div className="flex-1 min-w-0">
          <input 
            className="input !py-1.5 !min-h-0 text-sm font-semibold transition-all duration-200 focus:ring-2 focus:ring-theme-500/20 focus:border-theme-500" 
            value={item.subject} 
            onChange={e => updateItem(index, { subject: e.target.value })} 
            placeholder="Subject Name (e.g. CSCI 101)"
          />
        </div>

        {/* Quick Type selector (desktop) */}
        <div className="hidden sm:flex gap-1 shrink-0">
          {['L', 'T', 'P'].map(t => (
            <button 
              key={t} 
              type="button"
              className={`h-7 px-2.5 rounded-md border text-xs font-semibold transition-all ${
                item.class_type === t 
                  ? 'border-theme-500/40 bg-theme-500/20 text-theme-300 font-bold' 
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`} 
              onClick={() => updateItem(index, { class_type: t, color: getColorFromType(t) })}
            >
              {t === 'L' ? 'Lec' : t === 'T' ? 'Tut' : 'Prac'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of details */}
      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 pl-0 sm:pl-10">
        <div>
          <span className="label !text-[11px] block mb-1">Day</span>
          <select 
            className="input !py-1.5 !min-h-0 text-xs" 
            value={item.day} 
            onChange={e => updateItem(index, { day: e.target.value })}
          >
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <option key={day}>{day}</option>
            ))}
          </select>
        </div>
        
        <div>
          <span className="label !text-[11px] block mb-1">Time</span>
          <div className="flex items-center gap-1">
            <input 
              className="input !py-1.5 !min-h-0 !px-1.5 text-xs text-center" 
              type="time" 
              value={item.start_time} 
              onChange={e => updateItem(index, { start_time: e.target.value })} 
            />
            <span className="text-slate-500 text-xs">-</span>
            <input 
              className="input !py-1.5 !min-h-0 !px-1.5 text-xs text-center" 
              type="time" 
              value={item.end_time} 
              onChange={e => updateItem(index, { end_time: e.target.value })} 
            />
          </div>
        </div>
        
        <div>
          <span className="label !text-[11px] block mb-1">Room</span>
          <input 
            className="input !py-1.5 !min-h-0 text-xs" 
            value={item.classroom} 
            onChange={e => updateItem(index, { classroom: e.target.value })} 
            placeholder="Room (e.g. D102)"
          />
        </div>
        
        <div>
          <span className="label !text-[11px] block mb-1">Lecturer</span>
          <input 
            className="input !py-1.5 !min-h-0 text-xs" 
            value={item.lecturer} 
            onChange={e => updateItem(index, { lecturer: e.target.value })} 
            placeholder="Lecturer name"
          />
        </div>
      </div>

      {/* Mobile class type + Color picker row */}
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/5 pt-2 pl-0 sm:pl-10">
        <div className="flex sm:hidden items-center gap-1">
          {['L', 'T', 'P'].map(t => (
            <button 
              key={t} 
              type="button"
              className={`h-6 px-2 rounded border text-[11px] font-semibold transition-all ${
                item.class_type === t 
                  ? 'border-theme-500/40 bg-theme-500/20 text-theme-300 font-bold' 
                  : 'border-white/10 bg-white/5 text-slate-400'
              }`} 
              onClick={() => updateItem(index, { class_type: t, color: getColorFromType(t) })}
            >
              {t === 'L' ? 'Lec' : t === 'T' ? 'Tut' : 'Prac'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] uppercase font-semibold text-slate-500 mr-1">Color</span>
          {colors.map(color => (
            <button 
              key={color} 
              type="button"
              className={`h-4 w-4 rounded-full transition-transform duration-150 hover:scale-125 ${colorClasses[color]} ${
                item.color === color 
                  ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110' 
                  : 'opacity-70 hover:opacity-100'
              }`} 
              onClick={() => updateItem(index, { color })} 
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SimpleResult({ item, index, updateItem, type }) {
  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-200 ${
      item.selected 
        ? 'border-emerald-500/30 bg-emerald-500/[0.03] shadow-sm shadow-emerald-500/5' 
        : 'border-white/5 bg-white/[0.01] opacity-50'
    }`}>
      <div className="flex items-center gap-2.5">
        <button 
          type="button"
          className={`shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 ${
            item.selected 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20' 
              : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
          } h-8 w-8 min-h-0 min-w-0`} 
          onClick={() => updateItem(index, { selected: !item.selected })}
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
        </button>
        <div className="flex-1 min-w-0 grid gap-2.5 sm:grid-cols-2">
          <div>
            <span className="label !text-[11px] block mb-1">{type === 'exam' ? 'Subject Name' : 'Assignment Title'}</span>
            <input 
              className="input !py-1.5 !min-h-0 text-sm font-semibold transition-all duration-200 focus:ring-2 focus:ring-theme-500/20 focus:border-theme-500" 
              value={type === 'exam' ? item.subject : item.title} 
              onChange={e => updateItem(index, type === 'exam' ? { subject: e.target.value } : { title: e.target.value })} 
              placeholder={type === 'exam' ? 'e.g. MATH 201' : 'e.g. Lab Report 1'}
            />
          </div>
          <div>
            <span className="label !text-[11px] block mb-1">{type === 'exam' ? 'Exam Date' : 'Due Date'}</span>
            <DateInput 
              className="input !py-1.5 !min-h-0 text-sm" 
              value={type === 'exam' ? item.exam_date : item.deadline} 
              onChange={e => updateItem(index, type === 'exam' ? { exam_date: e.target.value } : { deadline: e.target.value })} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultItemRow({ item, index, updateItem }) {
  const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'F']
  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-200 ${
      item.selected 
        ? 'border-emerald-500/30 bg-emerald-500/[0.03] shadow-sm shadow-emerald-500/5' 
        : 'border-white/5 bg-white/[0.01] opacity-50'
    }`}>
      <div className="flex items-center gap-2.5">
        <button 
          type="button"
          className={`shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 ${
            item.selected 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20' 
              : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
          } h-8 w-8 min-h-0 min-w-0`} 
          onClick={() => updateItem(index, { selected: !item.selected })}
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
        </button>
        <div className="flex-1 min-w-0 grid gap-2 sm:grid-cols-4">
          <div>
            <span className="label !text-[11px] block mb-1">Course Code</span>
            <input 
              className="input !py-1.5 !min-h-0 text-xs" 
              value={item.course_code || ''} 
              onChange={e => updateItem(index, { course_code: e.target.value })} 
              placeholder="e.g. AACS1074"
            />
          </div>
          <div>
            <span className="label !text-[11px] block mb-1">Course Name</span>
            <input 
              className="input !py-1.5 !min-h-0 text-xs" 
              value={item.course_name || ''} 
              onChange={e => updateItem(index, { course_name: e.target.value })} 
              placeholder="Course Title"
            />
          </div>
          <div>
            <span className="label !text-[11px] block mb-1">Credits</span>
            <select 
              className="input !py-1.5 !min-h-0 text-xs" 
              value={item.credit_hours || 3} 
              onChange={e => updateItem(index, { credit_hours: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <span className="label !text-[11px] block mb-1">Grade</span>
            <select 
              className="input !py-1.5 !min-h-0 text-xs font-bold" 
              value={item.grade || 'A'} 
              onChange={e => updateItem(index, { grade: e.target.value })}
            >
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function getColorFromType(classType) { return classType === 'T' ? 'green' : classType === 'P' ? 'purple' : 'blue' }
function normalizeItem(item, type, index) {
  const class_type = ['L', 'T', 'P'].includes(item.class_type) ? item.class_type : 'L'
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
