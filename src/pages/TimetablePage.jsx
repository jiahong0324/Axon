import { ChevronDown, MapPin, Plus, Sparkles, Trash2, User } from 'lucide-react'
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
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <button className="btn-import w-full md:w-auto" onClick={() => setAnalyzerOpen(true)}>
            <Sparkles className="h-4 w-4" /> {t('timetable.extract')}
          </button>
          <button className="btn-add w-full md:w-auto" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> {t('timetable.addClass')} <span className="h-5 w-px bg-white/25" /><ChevronDown className="h-4 w-4" />
          </button>
          {!loading && classes.length > 0 && (
            <button className="hidden md:flex text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 h-[48px] w-[48px] rounded-lg transition-colors items-center justify-center shrink-0" onClick={clearTimetable} title="Clear All Classes">
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={t('timetable.addClass')}>
        <form onSubmit={addClass} className="space-y-4">
          <Field label={t('timetable.subject')}><input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label={t('timetable.day')}><select className="input" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{days.map(d => <option key={d} value={d}>{t(`timetable.days.${d}`)}</option>)}</select></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('timetable.startTime')}><input className="input" type="time" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></Field>
            <Field label={t('timetable.endTime')}><input className="input" type="time" required value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></Field>
          </div>
          <Field label={t('timetable.classType')}>
            <div className="grid grid-cols-3 gap-2">{['L', 'T', 'P'].map(type => <button type="button" key={type} onClick={() => updateType(type)} className={`font-medium rounded-xl border px-1 py-3 text-[13px] sm:text-sm tracking-tight truncate ${form.class_type === type ? 'border-theme-500 bg-theme-500/20 text-theme-400' : 'border-white/10 text-slate-400'}`}>{type === 'L' ? t('timetable.lecture') : type === 'T' ? t('timetable.tutorial') : t('timetable.practical')}</button>)}</div>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('timetable.classroom')}><input className="input" placeholder="e.g. DK1" value={form.classroom} onChange={e => setForm({ ...form, classroom: e.target.value })} /></Field>
            <Field label={t('timetable.lecturer')}><input className="input" placeholder="Name" value={form.lecturer} onChange={e => setForm({ ...form, lecturer: e.target.value })} /></Field>
          </div>
          <button disabled={isSubmitting} className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : t('timetable.saveClass')}</button>
        </form>
      </Modal>
      <div className="mb-4 flex w-full items-center justify-center md:hidden">
        <div className="flex w-full gap-1.5 px-2">
          {days.map((day, index) => <button key={day} onClick={() => setMobileDay(index)} className={`min-h-[44px] flex-1 rounded-full font-bold text-sm border transition-colors ${mobileDay === index ? 'border-theme-500 bg-theme-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t(`timetable.days.${day}`).slice(0, 3)}</button>)}
        </div>
      </div>
      <div className="pb-3">
        {loading ? <SkeletonTimetable /> : (
        <div className="w-full">
          {/* Mobile View */}
          <section className="flex flex-col md:hidden">
            {days.map((day, index) => {
              if (mobileDay !== index) return null;
              const dayClasses = classes.filter(c => c.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
              return (
                <div key={day} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="font-black tracking-wide text-[28px] text-white">
                      {t(`timetable.days.${day}`)}
                    </h2>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 border border-white/10">
                      {dayClasses.length} Class
                    </span>
                  </div>
                  {dayClasses.length === 0 ? <EmptyState emoji="·" message="Free day" /> : (
                    <div className="space-y-4">
                      {dayClasses.map(c => <MobileClassTile key={c.id} item={c} onDelete={() => deleteClass(c.id)} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </section>

          {/* Desktop View */}
          <section className="hidden md:grid gap-4 md:grid-cols-5">
            {days.map((day, index) => {
              const dayClasses = classes.filter(c => c.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
              return (
                <div key={day} className="card">
                  <h2 className="mb-4 font-bold">
                    {t(`timetable.days.${day}`)}
                  </h2>
                  {dayClasses.length === 0 ? <EmptyState emoji="·" message="Free day" /> : (
                    <div className="space-y-3">
                      {dayClasses.map(c => <DesktopClassTile key={c.id} item={c} onDelete={() => deleteClass(c.id)} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        </div>
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

function DesktopClassTile({ item, onDelete }) {
  const border = item.class_type === 'T' ? 'border-l-emerald-500' : item.class_type === 'P' ? 'border-l-purple-500' : 'border-l-blue-500'
  const glow = item.class_type === 'T' ? 'from-emerald-500/15' : item.class_type === 'P' ? 'from-purple-500/15' : 'from-blue-500/15'
  return (
    <article className={`group relative rounded-xl border border-white/5 bg-[#1a1b23]/50 bg-gradient-to-r ${glow} to-transparent border-l-2 ${border} p-3 transition-colors hover:bg-white/[0.03]`}>
      <button className="btn-danger absolute right-1 top-1 opacity-0 group-hover:opacity-100" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
      <div className="mb-2 pr-10"><ClassTypeBadge type={item.class_type} /></div>
      <h3 className="font-semibold">{item.subject}</h3>
      <p className="muted">{formatTime(item.start_time)} - {formatTime(item.end_time)}</p>
      <p className="muted mt-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> {item.classroom || 'TBA'}</p>
      <p className="muted mt-1 flex items-center gap-2"><User className="h-4 w-4" /> {item.lecturer || 'TBA'}</p>
    </article>
  )
}

function MobileClassTile({ item, onDelete }) {
  const typeColors = {
    L: { border: 'border-l-blue-500', glow: 'from-blue-500/15', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
    T: { border: 'border-l-emerald-500', glow: 'from-emerald-500/15', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
    P: { border: 'border-l-purple-500', glow: 'from-purple-500/15', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
  }
  const colors = typeColors[item.class_type] || typeColors['L']

  const formattedStart = formatTime(item.start_time)
  const formattedEnd = formatTime(item.end_time)

  return (
    <article className="group relative flex gap-3 w-full">
      <div className={`flex flex-col font-black text-[15px] pt-1 shrink-0 w-[70px] text-center ${colors.text}`}>
        <span>{formattedStart}</span>
        <span className="opacity-70 mt-1">{formattedEnd}</span>
      </div>

      <div className={`flex-1 rounded-[20px] border border-white/5 bg-[#1a1b23]/50 bg-gradient-to-r ${colors.glow} to-transparent p-4 border-l-2 ${colors.border} relative overflow-hidden transition-colors hover:bg-white/[0.03]`}>
        <button className="btn-danger absolute right-2 top-2 opacity-0 group-hover:opacity-100 z-10" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </button>
        
        <div className="mb-3 flex items-center justify-between">
          <ClassTypeBadge type={item.class_type} />
        </div>
        
        <div className={`flex items-start gap-1.5 mb-2 font-bold text-sm ${colors.text}`}>
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{item.classroom || 'TBA'}</span>
        </div>
        
        <h3 className="font-black text-white mb-4 uppercase leading-tight tracking-wider text-[15px]">
          {item.subject}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.lecturer || 'TBA'}</span>
        </div>
      </div>
    </article>
  )
}
