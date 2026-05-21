import { Camera, Check, ImagePlus, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { analyzeImageWithGroq } from '../lib/groq'
import { useToast } from './Toast'

const TIMETABLE_PROMPT = `
Analyze this university timetable image carefully. Extract ALL classes and return them as a JSON array only, no other text.
Each object must have these exact fields:
{
  "subject": "string",
  "day": "Monday|Tuesday|Wednesday|Thursday|Friday",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "lecturer": "string or empty string",
  "classroom": "string or empty string",
  "class_type": "L|T|P"
}
Return ONLY valid JSON array. No markdown, no explanation.`

const EXAM_PROMPT = `
Analyze this university exam timetable image. Extract ALL exams and return as a JSON array only, no other text.
Each object must have:
{
  "subject": "string",
  "exam_date": "YYYY-MM-DD",
  "exam_type": "Quiz|Midterm|Final|Assignment",
  "venue": "string or empty string",
  "notes": "string or empty string"
}
Return ONLY valid JSON array. No markdown, no explanation.`

const ASSIGNMENT_PROMPT = `
Analyze this university assignment or coursework screenshot. Extract ALL assignments and return as a JSON array only, no other text.
Each object must have:
{
  "title": "string",
  "subject": "string",
  "deadline": "YYYY-MM-DD",
  "priority": "High|Medium|Low",
  "notes": "string or empty string",
  "status": "Pending"
}
Return ONLY valid JSON array. No markdown, no explanation.`

export default function ImageUploadAnalyzer({ type, onResult }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleFile(file) {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setItems([])
    setLoading(true)
    try {
      const base64 = await toBase64(file)
      const prompt = type === 'exam' ? EXAM_PROMPT : type === 'assignment' ? ASSIGNMENT_PROMPT : TIMETABLE_PROMPT
      const raw = await analyzeImageWithGroq(base64, file.type, prompt)
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setItems(Array.isArray(parsed) ? parsed : [])
      showToast(`Found ${Array.isArray(parsed) ? parsed.length : 0} item(s).`, 'success')
    } catch (error) {
      showToast('AI could not parse this image. Try a clearer screenshot.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }}
        onDragOver={e => e.preventDefault()}
        className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-blue-500/40 bg-blue-500/5 p-5 text-center hover:bg-blue-500/10"
      >
        <ImagePlus className="mb-3 h-10 w-10 text-blue-400" />
        <span className="font-semibold">Upload or drop a screenshot</span>
        <span className="muted mt-1">PNG, JPG, or WEBP timetable image</span>
      </button>
      <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} />
      {preview && (
        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-300">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {loading ? 'AI is analysing this image...' : 'Image analysed'}
          </div>
          <img src={preview} alt="Uploaded preview" className="max-h-72 w-full rounded-xl object-contain" />
        </div>
      )}
      {items.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold">Confirm extracted items</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {items.map((item, index) => (
              <div key={`${item.subject}-${index}`} className="rounded-xl border border-white/10 p-3 text-sm">
                <p className="font-semibold">{item.subject}</p>
                <p className="muted">{type === 'exam' ? `${item.exam_type} on ${item.exam_date} at ${item.venue || 'TBA'}` : type === 'assignment' ? `${item.subject} due ${item.deadline}` : `${item.day} ${item.start_time}-${item.end_time} at ${item.classroom || 'TBA'}`}</p>
              </div>
            ))}
          </div>
          <button className="btn-primary w-full" onClick={() => onResult(items)}>
            <Check className="h-4 w-4" /> Confirm & Save All
          </button>
        </div>
      )}
    </div>
  )
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
