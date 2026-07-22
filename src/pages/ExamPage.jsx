import { ChevronDown, Clock, MapPin, Plus, Sparkles, Trash2, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { useConfirmDialog } from '../components/ConfirmModal'
import ImageUploadAnalyzer from '../components/ImageUploadAnalyzer'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { logActivity } from '../lib/logActivity'
import { supabase } from '../lib/supabase'
import { dateLabel, daysFromToday, formatTime } from '../lib/utils'
import { useLanguage } from '../components/LanguageProvider'
import SubjectSelect from '../components/SubjectSelect'
import { SkeletonList } from '../components/SkeletonLoader'


const initialForm = { subject: '', exam_date: '', start_time: '', end_time: '', exam_type: 'Final', venue: '', notes: '' }

export default function ExamPage() {
  const [exams, setExams] = useState([])
  const [results, setResults] = useState([])
  const [modal, setModal] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { t } = useLanguage()

  useEffect(() => { fetchExams() }, [])

  async function fetchExams() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('exams').select('*').eq('user_id', user.id).order('exam_date')
    const { data: resultRows } = await supabase.from('exam_results').select('*').eq('student_id', user.id)
    setExams(data || [])
    setResults(resultRows || [])

    const { data: classesData } = await supabase.from('classes').select('subject').eq('user_id', user.id)
    if (classesData) {
      setSubjects([...new Set(classesData.map(c => c.subject))])
    }
    setLoading(false)
  }

  async function addExam(e) {
    e.preventDefault()
    setIsSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editingId) {
      const { error } = await supabase.from('exams').update(form).eq('id', editingId)
      if (error) {
        setIsSubmitting(false)
        return showToast('Exam could not be updated.', 'error')
      }
      showToast('Exam updated.', 'success')
    } else {
      const { error } = await supabase.from('exams').insert({ ...form, user_id: user.id })
      if (error) {
        setIsSubmitting(false)
        return showToast('Exam could not be added.', 'error')
      }
      await logActivity('Added exam', 'exam', form.subject)
      showToast('Exam added.', 'success')
    }

    setModal(false)
    setForm(initialForm)
    setEditingId(null)
    setIsSubmitting(false)
    fetchExams()
  }

  function openEditModal(exam) {
    setForm({ subject: exam.subject, exam_date: exam.exam_date, start_time: exam.start_time || '', end_time: exam.end_time || '', exam_type: exam.exam_type, venue: exam.venue || '', notes: exam.notes || '' })
    setEditingId(exam.id)
    setModal(true)
  }

  async function saveAll(items) {
    const { data: { user } } = await supabase.auth.getUser()
    const validItems = items.filter(item => item.subject && item.exam_date)
    if (validItems.length === 0) return showToast('No valid exams to save. Check subject and date fields.', 'error')
    const { error } = await supabase.from('exams').insert(validItems.map(item => ({ ...item, user_id: user.id })))
    if (error) return showToast(`Could not save exams: ${error.message}`, 'error')
    await Promise.all(validItems.map(item => logActivity('Added exam', 'exam', item.subject)))
    showToast(`${validItems.length} exam(s) saved successfully.`, 'success')
    setAnalyzerOpen(false)
    fetchExams()
  }

  async function deleteExam(id) {
    if (!await confirm({ title: 'Delete exam?', message: 'This exam will be removed from your planner.', confirmText: 'Delete' })) return
    await supabase.from('exams').delete().eq('id', id)
    setExams(prev => prev.filter(e => e.id !== id))
  }

  async function clearExams() {
    if (!await confirm({ title: 'Clear exams?', message: 'All exams will be deleted. This cannot be undone.', confirmText: 'Clear' })) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('exams').delete().eq('user_id', user.id)
    if (error) return showToast('Could not clear exams.', 'error')
    setExams([])
    showToast('Exams cleared.', 'success')
  }

  const upcoming = exams.filter(e => daysFromToday(e.exam_date) >= 0)
  const past = exams.filter(e => daysFromToday(e.exam_date) < 0)

  return (
    <main className="main-content">
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center justify-between w-full">
          <h1 className="page-title mb-0">{t('exams.title')}</h1>
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <>
              <button className="md:hidden text-theme-400 hover:text-theme-300 hover:bg-theme-500/10 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0" onClick={() => setAnalyzerOpen(true)} title={t('exams.extract')}>
                <Sparkles className="h-5 w-5" />
              </button>
              <button className="md:hidden text-theme-400 hover:text-theme-300 hover:bg-theme-500/10 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0" onClick={() => setModal(true)} title={t('exams.add')}>
                <Plus className="h-5 w-5" />
              </button>

              <div className="hidden md:flex flex-row gap-2">
                <button className="btn-import justify-center px-3 text-sm" onClick={() => setAnalyzerOpen(true)}><Sparkles className="h-4 w-4 shrink-0" /> <span className="truncate">{t('exams.extract')}</span></button>
                <button className="btn-add justify-center px-3 text-sm" onClick={() => setModal(true)}><Plus className="h-4 w-4 shrink-0" /> <span className="truncate">{t('exams.add')}</span> <span className="h-5 w-px bg-white/25 mx-1" /><ChevronDown className="h-4 w-4 shrink-0" /></button>
              </div>

              {exams.length > 0 && (
                <button className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 ml-1" onClick={clearExams} title={t('exams.clear')}>
                  <Trash2 className="h-5 w-5" /> <span className="text-sm font-medium hidden sm:block">{t('exams.clear')}</span>
                </button>
              )}
            </>
          </div>
        </div>
      </div>
      {(!loading && exams.length === 0) && (
        <div className="mt-8 flex flex-col md:hidden items-center justify-center text-center px-4 py-16 border border-white/5 bg-white/[0.02] rounded-[32px]">
          <div className="w-16 h-16 bg-theme-500/20 text-theme-400 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">No exams yet</h2>
          <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">Get started by importing your exam schedule from a screenshot, or add them manually.</p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button className="btn-import flex-1 justify-center py-3.5 text-[15px]" onClick={() => setAnalyzerOpen(true)}>
              <Sparkles className="h-5 w-5 shrink-0" /> <span>{t('exams.extract')}</span>
            </button>
            <button className="btn-add flex-1 justify-center py-3.5 text-[15px]" onClick={() => setModal(true)}>
              <Plus className="h-5 w-5 shrink-0" /> <span>{t('exams.add')}</span>
            </button>
          </div>
        </div>
      )}
      <div className={(!loading && exams.length === 0) ? 'hidden md:block' : 'block'}>
        <ExamSection loading={loading} title={t('exams.upcoming')} exams={upcoming} results={results} deleteExam={deleteExam} onEdit={openEditModal} emptyMsg={t('exams.empty').replace('{type}', t('exams.upcoming'))} />
        <ExamSection loading={loading} title={t('exams.past')} exams={past} results={results} deleteExam={deleteExam} onEdit={openEditModal} emptyMsg={t('exams.empty').replace('{type}', t('exams.past'))} />
      </div>
      <Modal isOpen={modal} onClose={() => { setModal(false); setForm(initialForm); setEditingId(null); }} title={editingId ? "Edit Exam" : "Add Exam"} mobileMaxHeight="form-exam">
        <form onSubmit={addExam} className="space-y-4">
          <Field label="Subject">
            <SubjectSelect 
              value={form.subject} 
              onChange={val => setForm({ ...form, subject: val })} 
              subjects={subjects} 
            />
          </Field>
          <Field label="Exam Date"><input className="input" required type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })} /></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Start Time"><input className="input" type="time" placeholder="e.g. 09:00" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></Field>
            <Field label="End Time"><input className="input" type="time" placeholder="e.g. 11:00" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></Field>
          </div>
          <Field label="Exam Type"><select className="input" value={form.exam_type} onChange={e => setForm({ ...form, exam_type: e.target.value })}>{['Test 1', 'Test 2', 'Midterm', 'Final', 'Practical'].map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Venue"><input className="input" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></Field>
          <Field label="Notes"><textarea className="input min-h-24" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <button disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Exam'}</button>
        </form>
      </Modal>
      <Modal isOpen={analyzerOpen} onClose={() => setAnalyzerOpen(false)} title="Import Exam Schedule from Screenshot" maxWidth="max-w-5xl" bodyClassName="overflow-hidden">
        <ImageUploadAnalyzer type="exam" onResult={saveAll} />
      </Modal>
      {ConfirmDialog}
    </main>
  )
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }

