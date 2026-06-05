import { KeyRound, Save, Settings, UserCog } from 'lucide-react'
import { useEffect, useState } from 'react'
import ToggleSwitch from '../../components/ToggleSwitch'
import { useTheme } from '../../components/ThemeProvider'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { studentManager } from '../../lib/manageStudent'

export default function ManagerSettingsPage() {
  const themeCtx = useTheme()
  const { showToast } = useToast()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ full_name: '', email: '' })
  const [password, setPassword] = useState('')
  const [toggles, setToggles] = useState({ newStudent: true, missingResults: true })
  const [portal, setPortal] = useState({ institution: localStorage.getItem('axon_institution') || '', term: localStorage.getItem('axon_term') || '' })
  const [inviteData, setInviteData] = useState({ email: '', role: 'student' })
  const [inviting, setInviting] = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setProfile({ full_name: data?.full_name || user.user_metadata?.full_name || '', email: data?.email || user.email || '' })
  }

  async function saveProfile() {
    const authResult = await supabase.auth.updateUser({ data: { full_name: profile.full_name }, email: profile.email })
    const profileResult = await supabase.from('profiles').update({ full_name: profile.full_name, email: profile.email }).eq('id', user.id)
    showToast(authResult.error || profileResult.error ? 'Manager profile could not be saved.' : 'Manager profile saved.', authResult.error || profileResult.error ? 'error' : 'success')
  }

  async function changePassword() {
    if (password.length < 8) return showToast('Password must be at least 8 characters.', 'error')
    const { error } = await supabase.auth.updateUser({ password })
    showToast(error ? 'Password could not be updated.' : 'Password updated.', error ? 'error' : 'success')
    if (!error) setPassword('')
  }

  function savePortal() {
    localStorage.setItem('axon_institution', portal.institution)
    localStorage.setItem('axon_term', portal.term)
    showToast('Portal settings saved.', 'success')
  }

  async function handleInvite() {
    if (!inviteData.email) return showToast('Please enter an email.', 'error')
    setInviting(true)
    const { error } = await studentManager.inviteUser(inviteData.email, inviteData.role)
    setInviting(false)
    if (error) {
      showToast(error, 'error')
    } else {
      showToast('Invitation sent successfully!', 'success')
      setInviteData({ email: '', role: 'student' })
    }
  }

  return (
    <main className="main-content">
      <h1 className="page-title flex items-center gap-2"><Settings className="h-6 w-6 text-amber-400" /> Manager Settings</h1>
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Manager Profile" icon={UserCog}>
          <Field label="Name"><input className="input" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></Field>
          <button className="manager-primary-btn w-full md:w-auto" onClick={saveProfile}><Save className="h-4 w-4" /> Save Profile</button>
        </Section>

        <Section title="Security" icon={KeyRound}>
          <Field label="New Password"><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
          <button className="btn-ghost w-full md:w-auto" onClick={changePassword}>Change Password</button>
        </Section>

        <Section title="Invite User" icon={UserCog}>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Invite a new manager or student to the portal.</p>
          <div className="flex flex-col md:flex-row gap-2 mb-2">
            <input 
              className="input flex-1" 
              type="email" 
              placeholder="user@example.com"
              value={inviteData.email}
              onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
              disabled={inviting}
            />
            <select className="input md:w-32" value={inviteData.role} onChange={e => setInviteData({ ...inviteData, role: e.target.value })} disabled={inviting}>
              <option value="student">Student</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <button className="manager-primary-btn w-full md:w-auto" onClick={handleInvite} disabled={inviting}>
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </Section>

        <Section title="Appearance">
          <p className="label">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {['dark', 'light', 'system'].map(option => <button key={option} className={`rounded-xl px-3 py-2 text-sm capitalize ${themeCtx.theme === option ? 'bg-amber-500 text-white' : 'border border-white/10'}`} onClick={() => themeCtx.setTheme(option)}>{option}</button>)}
          </div>
          <p className="muted">Manager amber accent is fixed to keep this portal visually distinct.</p>
        </Section>

        <Section title="Notifications">
          <ToggleRow label="Email alert when a new student registers" checked={toggles.newStudent} onChange={next => setToggles({ ...toggles, newStudent: next })} />
          <ToggleRow label="Reminder when an exam has no result entered" checked={toggles.missingResults} onChange={next => setToggles({ ...toggles, missingResults: next })} />
        </Section>

        <Section title="Portal Settings">
          <Field label="Institution name"><input className="input" value={portal.institution} onChange={e => setPortal({ ...portal, institution: e.target.value })} /></Field>
          <Field label="Academic year / semester"><input className="input" value={portal.term} onChange={e => setPortal({ ...portal, term: e.target.value })} /></Field>
          <button className="manager-primary-btn w-full md:w-auto" onClick={savePortal}><Save className="h-4 w-4" /> Save Portal Settings</button>
        </Section>
      </div>
    </main>
  )
}

function Section({ title, icon: Icon, children }) {
  return <section className="card space-y-4"><h2 className="section-header">{Icon && <Icon className="h-5 w-5 text-amber-400" />}{title}</h2>{children}</section>
}

function Field({ label, children }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}

function ToggleRow({ label, checked, onChange }) {
  return <div className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span>{label}</span><ToggleSwitch isOn={checked} onToggle={() => onChange(!checked)} /></div>
}
