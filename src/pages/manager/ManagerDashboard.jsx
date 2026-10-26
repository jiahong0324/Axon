import { Activity, BookOpen, CheckSquare, FileText, Megaphone, Plus, Users, Mail, MessageSquareText, Search, LineChart } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import AddStudentModal from '../../components/AddStudentModal'
import Modal from '../../components/Modal'
import AnnouncementComposerModal from '../../components/AnnouncementComposerModal'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { initials } from '../../lib/utils'
import { studentManager } from '../../lib/manageStudent'
import { buildEmailHtml } from '../../lib/emailTemplate'
import { isInternalSync, formatHumanActivity } from './ManagerActivityPage'

const announcementInitial = { title: '', message: '', type: 'info', expires_at: '' }

export default function ManagerDashboard() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ students: 0, assignments: 0, exams: 0, announcements: 0 })
  const [activity, setActivity] = useState([])
  const [profiles, setProfiles] = useState([])
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [studentOpen, setStudentOpen] = useState(false)
  const [announcement, setAnnouncement] = useState(announcementInitial)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailForm, setEmailForm] = useState({ subject: '', message: '', audience: 'students', emails: '' })
  const [emailLoading, setEmailLoading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const today = format(new Date(), 'yyyy-MM-dd')
    const nextWeek = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    const { data: { user } } = await supabase.auth.getUser()
    const [me, studentsRes, assignmentsRes, examsRes, announcementsRes, activityRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('assignments').select('id,status').neq('status', 'Done'),
      supabase.from('exams').select('id,exam_date').gte('exam_date', today).lte('exam_date', nextWeek),
      supabase.from('announcements').select('id,expires_at'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20)
    ])
    const allProfiles = studentsRes.data || []
    const studentProfiles = allProfiles.filter(p => p.role === 'student')
    const profileMap = new Map(allProfiles.map(p => [p.id, p]))
    setProfile(me.data)
    setProfiles(studentProfiles)
    setStats({
      students: studentProfiles.length,
      assignments: assignmentsRes.data?.length || 0,
      exams: examsRes.data?.length || 0,
      announcements: (announcementsRes.data || []).filter(a => !a.expires_at || new Date(a.expires_at) > new Date()).length
    })
    setActivity((activityRes.data || [])
      .filter(item => !isInternalSync(item))
      .map(item => ({
        ...item,
        profile: profileMap.get(item.user_id) || (item.user_id === user.id ? me.data : null)
      }))
    )
    window.hidePrerenderSplash?.()
  }

  async function sendAnnouncement(e) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...announcement, manager_id: user.id, expires_at: announcement.expires_at || null }
    const { error } = await supabase.from('announcements').insert(payload)
    if (error) return showToast('Announcement could not be sent.', 'error')
    showToast('Announcement sent.', 'success')
    setAnnouncement(announcementInitial)
    setAnnouncementOpen(false)
    loadDashboard()
  }

  async function sendEmailBroadcast(e, selectedRecipients) {
    e?.preventDefault?.()
    setEmailLoading(true)
    try {
      const payload = {
        subject: emailForm.subject,
        message: emailForm.message,
        htmlContent: buildEmailHtml({ subject: emailForm.subject, message: emailForm.message }),
        audience: 'custom',
      }
      if (emailForm.audience === 'custom') {
        const emailList = emailForm.emails.split(',').map(email => email.trim()).filter(Boolean)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const invalidEmails = emailList.filter(e => !emailRegex.test(e))
        if (emailList.length === 0) {
          showToast('Please enter at least one email address.', 'error')
          setEmailLoading(false)
          return
        }
        if (invalidEmails.length > 0) {
          showToast(`Invalid email format: ${invalidEmails.slice(0, 2).join(', ')}`, 'error')
          setEmailLoading(false)
          return
        }
        payload.emails = emailList
      } else {
        if (!selectedRecipients || selectedRecipients.length === 0) {
          showToast('Please select at least one student recipient.', 'error')
          setEmailLoading(false)
          return
        }
        payload.emails = selectedRecipients
      }
      const res = await studentManager.sendPromotionalEmail(payload)
      showToast(`Email broadcast sent successfully to ${res.data?.count || 0} user(s).`, 'success')
      setEmailForm({ subject: '', message: '', audience: 'students', emails: '' })
      setEmailOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send email broadcast.', 'error')
    } finally {
      setEmailLoading(false)
    }
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  }, [])

  return (
    <main className="main-content">
      <header className="mb-6 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <h1 className="font-heading text-2xl font-bold">{greeting}, {profile?.full_name || 'manager'}</h1>
        <p className="muted">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Summary icon={Users} label="Total Students" value={stats.students} tone="text-amber-400" border="border-l-amber-500" />
        <Summary icon={CheckSquare} label="Active Assignments" value={stats.assignments} tone="text-theme-400" border="border-l-theme-500" />
        <Summary icon={BookOpen} label="Upcoming Exams" value={stats.exams} tone="text-purple-400" border="border-l-purple-500" />
        <Summary icon={Megaphone} label="Announcements Sent" value={stats.announcements} tone="text-emerald-400" border="border-l-emerald-500" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-header mb-0"><Activity className="h-5 w-5 text-amber-400" /> Recent Student Activity</h2>
            <Link to="/manager/activity" className="text-sm font-medium text-amber-400 hover:text-amber-300">View all</Link>
          </div>
          <div className="scrollbar-hide max-h-96 space-y-3 overflow-y-auto">
            {activity.length === 0 ? <p className="muted">No student activity logged yet.</p> : activity.map(item => <ActivityItem key={item.id} item={item} />)}
          </div>
        </div>

        <div className="card">
          <h2 className="section-header">Quick Actions</h2>
          <div className="grid gap-3">
            <QuickLink to="/manager/students" icon={Users} label="Manage Students" />
            <QuickLink to="/manager/monitoring" icon={LineChart} label="System Monitoring" />
            <QuickLink to="/manager/ai-chats" icon={MessageSquareText} label="Student AI Chats" />
            <button className="btn-ghost justify-start border-amber-500/20 text-left hover:bg-amber-500/10" onClick={() => setAnnouncementOpen(true)}><Megaphone className="h-4 w-4 text-amber-400" /> Send Announcement</button>
            <button className="btn-ghost justify-start border-amber-500/20 text-left hover:bg-amber-500/10" onClick={() => setEmailOpen(true)}><Mail className="h-4 w-4 text-amber-400" /> Send Email Broadcast</button>
            <QuickLink to="/manager/reports" icon={FileText} label="Export Reports" />
            <button className="manager-primary-btn justify-start" onClick={() => setStudentOpen(true)}><Plus className="h-4 w-4" /> Add Student</button>
          </div>
        </div>
      </section>

      <AnnouncementComposerModal isOpen={announcementOpen} onClose={() => setAnnouncementOpen(false)} onSuccess={loadDashboard} />
      <AddStudentModal isOpen={studentOpen} onClose={() => setStudentOpen(false)} onCreated={loadDashboard} />
      <SendEmailModal isOpen={emailOpen} onClose={() => setEmailOpen(false)} form={emailForm} setForm={setEmailForm} onSubmit={sendEmailBroadcast} loading={emailLoading} students={profiles} />
    </main>
  )
}