function ExamSection({ title, exams, results, deleteExam, onEdit, emptyMsg, loading }) {
  if (loading) return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
      </div>
      <div className="grid gap-3 sm:gap-5 lg:grid-cols-2">
        <SkeletonList count={2} />
      </div>
    </section>
  );

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        <span className="bg-white/10 text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/10 shadow-inner">{exams.length}</span>
      </div>
      {exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-4 py-10 border border-white/5 bg-white/[0.02] rounded-[24px]">
           <div className="w-12 h-12 bg-white/5 text-slate-400 rounded-full flex items-center justify-center mb-3">
             <span className="text-xl">📖</span>
           </div>
           <p className="text-slate-400 font-medium text-sm">{emptyMsg || `No exams.`}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {exams.map(exam => <ExamCard key={exam.id} exam={exam} result={results.find(r => r.exam_id === exam.id)} deleteExam={deleteExam} onEdit={() => onEdit(exam)} />)}
        </div>
      )}
    </section>
  )
}

function ExamCard({ exam, result, deleteExam, onEdit }) {
  const days = daysFromToday(exam.exam_date)
  const isPast = days < 0;
  
  // Status Pill styling
  const statusColor = isPast ? 'bg-white/10 text-slate-300 border-white/10' : days <= 7 ? 'bg-red-500/10 text-red-400 border-red-500/20' : days <= 14 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  const label = isPast ? 'Completed' : days === 0 ? 'Today' : `${days} days`;

  // Exam Type Badge styling
  const typeMap = {
    'Final': 'bg-red-500/10 text-red-400 border-red-500/30',
    'Midterm': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'Practical': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    'Test 1': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    'Test 2': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  }
  const typeColor = typeMap[exam.exam_type] || 'bg-slate-500/10 text-slate-300 border-slate-500/30';

  return (
    <article className={`group relative rounded-[20px] border p-4 sm:p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.3)] ${isPast ? 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]' : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className={`font-bold text-base sm:text-lg tracking-tight leading-snug break-words ${isPast ? 'text-slate-400' : 'text-white'}`}>{exam.subject}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider shrink-0 ${typeColor}`}>{exam.exam_type}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
           <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-bold tracking-wide uppercase shadow-sm ${statusColor}`}>
              {label}
           </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mb-3">
        <div className="flex items-center gap-2 text-slate-400 bg-black/20 rounded-xl p-2 sm:p-2.5 border border-white/5 transition-colors hover:bg-black/30">
           <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
             <span className="text-xs sm:text-sm">📅</span>
           </div>
           <div className="min-w-0 flex-1">
             <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">Date</p>
             <p className="text-xs sm:text-[13px] font-semibold text-slate-200 break-words leading-tight">{dateLabel(exam.exam_date)}</p>
           </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 bg-black/20 rounded-xl p-2 sm:p-2.5 border border-white/5 transition-colors hover:bg-black/30">
           <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
             <span className="text-xs sm:text-sm">🕒</span>
           </div>
           <div className="min-w-0 flex-1">
             <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">Time</p>
             <p className="text-xs sm:text-[13px] font-semibold text-slate-200 break-words leading-tight">{exam.start_time && exam.end_time ? `${formatTime(exam.start_time)} \u2013 ${formatTime(exam.end_time)}` : 'TBA'}</p>
           </div>
        </div>
        
        <div className="col-span-2 flex items-center gap-2 text-slate-400 bg-black/20 rounded-xl p-2 sm:p-2.5 border border-white/5 transition-colors hover:bg-black/30">
           <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
             <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-theme-400" />
           </div>
           <div className="min-w-0 flex-1">
             <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">Venue</p>
             <p className="text-xs sm:text-[13px] font-semibold text-slate-200 break-words leading-tight">{exam.venue || 'TBA'}</p>
           </div>
        </div>
      </div>

      {exam.notes && (
        <div className="mb-3 rounded-xl bg-theme-500/5 px-3 py-2 border border-theme-500/10 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-500/50"></div>
          <p className="text-xs sm:text-[13px] text-theme-100/80 line-clamp-2 leading-relaxed pl-1.5">{exam.notes}</p>
        </div>
      )}
      
      {result && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 relative overflow-hidden">
           <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50"></div>
           <div className="pl-1 flex items-center gap-2">
             <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500/70">Result:</span>
             <span className="text-lg sm:text-xl font-black text-emerald-400 tracking-tight">{result.score}</span>
             <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">{result.grade}</span>
           </div>
           {result.remarks && <span className="text-[10px] sm:text-[11px] font-bold tracking-wide uppercase text-emerald-400/90 bg-emerald-500/15 px-2 py-1 rounded-md border border-emerald-500/20">{result.remarks}</span>}
        </div>
      )}

      <div className="pt-2 border-t border-white/5 flex justify-end items-center gap-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button 
          className="flex items-center justify-center w-[28px] h-[28px] text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" 
          onClick={onEdit}
          title="Edit Exam"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button 
          className="flex items-center justify-center w-[28px] h-[28px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" 
          onClick={() => deleteExam(exam.id)}
          title="Delete Exam"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}
