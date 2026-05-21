import { Camera, ChevronDown, MapPin, Plus, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import ClassTypeBadge from '../components/ClassTypeBadge'
import EmptyState from '../components/EmptyState'
import ImageUploadAnalyzer from '../components/ImageUploadAnalyzer'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { classColors, days } from '../lib/utils'

const initialForm = { subject: '', day: 'Monday', start_time: '09:00', end_time: '10:00', lecturer: '', classroom: '', class_type: 'L', color: 'blue' }

export default function TimetablePage() {
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(initialForm)
  const [showForm, setShowForm] = useState(true)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const { showToast } = useToast()

  useEffect(() => { fetchClasses() }, [])

  async function fetchClasses() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('classes').select('*').eq('user_id', user.id)
    setClasses(data || [])
  }

  async function addClass(e) {
    e?.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('classes').insert({ ...form, user_id: user.id })
    if (error) return showToast('Class could not be added.', 'error')
    showToast('Class added.', 'success')
    setForm(initialForm)
    fetchClasses()
  }

  async function saveAll(items) {
    const { data: { user } } = await supabase.auth.getUser()
    const rows = items.map(item => ({ ...item, user_id: user.id, color: classColors[item.class_type] || 'blue' }))
    const { error } = await supabase.from('classes').insert(rows)
    if (error) return showToast('Could not save extracted classes.', 'error')
    showToast('Extracted classes saved.', 'success')
    setAnalyzerOpen(false)
    fetchClasses()
  }

  async function deleteClass(id) {
    if (!window.confirm('Delete this class?')) return
    await supabase.from('classes').delete().eq('id', id)
    setClasses(prev => prev.filter(c => c.id !== id))
    showToast('Class deleted.', 'success')
  }

  function updateType(type) {
    setForm(prev => ({ ...prev, class_type: type, color: classColors[type] }))
  }

  return (
    <main className="main-content">
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="page-title mb-0">Timetable</h1>
        <div className="flex flex-wrap gap-3">
          <button className="btn-ghost" onClick={() => setShowForm(v => !v)}><ChevronDown className="h-4 w-4" /> Add Class</button>
          <button className="btn-primary" onClick={() => setAnalyzerOpen(true)}><Camera className="h-4 w-4" /> Upload Screenshot</button>
        </div>
      </div>
      {showForm && (
        <form onSubmit={addClass} className="card mb-6 grid gap-4 md:grid-cols-4">
          <Field label="Subject"><input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Day"><select className="input" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{days.map(d => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Start Time"><input className="input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></Field>
          <Field label="End Time"><input className="input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></Field>
          <Field label="Class Type">
            <div className="grid grid-cols-3 gap-2">{['L', 'T', 'P'].map(type => <button type="button" key={type} onClick={() => updateType(type)} className={`rounded-xl border px-2 py-3 text-sm ${form.class_type === type ? 'border-blue-500 bg-blue-500/20' : 'border-white/10'}`}>{type}</button>)}</div>
          </Field>
          <Field label="Lecturer"><input className="input" value={form.lecturer} onChange={e => setForm({ ...form, lecturer: e.target.value })} /></Field>
          <Field label="Classroom"><input className="input" value={form.classroom} onChange={e => setForm({ ...form, classroom: e.target.value })} /></Field>
          <div className="flex items-end"><button className="btn-primary w-full"><Plus className="h-4 w-4" /> Save Class</button></div>
        </form>
      )}
      <div className="overflow-x-auto pb-3">
        <section className="grid min-w-[920px] gap-4 md:min-w-0 md:grid-cols-5">
          {days.map(day => {
            const dayClasses = classes.filter(c => c.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
            return (
              <div key={day} className="card min-h-[360px]">
                <h2 className="mb-4 font-semibold">{day}</h2>
                {dayClasses.length === 0 ? <EmptyState emoji="·" message="Free day" /> : (
                  <div className="space-y-3">
                    {dayClasses.map(c => <ClassTile key={c.id} item={c} onDelete={() => deleteClass(c.id)} />)}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </div>
      <Modal isOpen={analyzerOpen} onClose={() => setAnalyzerOpen(false)} title="Upload Timetable Screenshot" maxWidth="max-w-2xl">
        <ImageUploadAnalyzer type="timetable" onResult={saveAll} />
      </Modal>
    </main>
  )
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }

function ClassTile({ item, onDelete }) {
  const border = item.class_type === 'T' ? 'border-l-green-500' : item.class_type === 'P' ? 'border-l-purple-500' : 'border-l-blue-500'
  return (
    <article className={`group relative rounded-xl border border-l-4 border-white/10 ${border} p-3`}>
      <button className="btn-danger absolute right-1 top-1 opacity-0 group-hover:opacity-100" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
      <div className="mb-2 pr-10"><ClassTypeBadge type={item.class_type} /></div>
      <h3 className="font-semibold">{item.subject}</h3>
      <p className="muted">{item.start_time} - {item.end_time}</p>
      <p className="muted mt-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> {item.classroom || 'TBA'}</p>
      <p className="muted mt-1 flex items-center gap-2"><User className="h-4 w-4" /> {item.lecturer || 'TBA'}</p>
    </article>
  )
}
