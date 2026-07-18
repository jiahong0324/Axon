import { Activity, BookOpen, CheckSquare, FileText, Megaphone, Plus, Users, Mail } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import AddStudentModal from '../../components/AddStudentModal'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { initials } from '../../lib/utils'
import { studentManager } from '../../lib/manageStudent'

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
  const [emailForm, setEmailForm] = useState({ subject: '', message: '', audience: 'all', emails: '' })
  const [emailLoading, setEmailLoading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const today = format(new Date(), 'yyyy-MM-dd')
    const nextWeek = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    const { data: { user } } = await supabase.auth.getUser()
    const [me, studentsRes, assignmentsRes, examsRes, announcementsRes, activityRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
      supabase.from('assignments').select('id,status').neq('status', 'Done'),
      supabase.from('exams').select('id,exam_date').gte('exam_date', today).lte('exam_date', nextWeek),
      supabase.from('announcements').select('id,expires_at'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20)
    ])
    const studentProfiles = studentsRes.data || []
    setProfile(me.data)
    setProfiles(studentProfiles)
    setStats({
      students: studentProfiles.length,
      assignments: assignmentsRes.data?.length || 0,
      exams: examsRes.data?.length || 0,
      announcements: (announcementsRes.data || []).filter(a => !a.expires_at || new Date(a.expires_at) > new Date()).length
    })
    setActivity((activityRes.data || []).map(item => ({
      ...item,
      profile: studentProfiles.find(p => p.id === item.user_id)
    })))
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

  async function sendEmailBroadcast(e) {
    e.preventDefault()
    setEmailLoading(true)
    try {
      const payload = {
        subject: emailForm.subject,
        message: emailForm.message,
        audience: emailForm.audience,
      }
      if (emailForm.audience === 'custom') {
        payload.emails = emailForm.emails.split(',').map(email => email.trim()).filter(Boolean)
        if (payload.emails.length === 0) {
          showToast('Please enter at least one email address.', 'error')
          setEmailLoading(false)
          return
        }
      }
      const res = await studentManager.sendPromotionalEmail(payload)
      showToast(`Email broadcast sent successfully to ${res.data?.count || 0} user(s).`, 'success')
      setEmailForm({ subject: '', message: '', audience: 'all', emails: '' })
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
            <button className="btn-ghost justify-start border-amber-500/20 text-left hover:bg-amber-500/10" onClick={() => setAnnouncementOpen(true)}><Megaphone className="h-4 w-4 text-amber-400" /> Send Announcement</button>
            <button className="btn-ghost justify-start border-amber-500/20 text-left hover:bg-amber-500/10" onClick={() => setEmailOpen(true)}><Mail className="h-4 w-4 text-amber-400" /> Send Email Broadcast</button>
            <QuickLink to="/manager/reports" icon={FileText} label="Export Reports" />
            <button className="manager-primary-btn justify-start" onClick={() => setStudentOpen(true)}><Plus className="h-4 w-4" /> Add Student</button>
          </div>
        </div>
      </section>

      <AnnouncementModal isOpen={announcementOpen} onClose={() => setAnnouncementOpen(false)} form={announcement} setForm={setAnnouncement} onSubmit={sendAnnouncement} />
      <AddStudentModal isOpen={studentOpen} onClose={() => setStudentOpen(false)} onCreated={loadDashboard} />
      <SendEmailModal isOpen={emailOpen} onClose={() => setEmailOpen(false)} form={emailForm} setForm={setEmailForm} onSubmit={sendEmailBroadcast} loading={emailLoading} />
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
  const color = item.entity_type === 'class' ? 'bg-theme-400' : item.entity_type === 'assignment' ? 'bg-yellow-400' : item.entity_type === 'exam' ? 'bg-purple-400' : 'bg-emerald-400'
  return (
    <article className="flex items-start gap-3 rounded-xl border border-white/10 p-3">
      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${color}`} />
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: profile.avatar_color || '#F59E0B' }}>{initials(profile.full_name || profile.email || 'S')}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm"><span className="font-semibold">{profile.full_name || profile.email || 'Student'}</span> {item.action} {item.entity_name && <span className="text-slate-300">"{item.entity_name}"</span>}</p>
        <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
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

export function SendEmailModal({ isOpen, onClose, form, setForm, onSubmit, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Email Broadcast">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Subject">
          <input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. New Feature Release!" />
        </Field>
        <div>
          <p className="label">Audience</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'all', label: 'All Students' },
              { id: 'custom', label: 'Custom List' }
            ].map(aud => (
              <button
                type="button"
                key={aud.id}
                onClick={() => setForm({ ...form, audience: aud.id })}
                className={`rounded-xl border px-3 py-2 text-sm capitalize ${form.audience === aud.id ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-white/10 text-slate-400'}`}
              >
                {aud.label}
              </button>
            ))}
          </div>
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
            className="input min-h-36"
            required
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            placeholder="Type your promotional or announcement message here..."
          />
        </Field>
        <button className="manager-primary-btn w-full" disabled={loading}>
          {loading ? 'Sending Broadcast...' : 'Send Broadcast'}
        </button>
      </form>
    </Modal>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}
