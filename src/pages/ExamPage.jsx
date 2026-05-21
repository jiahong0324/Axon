import { Camera, MapPin, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ImageUploadAnalyzer from '../components/ImageUploadAnalyzer'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { dateLabel, daysFromToday } from '../lib/utils'

const initialForm = { subject: '', exam_date: '', exam_type: 'Final', venue: '', notes: '' }

export default function ExamPage() {
  const [exams, setExams] = useState([])
  const [modal, setModal] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const { showToast } = useToast()

  useEffect(() => { fetchExams() }, [])

  async function fetchExams() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('exams').select('*').eq('user_id', user.id).order('exam_date')
    setExams(data || [])
  }

  async function addExam(e) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('exams').insert({ ...form, user_id: user.id })
    if (error) return showToast('Exam could not be added.', 'error')
    showToast('Exam added.', 'success')
    setModal(false)
    setForm(initialForm)
    fetchExams()
  }

  async function saveAll(items) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('exams').insert(items.map(item => ({ ...item, user_id: user.id })))
    if (error) return showToast('Could not save extracted exams.', 'error')
    showToast('Extracted exams saved.', 'success')
    setAnalyzerOpen(false)
    fetchExams()
  }

  async function deleteExam(id) {
    if (!window.confirm('Delete this exam?')) return
    await supabase.from('exams').delete().eq('id', id)
    setExams(prev => prev.filter(e => e.id !== id))
  }

  const upcoming = exams.filter(e => daysFromToday(e.exam_date) >= 0)
  const past = exams.filter(e => daysFromToday(e.exam_date) < 0)

  return (
    <main className="main-content">
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="page-title mb-0">Exam Planner</h1>
        <div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Add Exam</button><button className="btn-ghost" onClick={() => setAnalyzerOpen(true)}><Camera className="h-4 w-4" /> Upload Exam Schedule</button></div>
      </div>
      <ExamSection title="Upcoming" exams={upcoming} deleteExam={deleteExam} />
      <ExamSection title="Past" exams={past} deleteExam={deleteExam} />
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Exam">
        <form onSubmit={addExam} className="space-y-4">
          <Field label="Subject"><input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Exam Date"><input className="input" required type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })} /></Field>
          <Field label="Exam Type"><select className="input" value={form.exam_type} onChange={e => setForm({ ...form, exam_type: e.target.value })}>{['Quiz', 'Midterm', 'Final', 'Assignment'].map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Venue"><input className="input" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></Field>
          <Field label="Notes"><textarea className="input min-h-24" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <button className="btn-primary w-full">Save Exam</button>
        </form>
      </Modal>
      <Modal isOpen={analyzerOpen} onClose={() => setAnalyzerOpen(false)} title="Upload Exam Screenshot" maxWidth="max-w-2xl">
        <ImageUploadAnalyzer type="exam" onResult={saveAll} />
      </Modal>
    </main>
  )
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }

function ExamSection({ title, exams, deleteExam }) {
  return (
    <section className="mb-6">
      <h2 className="section-header">{title}</h2>
      {exams.length === 0 ? <div className="card"><EmptyState emoji="📖" message={`No ${title.toLowerCase()} exams.`} /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {exams.map(exam => <ExamCard key={exam.id} exam={exam} deleteExam={deleteExam} />)}
        </div>
      )}
    </section>
  )
}

function ExamCard({ exam, deleteExam }) {
  const days = daysFromToday(exam.exam_date)
  const color = days < 0 ? 'text-slate-400' : days <= 7 ? 'text-red-400' : days <= 14 ? 'text-yellow-400' : 'text-green-400'
  const label = days < 0 ? 'Completed' : days === 0 ? 'Today' : `${days} days`
  return (
    <article className="card grid gap-4 md:grid-cols-[1fr_auto]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold">{exam.subject}</h3><span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">{exam.exam_type}</span></div>
        <p className="muted">{dateLabel(exam.exam_date)}</p>
        <p className="muted mt-3 flex items-center gap-2"><MapPin className="h-4 w-4" /> {exam.venue || 'TBA'}</p>
        {exam.notes && <p className="mt-3 text-sm text-slate-400">{exam.notes}</p>}
      </div>
      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
        <p className={`text-lg font-bold ${color}`}>{label}</p>
        <button className="btn-danger" onClick={() => deleteExam(exam.id)}><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  )
}
