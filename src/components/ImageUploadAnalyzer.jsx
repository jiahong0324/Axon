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
8. Day names must be exactly: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"

Each object in the array must have exactly these fields:
{
  "subject": "subject code or name string",
  "day": "Monday|Tuesday|Wednesday|Thursday|Friday",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "lecturer": "lecturer name or empty string",
  "classroom": "room code or empty string",
  "class_type": "L|T|P"
}

Return ONLY the JSON array. No other text.`

const EXAM_PROMPT = `
Analyze this university exam timetable image. Extract ALL exams and return as a JSON array only, no other text.
Each object must have:
{
  "subject": "string",
  "exam_date": "YYYY-MM-DD",
  "start_time": "HH:MM or empty string",
  "end_time": "HH:MM or empty string",
  "exam_type": "Quiz|Midterm|Final|Assignment",
  "venue": "string or empty string",
  "notes": "string or empty string"
}
Return ONLY valid JSON array. No markdown, no explanation.`

const ASSIGNMENT_PROMPT = `
Analyze this university assignment or coursework screenshot. Extract ALL assignments and return as a JSON array only, no other text.
Each object must have: { "title": "string", "subject": "string", "deadline": "YYYY-MM-DD", "priority": "High|Medium|Low", "notes": "string or empty string", "status": "Pending" }
Return ONLY valid JSON array. No markdown, no explanation.`

const statusMessages = [
  'Scanning the timetable grid...',
  'Identifying subject codes...',
  'Extracting classroom details...',
  'Converting lecture times...',
  'Detecting class types (L/T/P)...'
]
const colors = ['blue', 'green', 'purple', 'cyan', 'red', 'yellow']
const colorClasses = {
  blue: 'bg-blue-500',
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

  useEffect(() => {
    if (step !== 'analyzing') return undefined
    const id = setInterval(() => setMessageIndex(i => (i + 1) % statusMessages.length), 2000)
    return () => clearInterval(id)
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
    setStep('analyzing')
    setError('')
    try {
      const base64 = await toBase64(file)
      const prompt = type === 'exam' ? EXAM_PROMPT : type === 'assignment' ? ASSIGNMENT_PROMPT : TIMETABLE_PROMPT
      const raw = await analyzeImageWithGroq(base64, file.type, prompt)
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty result')
      setItems(parsed.map((item, index) => normalizeItem(item, type, index)))
      setStep('results')
    } catch {
      setError("AI couldn't read this image clearly")
      setStep('error')
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
  const label = type === 'exam' ? 'EXAMS' : type === 'assignment' ? 'ASSIGNMENTS' : 'CLASS SESSIONS'

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pr-1">
        {step === 'upload' && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={e => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]) }}
            onDragOver={e => e.preventDefault()}
            className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-blue-500/40 bg-blue-500/5 p-6 text-center hover:bg-blue-500/10"
          >
            <Upload className="mb-4 h-12 w-12 text-emerald-400" />
            <span className="text-lg font-semibold">Upload or drop a screenshot</span>
            <span className="muted mt-1">PNG, JPG, or WEBP timetable image</span>
            <span className="btn-import mt-5">Browse Files</span>
          </button>
        )}
        <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={e => pickFile(e.target.files?.[0])} />

        {step === 'ready' && (
          <div className="space-y-4 text-center">
            <img src={preview} alt="Uploaded preview" className="mx-auto max-h-48 rounded-2xl border border-white/10 object-contain" />
            <p className="muted">{file.name} · {Math.round(file.size / 1024)} KB</p>
            <div className="flex flex-col justify-center gap-3 md:flex-row">
              <button className="btn-ghost" onClick={() => inputRef.current?.click()}>Choose Different Image</button>
              <button className="btn-import" onClick={analyze}><Sparkles className="h-4 w-4" /> Analyze with Vision AI</button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="space-y-6 text-center">
            <img src={preview} alt="Uploaded preview" className="mx-auto max-h-32 rounded-xl border border-white/10 object-contain" />
            <p className="font-medium text-blue-300">Image selected. Analyzing this image...</p>
            <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-navy-950">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">AI is Analyzing Your Screenshot</h3>
              <p className="muted mt-2">{statusMessages[messageIndex]}</p>
              <div className="mt-4 flex justify-center gap-2"><span className="typing-dot h-2 w-2 rounded-full bg-emerald-400" /><span className="typing-dot h-2 w-2 rounded-full bg-emerald-400" /><span className="typing-dot h-2 w-2 rounded-full bg-emerald-400" /></div>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-center">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-yellow-400" />
            <h3 className="text-lg font-bold">Warning: {error}</h3>
            <p className="muted mt-2">Try a clearer screenshot and ensure the timetable is fully visible.</p>
            <button className="btn-import mt-5" onClick={startOver}>Try Again</button>
          </div>
        )}

        {step === 'results' && (
          <div className="animate-[fadeIn_.25s_ease] space-y-4">
            <div className="rounded-2xl border border-white/10 bg-navy-950/30 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold tracking-wide text-slate-400">DETECTED {selected.length} {label}</h3>
                <button className="min-h-0 min-w-0 text-sm font-semibold text-blue-400" onClick={() => setAll(selected.length !== items.length)}>{selected.length === items.length ? 'Deselect All' : 'Select All'}</button>
              </div>
              <div className="scrollbar-hide max-h-[48vh] space-y-4 overflow-y-auto pr-2">
                {items.map((item, index) => type === 'timetable'
                  ? <TimetableResult key={item.key} item={item} index={index} updateItem={updateItem} />
                  : <SimpleResult key={item.key} item={item} index={index} updateItem={updateItem} type={type} />)}
              </div>
            </div>
          </div>
        )}
      </div>
      {step === 'results' && (
        <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:justify-end">
          <button className="btn-ghost" onClick={startOver}><RotateCcw className="h-4 w-4" /> Start Over</button>
          <button className="btn-import" disabled={selected.length === 0} onClick={() => onResult(selected.map(item => cleanItem(item, type)))}><Check className="h-4 w-4" /> Import Selected {type === 'timetable' ? 'Classes' : 'Items'} ({selected.length})</button>
        </div>
      )}
    </div>
  )
}

function TimetableResult({ item, index, updateItem }) {
  return (
    <div className={`rounded-2xl border p-4 transition-opacity ${item.selected ? 'border-green-500/50' : 'border-slate-700 opacity-50'}`}>
      <div className="grid gap-3 lg:grid-cols-[auto_1.5fr_1fr_1fr_1fr_1fr_1.4fr]">
        <button className={`mt-6 h-8 min-h-8 w-8 min-w-8 rounded-lg ${item.selected ? 'bg-emerald-500' : 'bg-slate-700'}`} onClick={() => updateItem(index, { selected: !item.selected })}>{item.selected && <Check className="mx-auto h-5 w-5 text-white" />}</button>
        <Field label="Subject Name"><input className="input" value={item.subject} onChange={e => updateItem(index, { subject: e.target.value })} /></Field>
        <Field label="Day"><select className="input" value={item.day} onChange={e => updateItem(index, { day: e.target.value })}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => <option key={day}>{day}</option>)}</select></Field>
        <Field label="Start Time"><input className="input" type="time" value={item.start_time} onChange={e => updateItem(index, { start_time: e.target.value })} /></Field>
        <Field label="End Time"><input className="input" type="time" value={item.end_time} onChange={e => updateItem(index, { end_time: e.target.value })} /></Field>
        <Field label="Classroom"><input className="input" value={item.classroom} onChange={e => updateItem(index, { classroom: e.target.value })} /></Field>
        <Field label="Lecturer"><input className="input" value={item.lecturer} onChange={e => updateItem(index, { lecturer: e.target.value })} /></Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 pl-0 lg:pl-11">
        {['L', 'T', 'P'].map(type => <button key={type} className={`h-9 min-h-9 rounded-full border px-4 ${item.class_type === type ? 'border-blue-400 bg-blue-500/20' : 'border-white/10'}`} onClick={() => updateItem(index, { class_type: type, color: getColorFromType(type) })}>{type}</button>)}
        <div className="flex gap-2">{colors.map(color => <button key={color} className={`h-6 min-h-6 w-6 min-w-6 rounded-full ${colorClasses[color]} ${item.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-navy-900' : ''}`} onClick={() => updateItem(index, { color })} />)}</div>
      </div>
    </div>
  )
}

