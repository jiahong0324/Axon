import { ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Plus, Sparkles, Trash2, User } from 'lucide-react'
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
import { SkeletonTimetable } from '../components/SkeletonLoader'
import { useLanguage } from '../components/LanguageProvider'

const initialForm = { subject: '', day: 'Monday', start_time: '09:00', end_time: '10:00', lecturer: '', classroom: '', class_type: 'L', color: 'blue' }

export default function TimetablePage() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [showForm, setShowForm] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [mobileDay, setMobileDay] = useState(() => {
    const day = new Date().getDay()
    return day >= 1 && day <= 5 ? day - 1 : 0
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { t } = useLanguage()

  useEffect(() => { fetchClasses() }, [])
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setShowForm(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function fetchClasses() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('classes').select('*').eq('user_id', user.id)
    setClasses(data || [])
    setLoading(false)
  }

  async function addClass(e) {
    e?.preventDefault()
    setIsSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('classes').insert({ ...form, user_id: user.id })
    if (error) {
      setIsSubmitting(false)
      return showToast('Class could not be added.', 'error')
    }
    await logActivity('Added class', 'class', form.subject)
    showToast('Class added.', 'success')
    setForm(initialForm)
    setShowForm(false)
    setIsSubmitting(false)
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

  async function clearTimetable() {
    if (!await confirm({ title: 'Clear timetable?', message: 'All classes will be deleted. This cannot be undone.', confirmText: 'Clear' })) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('classes').delete().eq('user_id', user.id)
    if (error) return showToast('Could not clear timetable.', 'error')
    setClasses([])
    showToast('Timetable cleared.', 'success')
  }

  function updateType(type) {
    setForm(prev => ({ ...prev, class_type: type, color: classColors[type] }))
  }

  return (
    <main className="main-content">
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center justify-between">
          <h1 className="page-title mb-0">{t('timetable.title')}</h1>
          {!loading && classes.length > 0 && (
            <button className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors flex md:hidden items-center justify-center gap-2 shrink-0" onClick={clearTimetable}>
              <Trash2 className="h-4 w-4" /> <span className="text-sm">Clear</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary" onClick={() => setAnalyzerOpen(true)}><Sparkles className="h-4 w-4 text-theme-500" /> <span className="hidden sm:inline">{t('timetable.extract')}</span><span className="sm:hidden">Extract</span></button>
          <button className="btn-primary" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('timetable.add')}</span><span className="sm:hidden">Add</span></button>
          {!loading && classes.length > 0 && (
            <button className="hidden md:flex text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 h-[48px] w-[48px] rounded-lg transition-colors items-center justify-center shrink-0" onClick={clearTimetable} title="Clear All Classes">
              <Trash2 className="h-5 w-5" />
            </button>
          )}
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
            <div className="grid grid-cols-3 gap-2">{['L', 'T', 'P'].map(type => <button type="button" key={type} onClick={() => updateType(type)} className={`font-medium rounded-xl border px-1 py-3 text-[13px] sm:text-sm tracking-tight truncate ${form.class_type === type ? 'border-theme-500 bg-theme-500/20 text-theme-400' : 'border-white/10 text-slate-400'}`}>{type === 'L' ? 'Lecture' : type === 'T' ? 'Tutorial' : 'Practical'}</button>)}</div>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Classroom"><input className="input" placeholder="e.g. DK1" value={form.classroom} onChange={e => setForm({ ...form, classroom: e.target.value })} /></Field>
            <Field label="Lecturer"><input className="input" placeholder="Name" value={form.lecturer} onChange={e => setForm({ ...form, lecturer: e.target.value })} /></Field>
          </div>
          <button disabled={isSubmitting} className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Class'}</button>
        </form>
      </Modal>
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <button className="btn-ghost px-3" onClick={() => setMobileDay(v => Math.max(0, v - 1))}><ChevronLeft className="h-4 w-4" /></button>
        <div className="scrollbar-hide flex flex-1 gap-2 overflow-x-auto">
          {days.map((day, index) => <button key={day} onClick={() => setMobileDay(index)} className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm ${mobileDay === index ? 'bg-theme-500 text-white' : 'border border-white/10 text-slate-400'}`}>{day.slice(0, 3)}</button>)}
        </div>
        <button className="btn-ghost px-3" onClick={() => setMobileDay(v => Math.min(days.length - 1, v + 1))}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="pb-3">
        {loading ? <SkeletonTimetable /> : (
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
        )}
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
  const styles = {
    L: {
      from: 'from-blue-500/10',
      to: 'to-blue-600/5',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      shadow: 'hover:shadow-[0_8px_30px_-12px_rgba(59,130,246,0.3)]'
    },
    T: {
      from: 'from-emerald-500/10',
      to: 'to-emerald-600/5',
      text: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      shadow: 'hover:shadow-[0_8px_30px_-12px_rgba(16,185,129,0.3)]'
    },
    P: {
      from: 'from-violet-500/10',
      to: 'to-violet-600/5',
      text: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
      shadow: 'hover:shadow-[0_8px_30px_-12px_rgba(139,92,246,0.3)]'
    }
  }

  const s = styles[item.class_type] || styles.L

  return (
    <article className={`group relative flex h-full min-h-[160px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${s.from} ${s.to} p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-slate-800/50 ${s.shadow}`}>
      
      {/* Subtle glossy highlight */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <button className="btn-danger absolute right-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Top Header: Time and Badge */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex flex-col pr-6">
            <span className={`font-black text-[22px] tracking-tight leading-none ${s.text} drop-shadow-sm`}>
              {formatTime(item.start_time)}
            </span>
            <span className="mt-1 font-medium text-xs text-slate-400 opacity-80">
              until {formatTime(item.end_time)}
            </span>
          </div>
          <div className="shrink-0"><ClassTypeBadge type={item.class_type} /></div>
        </div>

        {/* Body: Subject */}
        <h3 className="mb-4 text-[15px] font-bold leading-snug text-slate-100">
          {item.subject}
        </h3>

        {/* Footer: Details */}
        <div className="mt-auto space-y-2 border-t border-white/5 pt-3">
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.iconBg}`}>
              <MapPin className={`h-3.5 w-3.5 ${s.text}`} />
            </div>
            <span className="truncate font-medium leading-tight">{item.classroom || 'TBA'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.iconBg}`}>
              <User className={`h-3.5 w-3.5 ${s.text}`} />
            </div>
            <span className="truncate font-medium leading-tight">{item.lecturer || 'TBA'}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
