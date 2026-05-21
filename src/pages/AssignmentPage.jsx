import { Bot, Check, ChevronDown, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import CountdownBadge from '../components/CountdownBadge'
import { useConfirmDialog } from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import ImageUploadAnalyzer from '../components/ImageUploadAnalyzer'
import Modal from '../components/Modal'
import PriorityBadge from '../components/PriorityBadge'
import { useToast } from '../components/Toast'
import { buildUserContext } from '../lib/buildUserContext'
import { askGroq } from '../lib/groq'
import { supabase } from '../lib/supabase'
import { dateLabel, markdownToHtml } from '../lib/utils'

const statuses = ['Pending', 'In Progress', 'Done']
const initialForm = { title: '', subject: '', deadline: '', priority: 'Medium', notes: '', status: 'Pending' }

export default function AssignmentPage() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [aiModal, setAiModal] = useState(false)
  const [aiText, setAiText] = useState('')
  const [form, setForm] = useState(initialForm)
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('assignments').select('*').eq('user_id', user.id).order('deadline')
    setItems(data || [])
  }

  async function addItem(e) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('assignments').insert({ ...form, user_id: user.id })
    if (error) return showToast('Assignment could not be added.', 'error')
    showToast('Assignment added.', 'success')
    setModal(false)
    setForm(initialForm)
    fetchItems()
  }

  async function saveAll(items) {
    const { data: { user } } = await supabase.auth.getUser()
    const rows = items.map(item => ({ priority: 'Medium', status: 'Pending', notes: '', ...item, user_id: user.id }))
    const { error } = await supabase.from('assignments').insert(rows)
    if (error) return showToast('Could not save extracted assignments.', 'error')
    showToast('Extracted assignments saved.', 'success')
    setAnalyzerOpen(false)
    fetchItems()
  }

  async function updateItem(id, updates) {
    await supabase.from('assignments').update(updates).eq('id', id)
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  async function deleteItem(id) {
    if (!await confirm({ title: 'Delete assignment?', message: 'This assignment card will be removed.', confirmText: 'Delete' })) return
    await supabase.from('assignments').delete().eq('id', id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  async function prioritize() {
    setAiModal(true)
    setAiText('Thinking...')
    try {
      const context = await buildUserContext()
      const text = await askGroq('Rank these assignments by what I should do first, with a brief reason each. Format as numbered list.', context)
      setAiText(text)
    } catch {
      setAiText('Could not reach the AI service right now.')
    }
  }

  return (
    <main className="main-content">
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="page-title mb-0">Assignments</h1>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap"><button className="btn-import" onClick={() => setAnalyzerOpen(true)}><Sparkles className="h-4 w-4" /> Import Screenshot</button><button className="btn-add" onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Add Assignment <span className="h-5 w-px bg-white/25" /><ChevronDown className="h-4 w-4" /></button><button className="btn-ghost" onClick={prioritize}><Bot className="h-4 w-4" /> What should I do first?</button></div>
      </div>
      <section className="flex flex-col gap-4 md:grid md:grid-cols-3">
        {statuses.map(status => {
          const column = items.filter(i => i.status === status)
          return (
            <div key={status} className="card min-h-[420px]">
              <h2 className="mb-4 font-semibold">{status === 'Pending' ? '📋' : status === 'In Progress' ? '⚡' : '✅'} {status}</h2>
              {column.length === 0 ? <EmptyState message="No assignments here." /> : <div className="space-y-3">{column.map(item => <AssignmentCard key={item.id} item={item} updateItem={updateItem} deleteItem={deleteItem} />)}</div>}
            </div>
          )
        })}
      </section>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Assignment">
        <form onSubmit={addItem} className="space-y-4">
          <Field label="Title"><input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Subject"><input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Deadline"><input className="input" required type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></Field>
          <Field label="Priority"><select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Notes"><textarea className="input min-h-24" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <button className="btn-primary w-full">Save Assignment</button>
        </form>
      </Modal>
      <Modal isOpen={aiModal} onClose={() => setAiModal(false)} title="AI Priority Plan">
        <div className="prose prose-invert max-w-none text-sm leading-6" dangerouslySetInnerHTML={{ __html: markdownToHtml(aiText) }} />
      </Modal>
      <Modal isOpen={analyzerOpen} onClose={() => setAnalyzerOpen(false)} title="Import Assignment Screenshot" maxWidth="max-w-2xl">
        <ImageUploadAnalyzer type="assignment" onResult={saveAll} />
      </Modal>
      {ConfirmDialog}
    </main>
  )
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }

function AssignmentCard({ item, updateItem, deleteItem }) {
  return (
    <article className="rounded-xl border border-white/10 p-4">
      <div className="mb-2 flex items-start justify-between gap-2"><h3 className="font-semibold">{item.title}</h3><PriorityBadge priority={item.priority} /></div>
      <p className="muted mb-2">{item.subject} · {dateLabel(item.deadline)}</p>
      <CountdownBadge deadline={item.deadline} />
      {item.notes && <p className="mt-3 line-clamp-3 text-sm text-slate-400">{item.notes}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {statuses.filter(s => s !== item.status).map(s => <button key={s} className="btn-ghost px-3 py-2 text-xs" onClick={() => updateItem(item.id, { status: s })}>{s === 'Done' && <Check className="h-3 w-3" />}{s}</button>)}
        <button className="btn-danger ml-auto" onClick={() => deleteItem(item.id)}><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  )
}