function Summary({ icon: Icon, label, value, tone, border }) {
  return <div className={`card flex items-center gap-4 border-l-4 ${border}`}><Icon className={`h-7 w-7 ${tone}`} /><div><p className="muted">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>
}

function QuickLink({ to, icon: Icon, label }) {
  return <Link to={to} className="btn-ghost justify-start"><Icon className="h-4 w-4 text-amber-400" /> {label}</Link>
}

function ActivityItem({ item }) {
  const profile = item.profile || {}
  const color = item.entity_type === 'class' ? 'bg-theme-400' : item.entity_type === 'assignment' ? 'bg-yellow-400' : item.entity_type === 'exam' ? 'bg-purple-400' : item.entity_type === 'exercise' ? 'bg-orange-400' : 'bg-emerald-400'
  const actionLabel = formatActionLabel(item.action)
  const entityLabel = formatEntityLabel(item.entity_name)

  return (
    <article className="flex items-start gap-3 rounded-xl border border-white/10 p-3">
      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${color}`} />
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: profile.avatar_color || '#F59E0B' }}>{initials(profile.full_name || profile.email || 'S')}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold text-white">{profile.full_name || profile.email || 'Student'}</span>{' '}
          <span className="text-slate-300">{actionLabel}</span>{' '}
          {entityLabel && <span className="font-medium text-amber-300">"{entityLabel}"</span>}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
      </div>
    </article>
  )
}

export function AnnouncementModal({ isOpen, onClose, form, setForm, onSubmit }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Announcement">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Title"><input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Message"><textarea className="input min-h-28" required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></Field>
        <div>
          <p className="label">Type</p>
          <div className="grid grid-cols-3 gap-2">
            {['info', 'warning', 'urgent'].map(type => <button type="button" key={type} onClick={() => setForm({ ...form, type })} className={`rounded-xl border px-3 py-2 text-sm capitalize ${form.type === type ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-white/10 text-slate-400'}`}>{type}</button>)}
          </div>
        </div>
        <Field label="Expires On"><input className="input" type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></Field>
        <button className="manager-primary-btn w-full">Send to All Students</button>
      </form>
    </Modal>
  )
}

export function SendEmailModal({ isOpen, onClose, form, setForm, onSubmit, loading, students = [] }) {
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  // Filter students who have a valid email address
  const validStudents = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return (students || []).filter(s => {
      const email = (s.email || '').trim()
      return email && emailRegex.test(email) && !email.toLowerCase().endsWith('.local')
    })
  }, [students])

  // Select all valid students by default when opening modal
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(validStudents.map(s => s.id)))
      setSearch('')
      setShowPicker(false)
    }
  }, [isOpen, validStudents])

  const toggleStudent = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(validStudents.map(s => s.id)))
  const deselectAll = () => setSelectedIds(new Set())

  // Filtered by search query
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return validStudents
    const q = search.toLowerCase()
    return validStudents.filter(s =>
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    )
  }, [validStudents, search])

  const isStudentsAudience = form.audience !== 'custom'
  const selectedCount = selectedIds.size
  const isAllSelected = selectedCount === validStudents.length
  const excludedCount = validStudents.length - selectedCount

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isStudentsAudience) {
      const selectedRecipients = validStudents
        .filter(s => selectedIds.has(s.id))
        .map(s => ({
          email: s.email.trim(),
          name: (s.full_name || 'Student').trim()
        }))
      onSubmit(e, selectedRecipients)
    } else {
      onSubmit(e)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Email Broadcast" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Subject">
          <input
            className="input"
            required
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            placeholder="Subject"
          />
        </Field>

        <div>
          <p className="label">Audience</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'students', label: `All Students (${validStudents.length})` },
              { id: 'custom', label: 'Custom List' }
            ].map(aud => {
              const active = (aud.id === 'students' && isStudentsAudience) || (aud.id === 'custom' && form.audience === 'custom')
              return (
                <button
                  type="button"
                  key={aud.id}
                  onClick={() => setForm({ ...form, audience: aud.id })}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {aud.label}
                </button>
              )
            })}
          </div>

          {/* Clean recipient summary & toggle for students audience */}
          {isStudentsAudience && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                <span>
                  {isAllSelected ? (
                    <>Sending to <strong className="text-amber-300 font-semibold">all {validStudents.length}</strong> students</>
                  ) : (
                    <>Sending to <strong className="text-amber-300 font-semibold">{selectedCount}</strong> of {validStudents.length} students <span className="text-amber-400/80">({excludedCount} excluded)</span></>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPicker(!showPicker)}
                  className="font-medium text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {showPicker ? 'Done' : isAllSelected ? 'Exclude students' : 'Edit selection'}
                </button>
              </div>

              {/* Collapsible student selection drawer */}
              {showPicker && (
                <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-slate-900/70 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        className="input h-7 pl-7 text-xs py-0 w-full bg-slate-950/60 border-white/10 placeholder:text-slate-500"
                        placeholder="Search student or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-amber-400 hover:text-amber-300 hover:underline"
                      >
                        Select all
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={deselectAll}
                        className="text-slate-400 hover:text-slate-300 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin scrollbar-thumb-white/10">
                    {filteredStudents.length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-500">No matching students</p>
                    ) : (
                      filteredStudents.map(student => {
                        const isChecked = selectedIds.has(student.id)
                        return (
                          <label
                            key={student.id}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer select-none transition-colors ${
                              isChecked
                                ? 'bg-amber-500/10 text-slate-200'
                                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-400/20 h-3.5 w-3.5 shrink-0 cursor-pointer"
                              checked={isChecked}
                              onChange={() => toggleStudent(student.id)}
                            />
                            <span className="font-medium truncate">{student.full_name || 'Unnamed Student'}</span>
                            <span className="text-[11px] text-slate-400 truncate ml-auto">{student.email}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {form.audience === 'custom' && (
          <Field label="Recipients (Comma-separated emails)">
            <textarea
              className="input min-h-20"
              required
              value={form.emails}
              onChange={e => setForm({ ...form, emails: e.target.value })}
              placeholder="student1@uni.edu, student2@uni.edu"
            />
          </Field>
        )}

        <Field label="Message Content">
          <textarea
            className="input min-h-56 sm:min-h-64 leading-relaxed resize-y"
            required
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            placeholder="Type your message here..."
          />
        </Field>

        <button
          className="manager-primary-btn w-full"
          disabled={loading || (isStudentsAudience && selectedCount === 0)}
        >
          {loading
            ? 'Sending Broadcast...'
            : isStudentsAudience
              ? selectedCount === 0
                ? 'No Students Selected'
                : selectedCount === validStudents.length
                  ? 'Send Broadcast'
                  : `Send to ${selectedCount} Student${selectedCount === 1 ? '' : 's'}`
              : 'Send Broadcast'}
        </button>
      </form>
    </Modal>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}
