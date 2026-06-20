import { ChevronDown, Clock, MapPin, Plus, Sparkles, Trash2 } from 'lucide-react'
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


const initialForm = { subject: '', exam_date: '', start_time: '', end_time: '', exam_type: 'Final', venue: '', notes: '' }

export default function ExamPage() {
  const [exams, setExams] = useState([])
  const [results, setResults] = useState([])
  const [modal, setModal] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [subjects, setSubjects] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { t } = useLanguage()

  useEffect(() => { fetchExams() }, [])

  async function fetchExams() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('exams').select('*').eq('user_id', user.id).order('exam_date')
    const { data: resultRows } = await supabase.from('exam_results').select('*').eq('student_id', user.id)
    setExams(data || [])
    setResults(resultRows || [])

    const { data: classesData } = await supabase.from('classes').select('subject').eq('user_id', user.id)
    if (classesData) {
      setSubjects([...new Set(classesData.map(c => c.subject))])
    }
  }

  async function addExam(e) {
    e.preventDefault()
    setIsSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('exams').insert({ ...form, user_id: user.id })
    if (error) {
      setIsSubmitting(false)
      return showToast('Exam could not be added.', 'error')
    }
    await logActivity('Added exam', 'exam', form.subject)
    showToast('Exam added.', 'success')
    setModal(false)
    setForm(initialForm)
    setIsSubmitting(false)
    fetchExams()
  }

  async function saveAll(items) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('exams').insert(items.map(item => ({ ...item, user_id: user.id })))
    if (error) return showToast('Could not save extracted exams.', 'error')
    await Promise.all(items.map(item => logActivity('Added exam', 'exam', item.subject)))
    showToast('Extracted exams saved.', 'success')
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
      {exams.length === 0 && (
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
      <div className={exams.length === 0 ? 'hidden md:block' : 'block'}>
        <ExamSection title={t('exams.upcoming')} exams={upcoming} results={results} deleteExam={deleteExam} emptyMsg={t('exams.empty').replace('{type}', t('exams.upcoming'))} />
        <ExamSection title={t('exams.past')} exams={past} results={results} deleteExam={deleteExam} emptyMsg={t('exams.empty').replace('{type}', t('exams.past'))} />
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Exam">
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

function ExamSection({ title, exams, results, deleteExam, emptyMsg }) {
  return (
    <section className="mb-6">
      <h2 className="section-header">{title}</h2>
      {exams.length === 0 ? <div className="card"><EmptyState emoji="📖" message={emptyMsg || `No exams.`} /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {exams.map(exam => <ExamCard key={exam.id} exam={exam} result={results.find(r => r.exam_id === exam.id)} deleteExam={deleteExam} />)}
        </div>
      )}
    </section>
  )
}

function ExamCard({ exam, result, deleteExam }) {
  const days = daysFromToday(exam.exam_date)
  const color = days < 0 ? 'text-slate-400' : days <= 7 ? 'text-red-400' : days <= 14 ? 'text-yellow-400' : 'text-green-400'
  const label = days < 0 ? 'Completed' : days === 0 ? 'Today' : `${days} days`
  return (
    <article className="card grid gap-4 md:grid-cols-[1fr_auto]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold">{exam.subject}</h3><span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">{exam.exam_type}</span></div>
        <p className="muted">{dateLabel(exam.exam_date)}</p>
        {exam.start_time && exam.end_time && <p className="muted mt-2 flex items-center gap-2"><Clock className="h-4 w-4" /> {formatTime(exam.start_time)} {'\u2013'} {formatTime(exam.end_time)}</p>}
        <p className="muted mt-3 flex items-center gap-2"><MapPin className="h-4 w-4" /> {exam.venue || 'TBA'}</p>
        {exam.notes && <p className="mt-3 text-sm text-slate-400">{exam.notes}</p>}
        {result && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
            <span className={`text-2xl font-bold ${Number(result.score) >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>{result.score}</span>
            <span className="rounded-full bg-theme-500/20 px-2 py-0.5 text-sm font-semibold text-theme-300">{result.grade}</span>
            {result.remarks && <span className="text-xs italic text-slate-400">{result.remarks}</span>}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
        <p className={`text-lg font-bold ${color}`}>{label}</p>
        <button className="btn-danger" onClick={() => deleteExam(exam.id)}><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  )
}
