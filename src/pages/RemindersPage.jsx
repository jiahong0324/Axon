import { Bell, Bot, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { useConfirmDialog } from '../components/ConfirmModal'
import ToggleSwitch from '../components/ToggleSwitch'
import { useToast } from '../components/Toast'
import { buildUserContext } from '../lib/buildUserContext'
import { askGroq } from '../lib/groq'
import { supabase } from '../lib/supabase'
import { markdownToHtml } from '../lib/utils'

const initialForm = { title: '', reminder_time: '09:00', repeat_type: 'once', is_active: true }

export default function RemindersPage() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [plan, setPlan] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  useEffect(() => { fetchItems(); requestPermission() }, [])
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setShowForm(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
  }

  async function fetchItems() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('reminders').select('*').eq('user_id', user.id).order('reminder_time')
    setItems(data || [])
  }

  async function addItem(e) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('reminders').insert({ ...form, user_id: user.id })
    if (error) return showToast('Reminder could not be added.', 'error')
    setForm(initialForm)
    setShowForm(false)
    fetchItems()
  }

  async function updateItem(id, updates) {
    await supabase.from('reminders').update(updates).eq('id', id)
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  async function deleteItem(id) {
    if (!await confirm({ title: 'Delete reminder?', message: 'This reminder will be removed.', confirmText: 'Delete' })) return
    await supabase.from('reminders').delete().eq('id', id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  async function generatePlan() {
    setPlanLoading(true)
    try {
      const context = await buildUserContext()
      setPlan(await askGroq('Create a practical hour-by-hour study schedule for today from 8am to 10pm. Include breaks. Be specific and encouraging.', context))
    } catch {
      setPlan('Could not generate a plan right now. Try again after checking your Groq API key.')
    } finally {
      setPlanLoading(false)
    }
  }

  return (
    <main className="main-content">
      <h1 className="page-title">Smart Reminders</h1>
      <section className="card mb-6 border-l-4 border-l-purple-500">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h2 className="section-header mb-0"><Bot className="h-5 w-5 text-purple-400" /> AI Daily Study Plan</h2>
          <button className="btn-plan" onClick={generatePlan}>Generate Today's Plan</button>
        </div>
        {planLoading ? <div className="skeleton h-36 rounded-xl" /> : plan ? <div className="scrollbar-hide max-h-96 overflow-y-auto text-sm leading-6" dangerouslySetInnerHTML={{ __html: markdownToHtml(plan) }} /> : <p className="muted">Generate a practical study plan based on today’s classes, assignments, exams, and reminders.</p>}
      </section>
      <section className="card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="section-header mb-0"><Bell className="h-5 w-5 text-blue-400" /> My Reminders</h2>
          <button className={showForm ? 'btn-ghost border-red-500/30 text-red-300' : 'btn-add'} onClick={() => setShowForm(v => !v)}>{showForm ? '✕ Cancel' : <><Plus className="h-4 w-4" /> Add Reminder <span className="h-5 w-px bg-white/25" /><ChevronDown className="h-4 w-4" /></>}</button>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showForm ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <form onSubmit={addItem} className="mb-5 grid gap-3 md:grid-cols-4">
            <input className="input md:col-span-2" required placeholder="Reminder title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input className="input" type="time" value={form.reminder_time} onChange={e => setForm({ ...form, reminder_time: e.target.value })} />
            <select className="input" value={form.repeat_type} onChange={e => setForm({ ...form, repeat_type: e.target.value })}>{['once', 'daily', 'weekly'].map(t => <option key={t}>{t}</option>)}</select>
            <button className="btn-primary md:col-span-4">Save Reminder</button>
          </form>
        </div>
        {items.length === 0 ? <EmptyState emoji="🔔" message="No reminders yet." /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map(item => (
              <article key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-4">
                <Bell className={`h-5 w-5 ${item.is_active ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="flex-1"><p className="font-semibold">{item.title}</p><p className="muted">{item.reminder_time || 'No time'} · {item.repeat_type}</p></div>
                <ToggleSwitch isOn={item.is_active} onToggle={() => updateItem(item.id, { is_active: !item.is_active })} />
                <button className="btn-danger" onClick={() => deleteItem(item.id)}><Trash2 className="h-4 w-4" /></button>
              </article>
            ))}
          </div>
        )}
      </section>
      {ConfirmDialog}
    </main>
  )
}