function SimpleResult({ item, index, updateItem, type }) {
  return (
    <div className={`rounded-2xl border p-4 ${item.selected ? 'border-green-500/50' : 'border-slate-700 opacity-50'}`}>
      <div className="flex gap-3">
        <button className={`h-8 min-h-8 w-8 min-w-8 rounded-lg ${item.selected ? 'bg-emerald-500' : 'bg-slate-700'}`} onClick={() => updateItem(index, { selected: !item.selected })}>{item.selected && <Check className="mx-auto h-5 w-5 text-white" />}</button>
        <div className="grid flex-1 gap-3 md:grid-cols-2">
          <Field label={type === 'exam' ? 'Subject' : 'Title'}><input className="input" value={type === 'exam' ? item.subject : item.title} onChange={e => updateItem(index, type === 'exam' ? { subject: e.target.value } : { title: e.target.value })} /></Field>
          <Field label={type === 'exam' ? 'Date' : 'Deadline'}><input className="input" type="date" value={type === 'exam' ? item.exam_date : item.deadline} onChange={e => updateItem(index, type === 'exam' ? { exam_date: e.target.value } : { deadline: e.target.value })} /></Field>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function getColorFromType(classType) { return classType === 'T' ? 'green' : classType === 'P' ? 'purple' : 'blue' }
function normalizeItem(item, type, index) {
  const class_type = ['L', 'T', 'P'].includes(item.class_type) ? item.class_type : 'L'
  return { ...item, key: `${index}-${item.subject || item.title}`, selected: true, class_type, color: getColorFromType(class_type) }
}
function cleanItem({ key, selected, class_type, color, ...item }, type) {
  return type === 'timetable' ? { ...item, class_type, color } : item
}
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
