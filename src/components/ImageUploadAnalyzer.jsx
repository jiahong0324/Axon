import { Check, Loader2, RotateCcw, Sparkles, Upload, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { analyzeImageWithGroq } from '../lib/groq'

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

export default function ImageUploadAnalyzer({ type, onResult }) {
  const inputRef = useRef(null)
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [items, setItems] = useState([])
  const [messageIndex, setMessageIndex] = useState(0)
  const [error, setError] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const messages = statusMessages[type] || statusMessages.timetable

  useEffect(() => {
    if (step !== 'analyzing') return undefined
    setMessageIndex(0)
    const id = setInterval(() => setMessageIndex(i => (i + 1) % messages.length), 2000)
    return () => clearInterval(id)
  }, [step, type])

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
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pr-1">
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center w-full py-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDrop={e => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]) }}
              onDragOver={e => e.preventDefault()}
              className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-theme-500/30 bg-theme-500/5 py-12 px-6 text-center transition-all duration-300 hover:border-theme-500/50 hover:bg-theme-500/10"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                <Upload className="h-7 w-7" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white mb-2">Upload screenshot</span>
              <span className="text-sm text-slate-400 max-w-[280px] leading-relaxed mb-6">
                Take a screenshot of your {type === 'exam' ? 'exam dates' : type === 'assignment' ? 'assignments list' : type === 'result' ? 'exam results slip' : 'timetable'} and upload it here
              </span>
              <span className="btn-import pointer-events-none">Browse Files</span>
            </button>
          </div>
        )}
        <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={e => pickFile(e.target.files?.[0])} />

        {step === 'ready' && (
          <div className="flex flex-col items-center justify-center w-full py-6 text-center">
            <div className="relative group max-w-xs mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
              <img src={preview} alt="Uploaded preview" className="mx-auto max-h-64 object-contain rounded-2xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-slate-300">{file.name}</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 font-medium mb-6">
              Selected: <span className="text-white">{file.name}</span> <span className="text-slate-600">·</span> {Math.round(file.size / 1024)} KB
            </p>
            <div className="flex flex-col w-full max-w-xs gap-3 sm:flex-row sm:max-w-md justify-center">
              <button className="btn-ghost flex-1" onClick={() => inputRef.current?.click()}>Change Image</button>
              <button className="btn-import flex-1" onClick={analyze}>
                <Sparkles className="h-4 w-4 animate-pulse" /> Analyze with AI
              </button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center w-full py-12 text-center space-y-6">
            <div className="relative">
              <img src={preview} alt="Uploaded preview" className="mx-auto h-24 w-24 rounded-2xl border border-white/10 object-cover blur-[1px] opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
              </div>
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {type === 'exam' ? 'Reading Your Exam Schedule'
                  : type === 'assignment' ? 'Reading Your Assignments'
                  : type === 'result' ? 'Reading Your Result Slip'
                  : 'AI is Reading Your Image'}
              </h3>
              <p className="text-emerald-400 font-semibold text-sm animate-pulse">{messages[messageIndex]}</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {type === 'exam'
                  ? 'This takes a few seconds. We are extracting exam dates, times, and venues from your screenshot.'
                  : type === 'assignment'
                  ? 'This takes a few seconds. We are extracting assignment titles, deadlines, and priorities from your screenshot.'
                  : type === 'result'
                  ? 'This takes a few seconds. We are extracting your grades, credit hours, and course names from your result slip.'
                  : 'This takes a few seconds. We are extracting classes, dates, and times directly from your screenshot.'}
              </p>
            </div>
            <div className="flex justify-center gap-1.5 pt-2">
              <span className="typing-dot h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="typing-dot h-2.5 w-2.5 rounded-full bg-emerald-400/80" style={{ animationDelay: '0.2s' }} />
              <span className="typing-dot h-2.5 w-2.5 rounded-full bg-emerald-400/80" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center w-full py-10 text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
            <p className="text-red-400 font-medium text-sm mb-2">{error}</p>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
              Make sure the image is clear, text is readable, and contains a valid timetable structure.
            </p>
            <button className="btn-import w-full max-w-xs" onClick={startOver}>Try Again</button>
          </div>
        )}

        {step === 'results' && (
          <div className="animate-[fadeIn_.25s_ease] space-y-4">
            <div className="rounded-2xl border border-white/10 bg-navy-950/30 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold tracking-wide text-slate-400">DETECTED {selected.length} {label}</h3>
                <button className="min-h-0 min-w-0 text-sm font-semibold text-theme-400" onClick={() => setAll(selected.length !== items.length)}>{selected.length === items.length ? 'Deselect All' : 'Select All'}</button>
              </div>
              <div className="space-y-4 pr-1">
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
        <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:justify-end">
          <button className="btn-ghost" onClick={startOver}><RotateCcw className="h-4 w-4" /> Start Over</button>
          <button
            className="btn-import disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selected.length === 0 || isImporting}
            onClick={handleImport}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Import Selected ({selected.length})
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
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      item.selected 
        ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-sm shadow-emerald-500/5' 
        : 'border-slate-800 bg-slate-900/10 opacity-60'
    }`}>
      {/* Header Row: Checkbox + Subject Name */}
      <div className="flex items-start gap-3">
        <button 
          className={`shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 ${
            item.selected 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20' 
              : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
          } h-9 w-9 mt-7`} 
          onClick={() => updateItem(index, { selected: !item.selected })}
        >
          <Check className="h-5 w-5 stroke-[2.5]" />
        </button>
        
        <div className="flex-1 min-w-0">
          <Field label="Subject Name">
            <input 
              className="input transition-all duration-200 focus:ring-2 focus:ring-theme-500/20 focus:border-theme-500" 
              value={item.subject} 
              onChange={e => updateItem(index, { subject: e.target.value })} 
              placeholder="e.g. CSCI 101"
            />
          </Field>
        </div>
      </div>

      {/* Grid of other details */}
      <div className="mt-4 grid grid-cols-2 gap-3 pl-0 lg:pl-12 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-1">
          <Field label="Day">
            <select 
              className="input" 
              value={item.day} 
              onChange={e => updateItem(index, { day: e.target.value })}
            >
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                <option key={day}>{day}</option>
              ))}
            </select>
          </Field>
        </div>
        
        <div>
          <Field label="Start Time">
            <input 
              className="input" 
              type="time" 
              value={item.start_time} 
              onChange={e => updateItem(index, { start_time: e.target.value })} 
            />
          </Field>
        </div>
        
        <div>
          <Field label="End Time">
            <input 
              className="input" 
              type="time" 
              value={item.end_time} 
              onChange={e => updateItem(index, { end_time: e.target.value })} 
            />
          </Field>
        </div>
        
        <div>
          <Field label="Classroom">
            <input 
              className="input" 
              value={item.classroom} 
              onChange={e => updateItem(index, { classroom: e.target.value })} 
              placeholder="Room"
            />
          </Field>
        </div>
        
        <div className="col-span-2 lg:col-span-1">
          <Field label="Lecturer">
            <input 
              className="input" 
              value={item.lecturer} 
              onChange={e => updateItem(index, { lecturer: e.target.value })} 
              placeholder="Name"
            />
          </Field>
        </div>
      </div>

      {/* Class Type and Color picker */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/5 pt-4 pl-0 lg:pl-12">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">Class Type</span>
          <div className="flex gap-1.5">
            {['L', 'T', 'P'].map(type => (
              <button 
                key={type} 
                className={`h-8 min-h-8 min-w-8 px-3 rounded-lg border text-sm font-semibold transition-all duration-200 ${
                  item.class_type === type 
                    ? 'border-theme-500/30 bg-theme-500/10 text-theme-400 font-bold' 
                    : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10'
                }`} 
                onClick={() => updateItem(index, { class_type: type, color: getColorFromType(type) })}
              >
                {type === 'L' ? 'Lec' : type === 'T' ? 'Tut' : 'Prac'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">Theme Color</span>
          <div className="flex gap-1.5">
            {colors.map(color => (
              <button 
                key={color} 
                className={`h-6 min-h-6 w-6 min-w-6 rounded-full transition-transform duration-200 hover:scale-110 ${colorClasses[color]} ${
                  item.color === color 
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-navy-950 scale-105' 
                    : 'opacity-80 hover:opacity-100'
                }`} 
                onClick={() => updateItem(index, { color })} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SimpleResult({ item, index, updateItem, type }) {
  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      item.selected 
        ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-sm shadow-emerald-500/5' 
        : 'border-slate-800 bg-slate-900/10 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        <button 
          className={`shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 ${
            item.selected 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20' 
              : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
          } h-9 w-9 mt-7`} 
          onClick={() => updateItem(index, { selected: !item.selected })}
        >
          <Check className="h-5 w-5 stroke-[2.5]" />
        </button>
        <div className="flex-1 min-w-0 grid gap-3 md:grid-cols-2">
          <Field label={type === 'exam' ? 'Subject Name' : 'Assignment Title'}>
            <input 
              className="input transition-all duration-200 focus:ring-2 focus:ring-theme-500/20 focus:border-theme-500" 
              value={type === 'exam' ? item.subject : item.title} 
              onChange={e => updateItem(index, type === 'exam' ? { subject: e.target.value } : { title: e.target.value })} 
              placeholder={type === 'exam' ? 'e.g. MATH 201' : 'e.g. Lab Report 1'}
            />
          </Field>
          <Field label={type === 'exam' ? 'Exam Date' : 'Due Date'}>
            <input 
              className="input" 
              type="date" 
              value={type === 'exam' ? item.exam_date : item.deadline} 
              onChange={e => updateItem(index, type === 'exam' ? { exam_date: e.target.value } : { deadline: e.target.value })} 
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

function ResultItemRow({ item, index, updateItem }) {
  const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'F']
  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      item.selected 
        ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-sm shadow-emerald-500/5' 
        : 'border-slate-800 bg-slate-900/10 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        <button 
          className={`shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 ${
            item.selected 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20' 
              : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
          } h-9 w-9 mt-7`} 
          onClick={() => updateItem(index, { selected: !item.selected })}
        >
          <Check className="h-5 w-5 stroke-[2.5]" />
        </button>
        <div className="flex-1 min-w-0 grid gap-3 md:grid-cols-4">
          <Field label="Course Code">
            <input 
              className="input" 
              value={item.course_code || ''} 
              onChange={e => updateItem(index, { course_code: e.target.value })} 
              placeholder="e.g. AACS1074"
            />
          </Field>
          <Field label="Course Name">
            <input 
              className="input" 
              value={item.course_name || ''} 
              onChange={e => updateItem(index, { course_name: e.target.value })} 
              placeholder="Course Title"
            />
          </Field>
          <Field label="Credit Hours">
            <select 
              className="input" 
              value={item.credit_hours || 3} 
              onChange={e => updateItem(index, { credit_hours: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Grade">
            <select 
              className="input font-bold" 
              value={item.grade || 'A'} 
              onChange={e => updateItem(index, { grade: e.target.value })}
            >
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
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
