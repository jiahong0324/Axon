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
import { logActivity } from '../lib/logActivity'
import { supabase } from '../lib/supabase'
import { dateLabel, markdownToHtml } from '../lib/utils'
import { SkeletonList } from '../components/SkeletonLoader'
import { useLanguage } from '../components/LanguageProvider'
import SubjectSelect from '../components/SubjectSelect'

const statuses = ['Pending', 'In Progress', 'Done']
const initialForm = { title: '', subject: '', deadline: '', priority: 'Medium', notes: '', status: 'Pending' }

export default function AssignmentPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [aiModal, setAiModal] = useState(false)
  const [aiText, setAiText] = useState('')
  const [form, setForm] = useState(initialForm)
  const [subjects, setSubjects] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { t } = useLanguage()

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('assignments').select('*').eq('user_id', user.id).order('deadline')
    setItems(data || [])
    
    const { data: classesData } = await supabase.from('classes').select('subject').eq('user_id', user.id)
    if (classesData) {
      setSubjects([...new Set(classesData.map(c => c.subject))])
    }
    
    setLoading(false)
  }

  async function addItem(e) {
    e.preventDefault()
    setIsSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('assignments').insert({ ...form, user_id: user.id })
    if (error) {
      setIsSubmitting(false)
      return showToast('Assignment could not be added.', 'error')
    }
    await logActivity('Added assignment', 'assignment', form.title)
    showToast('Assignment added.', 'success')
    setModal(false)
    setForm(initialForm)
    setIsSubmitting(false)
    fetchItems()
  }

  async function saveAll(items) {
    const { data: { user } } = await supabase.auth.getUser()
    const rows = items.map(item => ({ priority: 'Medium', status: 'Pending', notes: '', ...item, user_id: user.id }))
    const { error } = await supabase.from('assignments').insert(rows)
    if (error) return showToast('Could not save extracted assignments.', 'error')
    await Promise.all(rows.map(item => logActivity('Added assignment', 'assignment', item.title)))
    showToast('Extracted assignments saved.', 'success')
    setAnalyzerOpen(false)
    fetchItems()
  }

  async function updateItem(id, updates) {
    await supabase.from('assignments').update(updates).eq('id', id)
    const item = items.find(item => item.id === id)
    if (updates.status === 'Done' && item?.status !== 'Done') await logActivity('Completed assignment', 'assignment', item.title)
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  async function deleteItem(id) {
    if (!await confirm({ title: 'Delete assignment?', message: 'This assignment card will be removed.', confirmText: 'Delete' })) return
    await supabase.from('assignments').delete().eq('id', id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  async function clearAssignments() {
    if (!await confirm({ title: 'Clear assignments?', message: 'All assignments will be deleted. This cannot be undone.', confirmText: 'Clear' })) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('assignments').delete().eq('user_id', user.id)
    if (error) return showToast('Could not clear assignments.', 'error')
    setItems([])
    showToast('Assignments cleared.', 'success')
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
        <div className="flex items-center justify-between w-full">
          <h1 className="page-title mb-0">{t('assignments.title')}</h1>
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            {!loading && (
              <>
                <button className="md:hidden text-theme-400 hover:text-theme-300 hover:bg-theme-500/10 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0" onClick={() => setAnalyzerOpen(true)} title={t('assignments.extract')}>
                  <Sparkles className="h-5 w-5" />
                </button>
                <button className="md:hidden text-theme-400 hover:text-theme-300 hover:bg-theme-500/10 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0" onClick={() => setModal(true)} title={t('assignments.add')}>
                  <Plus className="h-5 w-5" />
                </button>
                <button className="md:hidden text-theme-400 hover:text-theme-300 hover:bg-theme-500/10 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0" onClick={prioritize} title={t('assignments.aiPlan')}>
                  <Bot className="h-5 w-5" />
                </button>

                <div className="hidden md:flex flex-row gap-2">
                  <button className="btn-import justify-center px-3 text-sm" onClick={() => setAnalyzerOpen(true)}><Sparkles className="h-4 w-4 shrink-0" /> <span className="truncate">{t('assignments.extract')}</span></button>
                  <button className="btn-add justify-center px-3 text-sm" onClick={() => setModal(true)}><Plus className="h-4 w-4 shrink-0" /> <span className="truncate">{t('assignments.add')}</span> <span className="h-5 w-px bg-white/25 mx-1" /><ChevronDown className="h-4 w-4 shrink-0" /></button>
                  <button className="btn-ghost justify-center px-3 text-sm" onClick={prioritize}><Bot className="h-4 w-4 shrink-0" /> {t('assignments.aiPlan')}</button>
                </div>

                {items.length > 0 && (
                  <button className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 ml-1" onClick={clearAssignments} title={t('assignments.clear')}>
                    <Trash2 className="h-5 w-5" /> <span className="text-sm font-medium hidden sm:block">{t('assignments.clear')}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <section className={`${!loading && items.length === 0 ? 'hidden md:grid md:grid-cols-3 md:gap-6' : 'flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-8'}`}>
        {statuses.map(status => {
          const column = items.filter(i => i.status === status)
          const isPending = status === 'Pending';
          const isInProgress = status === 'In Progress';
          
          const borderColor = isPending ? 'border-t-indigo-500' : isInProgress ? 'border-t-blue-500' : 'border-t-emerald-500';
          const headerAccent = isPending ? 'bg-indigo-500 text-white' : isInProgress ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white';
          const tKey = isPending ? 'assignments.pending' : isInProgress ? 'assignments.inProgress' : 'assignments.done';
          
          return (
            <div key={status} className={`flex flex-col h-full rounded-[28px] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.05] border-t-2 ${borderColor} shadow-2xl shadow-black/20 overflow-hidden backdrop-blur-md relative`}>
              
              <div className="p-6 pb-4 relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${headerAccent} text-sm font-bold`}>
                    {isPending ? '📋' : isInProgress ? '⚡' : '✅'}
                  </span>
                  <h2 className="font-bold text-white tracking-wide uppercase text-[15px]">{t(tKey) || status}</h2>
                </div>
                <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10 shadow-inner">{column.length}</span>
              </div>
              <div className="p-5 pt-2 flex-1 relative z-10">
                {loading ? <SkeletonList count={3} /> : column.length === 0 ? <EmptyState message={t('assignments.empty')} /> : <div className="space-y-4">{column.map(item => <AssignmentCard key={item.id} item={item} updateItem={updateItem} deleteItem={deleteItem} />)}</div>}
              </div>
            </div>
          )
        })}
      </section>
      {!loading && items.length === 0 && (
        <div className="mt-8 flex flex-col md:hidden items-center justify-center text-center px-4 py-16 border border-white/5 bg-white/[0.02] rounded-[32px]">
          <div className="w-16 h-16 bg-theme-500/20 text-theme-400 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">No assignments yet</h2>
          <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">Get started by importing your assignments from a screenshot, or add them manually.</p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button className="btn-import flex-1 justify-center py-3.5 text-[15px]" onClick={() => setAnalyzerOpen(true)}>
              <Sparkles className="h-5 w-5 shrink-0" /> <span>{t('assignments.extract')}</span>
            </button>
            <button className="btn-add flex-1 justify-center py-3.5 text-[15px]" onClick={() => setModal(true)}>
              <Plus className="h-5 w-5 shrink-0" /> <span>{t('assignments.add')}</span>
            </button>
          </div>
        </div>
      )}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Assignment">
        <form onSubmit={addItem} className="space-y-4">
          <Field label="Title"><input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Subject">
            <SubjectSelect 
              value={form.subject} 
              onChange={val => setForm({ ...form, subject: val })} 
              subjects={subjects} 
            />
          </Field>
          <Field label="Deadline"><input className="input" required type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></Field>
          <Field label="Priority"><select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Notes"><textarea className="input min-h-24" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <button disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Assignment'}</button>
        </form>
      </Modal>
      <Modal isOpen={aiModal} onClose={() => setAiModal(false)} title="AI Priority Plan">
        <div className="prose prose-invert max-w-none text-sm leading-6" dangerouslySetInnerHTML={{ __html: markdownToHtml(aiText) }} />
      </Modal>
      <Modal isOpen={analyzerOpen} onClose={() => setAnalyzerOpen(false)} title="Import Assignment Screenshot" maxWidth="max-w-5xl" bodyClassName="overflow-hidden">
        <ImageUploadAnalyzer type="assignment" onResult={saveAll} />
      </Modal>
      {ConfirmDialog}
    </main>
  )
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }

function AssignmentCard({ item, updateItem, deleteItem }) {
  const isDone = item.status === 'Done';
  return (
    <article className={`group relative rounded-2xl border p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] ${isDone ? 'bg-white/[0.01] border-white/5 opacity-50 hover:opacity-100 grayscale hover:grayscale-0' : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className={`font-semibold text-[16px] tracking-tight leading-snug ${isDone ? 'line-through text-slate-500' : 'text-slate-50'}`}>{item.title}</h3>
        <div className="shrink-0"><PriorityBadge priority={item.priority} /></div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-black/30 border border-white/10 text-slate-300 text-[11px] font-bold tracking-wide uppercase">{item.subject}</span>
        <span className="text-slate-600 text-sm">•</span>
        <span className="text-slate-400 flex items-center gap-1.5"><CountdownBadge deadline={item.deadline} status={item.status} /></span>
      </div>

      {item.notes && (
        <div className="mb-4 rounded-xl bg-black/20 p-3.5 border border-white/5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10 rounded-l-xl"></div>
          <p className="text-[13px] text-slate-400 line-clamp-3 leading-relaxed pl-1">{item.notes}</p>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {statuses.filter(s => s !== item.status).map(s => {
            const btnClass = s === 'Done' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/40' : 
                             s === 'In Progress' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20 hover:border-blue-500/40' : 
                             'bg-white/5 text-slate-300 hover:bg-white/10 border-white/10 hover:border-white/20';
            return (
              <button 
                key={s} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all duration-200 ${btnClass}`} 
                onClick={() => updateItem(item.id, { status: s })}
              >
                {s === 'Done' && <Check className="h-3.5 w-3.5" />}
                {s === 'In Progress' && <Sparkles className="h-3.5 w-3.5" />}
                {s}
              </button>
            )
          })}
        </div>
        <button 
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" 
          onClick={() => deleteItem(item.id)}
          title="Delete Assignment"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}
