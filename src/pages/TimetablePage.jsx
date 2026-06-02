import { ChevronDown, ChevronLeft, ChevronRight, MapPin, Plus, Sparkles, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import ClassTypeBadge from '../components/ClassTypeBadge'
import { useConfirmDialog } from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import ImageUploadAnalyzer from '../components/ImageUploadAnalyzer'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { logActivity } from '../lib/logActivity'
import { supabase } from '../lib/supabase'
import { classColors, days, formatTime } from '../lib/utils'

const initialForm = { subject: '', day: 'Monday', start_time: '09:00', end_time: '10:00', lecturer: '', classroom: '', class_type: 'L', color: 'blue' }

export default function TimetablePage() {
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(initialForm)
  const [showForm, setShowForm] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [mobileDay, setMobileDay] = useState(0)
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  useEffect(() => { fetchClasses() }, [])
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setShowForm(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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
    await logActivity('Added class', 'class', form.subject)
    showToast('Class added.', 'success')
    setForm(initialForm)
    setShowForm(false)
    fetchClasses()
  }

  async function saveAll(items) {
    const { data: { user } } = await supabase.auth.getUser()
    const rows = items.map(item => ({ ...item, user_id: user.id, color: item.color || classColors[item.class_type] || 'blue' }))
    const { error } = await supabase.from('classes').insert(rows)
    if (error) return showToast('Could not save extracted classes.', 'error')
    await Promise.all(rows.map(item => logActivity('Added class', 'class', item.subject)))
    showToast('Extracted classes saved.', 'success')
    setAnalyzerOpen(false)
    fetchClasses()
  }

  async function deleteClass(id) {
    if (!await confirm({ title: 'Delete class?', message: 'This class will be removed from your timetable.', confirmText: 'Delete' })) return
    const deleted = classes.find(c => c.id === id)
    await supabase.from('classes').delete().eq('id', id)
    if (deleted) await logActivity('Deleted class', 'class', deleted.subject)
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
          <button className="btn-import w-full md:w-auto" onClick={() => setAnalyzerOpen(true)}><Sparkles className="h-4 w-4" /> Import Screenshot</button>
          <button className="btn-add w-full md:w-auto" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add Class <span className="h-5 w-px bg-white/25" /><ChevronDown className="h-4 w-4" /></button>
        </div>
      </div>
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Class">
        <form onSubmit={addClass} className="space-y-4">
          <Field label="Subject"><input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Day"><select className="input" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{days.map(d => <option key={d}>{d}</option>)}</select></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Start Time"><input className="input" type="time" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></Field>
            <Field label="End Time"><input className="input" type="time" required value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></Field>
          </div>
          <Field label="Class Type">
            <div className="grid grid-cols-3 gap-2">{['L', 'T', 'P'].map(type => <button type="button" key={type} onClick={() => updateType(type)} className={`font-medium rounded-xl border px-1 py-3 text-[13px] sm:text-sm tracking-tight truncate ${form.class_type === type ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-white/10 text-slate-400'}`}>{type === 'L' ? 'Lecture' : type === 'T' ? 'Tutorial' : 'Practical'}</button>)}</div>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Classroom"><input className="input" placeholder="e.g. DK1" value={form.classroom} onChange={e => setForm({ ...form, classroom: e.target.value })} /></Field>
            <Field label="Lecturer"><input className="input" placeholder="Name" value={form.lecturer} onChange={e => setForm({ ...form, lecturer: e.target.value })} /></Field>
          </div>
          <button className="btn-primary w-full mt-2">Save Class</button>
        </form>
      </Modal>
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <button className="btn-ghost px-3" onClick={() => setMobileDay(v => Math.max(0, v - 1))}><ChevronLeft className="h-4 w-4" /></button>
        <div className="scrollbar-hide flex flex-1 gap-2 overflow-x-auto">
          {days.map((day, index) => <button key={day} onClick={() => setMobileDay(index)} className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm ${mobileDay === index ? 'bg-blue-500 text-white' : 'border border-white/10 text-slate-400'}`}>{day.slice(0, 3)}</button>)}
        </div>
        <button className="btn-ghost px-3" onClick={() => setMobileDay(v => Math.min(days.length - 1, v + 1))}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="pb-3">
        <section className="grid gap-4 md:grid-cols-5">
          {days.map(day => {
            const dayClasses = classes.filter(c => c.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
            return (
              <div key={day} className={`card min-h-[360px] ${days[mobileDay] === day ? '' : 'hidden md:block'}`}>
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
      <Modal isOpen={analyzerOpen} onClose={() => setAnalyzerOpen(false)} title="Import Timetable from Screenshot" maxWidth="max-w-6xl" bodyClassName="overflow-hidden">
        <ImageUploadAnalyzer type="timetable" onResult={saveAll} />
      </Modal>
      {ConfirmDialog}
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
      <p className="muted">{formatTime(item.start_time)} - {formatTime(item.end_time)}</p>
      <p className="muted mt-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> {item.classroom || 'TBA'}</p>
      <p className="muted mt-1 flex items-center gap-2"><User className="h-4 w-4" /> {item.lecturer || 'TBA'}</p>
    </article>
  )
}
