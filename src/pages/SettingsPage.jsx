import { Download, LogOut, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ToggleSwitch from '../components/ToggleSwitch'
import { useConfirmDialog } from '../components/ConfirmModal'
import { useTheme } from '../components/ThemeProvider'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { initials } from '../lib/utils'

const tabs = [
  ['profile', 'Profile'],
  ['account', 'Account'],
  ['appearance', 'Appearance'],
  ['notifications', 'Notifications'],
  ['ai', 'AI'],
  ['data', 'Data']
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const themeCtx = useTheme()
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ full_name: '', university: '', course: '', student_id: '', avatar_color: 'blue' })
  const [security, setSecurity] = useState({ email: '', password: '' })

  useEffect(() => { loadUser() }, [])

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setProfile({
      full_name: user?.user_metadata?.full_name || '',
      university: user?.user_metadata?.university || '',
      course: user?.user_metadata?.course || '',
      student_id: user?.user_metadata?.student_id || '',
      avatar_color: user?.user_metadata?.avatar_color || 'blue'
    })
    setSecurity(s => ({ ...s, email: user?.email || '' }))
  }

  async function saveProfile() {
    const { error } = await supabase.auth.updateUser({ data: profile })
    showToast(error ? 'Profile could not be saved.' : 'Profile saved.', error ? 'error' : 'success')
  }

  async function updateEmail() {
    const { error } = await supabase.auth.updateUser({ email: security.email })
    showToast(error ? 'Email update failed.' : 'Check your inbox to confirm the new email.', error ? 'error' : 'success')
  }

  async function updatePassword() {
    const { error } = await supabase.auth.updateUser({ password: security.password })
    showToast(error ? 'Password update failed.' : 'Password updated.', error ? 'error' : 'success')
    setSecurity(s => ({ ...s, password: '' }))
  }

  async function exportData() {
    const { data: { user } } = await supabase.auth.getUser()
    const tables = ['classes', 'assignments', 'exams', 'reminders']
    const result = {}
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*').eq('user_id', user.id)
      result[table] = data || []
    }
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'axon-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function clearTable(table) {
    if (!await confirm({ title: `Clear ${table}?`, message: `All ${table} will be deleted. This cannot be undone.`, confirmText: 'Clear' })) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from(table).delete().eq('user_id', user.id)
    showToast(`${table} cleared.`, 'success')
  }

  async function deleteAccount() {
    if (!await confirm({ title: 'Delete account?', message: 'This permanently deletes your Axon account. Please confirm before continuing.', confirmText: 'Delete account' })) return
    await supabase.rpc('delete_user')
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function globalSignOut() {
    await supabase.auth.signOut({ scope: 'global' })
    navigate('/login')
  }

  async function testNotification() {
    if (!('Notification' in window)) return showToast('Notifications are not supported in this browser.', 'error')
    if (Notification.permission === 'default') await Notification.requestPermission()
    if (Notification.permission !== 'granted') return showToast('Notification permission is not enabled.', 'error')
    new Notification('Axon test', { body: 'Notifications are working.', icon: '/icons/logo.png' })
  }

  function pref(key, fallback) { return localStorage.getItem(key) ?? fallback }
  function setPref(key, value) { localStorage.setItem(key, value); showToast('Preference saved.', 'success') }

  return (
    <main className="main-content">
      <h1 className="page-title">Settings</h1>
      <nav className="scrollbar-hide sticky top-0 z-20 mb-4 flex gap-2 overflow-x-auto bg-[var(--bg-primary)] py-2 md:hidden">
        {tabs.map(([id, label]) => <button key={id} className="min-h-[44px] shrink-0 rounded-full border border-white/10 px-4 text-sm" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>{label}</button>)}
      </nav>
      <div className="grid gap-5 xl:grid-cols-2">
        <Section id="profile" title="Profile">
          <div className="mb-4 flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full text-xl font-bold text-white" style={{ background: accentHex(profile.avatar_color) }}>{initials(profile.full_name || user?.email)}</div>
            <div><p className="font-semibold">{user?.email}</p><p className="muted">Student profile</p></div>
          </div>
          <Field label="Display name"><input className="input" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} /></Field>
          <Field label="University"><input className="input" value={profile.university} onChange={e => setProfile({ ...profile, university: e.target.value })} /></Field>
          <Field label="Course"><input className="input" value={profile.course} onChange={e => setProfile({ ...profile, course: e.target.value })} /></Field>
          <Field label="Student ID"><input className="input" value={profile.student_id} onChange={e => setProfile({ ...profile, student_id: e.target.value })} /></Field>
          <Field label="Avatar color"><select className="input" value={profile.avatar_color} onChange={e => setProfile({ ...profile, avatar_color: e.target.value })}>{['blue', 'purple', 'green', 'cyan', 'orange', 'red'].map(c => <option key={c}>{c}</option>)}</select></Field>
          <button className="btn-primary w-full md:w-auto" onClick={saveProfile}><Save className="h-4 w-4" /> Save Profile</button>
        </Section>
        <Section id="account" title="Account & Security">
          <Field label="Change email"><input className="input" type="email" value={security.email} onChange={e => setSecurity({ ...security, email: e.target.value })} /></Field>
          <button className="btn-ghost mb-4 w-full md:w-auto" onClick={updateEmail}>Update Email</button>
          <Field label="New password"><input className="input" type="password" value={security.password} onChange={e => setSecurity({ ...security, password: e.target.value })} /></Field>
          <button className="btn-ghost mb-4 w-full md:w-auto" onClick={updatePassword}>Update Password</button>
          <button className="btn-danger w-full md:w-auto" onClick={deleteAccount}><ShieldAlert className="h-4 w-4" /> Delete Account</button>
        </Section>
        <Section id="appearance" title="Appearance">
          <ThemeSegment value={themeCtx.theme} onChange={themeCtx.setTheme} />
          <Segment label="Accent" value={themeCtx.accentColor} onChange={themeCtx.setAccentColor} options={['blue', 'purple', 'green', 'cyan', 'orange', 'red']} />
          <Segment label="Font size" value={themeCtx.fontSize} onChange={themeCtx.setFontSize} options={['small', 'medium', 'large']} />
          <ToggleRow label="Compact mode" checked={themeCtx.compactMode} onChange={themeCtx.setCompactMode} />
        </Section>
        <Section id="notifications" title="Notification Preferences">
          <PreferenceToggle label="Assignment due reminders" k="assignmentReminders" />
          <Field label="Reminder lead time"><select className="input" defaultValue={pref('reminderLeadTime', '3 days')} onChange={e => setPref('reminderLeadTime', e.target.value)}>{['1 day', '3 days', '1 week'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <PreferenceToggle label="Exam countdown alerts" k="examAlerts" />
          <PreferenceToggle label="Daily AI tip" k="dailyTipEnabled" />
          <PreferenceToggle label="Class start reminders" k="axon_class_notify" />
          <PreferenceToggle label="Exam start reminders" k="axon_exam_notify" />
          <MinuteSelector value={pref('axon_notify_minutes', '10')} onChange={v => setPref('axon_notify_minutes', v)} />
          <button className="btn-ghost w-full md:w-auto" onClick={testNotification}>Test Notification</button>
        </Section>
        <Section id="ai" title="AI Preferences">
          <Field label="Language"><select className="input" defaultValue={pref('aiLanguage', 'English')} onChange={e => setPref('aiLanguage', e.target.value)}>{['English', 'Bahasa Malaysia', '中文'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="Style"><select className="input" defaultValue={pref('aiStyle', 'Casual')} onChange={e => setPref('aiStyle', e.target.value)}>{['Casual', 'Formal', 'Bullet points only'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <PreferenceToggle label="Auto-generate daily tip" k="dailyTipEnabled" />
        </Section>
        <Section title="Timetable Preferences">
          <Field label="First day of week"><select className="input" defaultValue={pref('firstDay', 'Monday')} onChange={e => setPref('firstDay', e.target.value)}>{['Monday', 'Sunday'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="Time format"><select className="input" defaultValue={pref('timeFormat', '24hr')} onChange={e => setPref('timeFormat', e.target.value)}>{['12hr', '24hr'].map(v => <option key={v}>{v}</option>)}</select></Field>
        </Section>
        <Section id="data" title="Data & Privacy">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button className="btn-primary" onClick={exportData}><Download className="h-4 w-4" /> Export my data</button>
            {['assignments', 'exams', 'reminders'].map(table => <button key={table} className="btn-danger" onClick={() => clearTable(table)}><Trash2 className="h-4 w-4" /> Clear {table}</button>)}
            <button className="btn-ghost" onClick={globalSignOut}><LogOut className="h-4 w-4" /> Sign out all devices</button>
          </div>
        </Section>
      </div>
      {ConfirmDialog}
    </main>
  )
}

function Section({ id, title, children }) { return <section id={id} className="card scroll-mt-24 space-y-4"><h2 className="section-header">{title}</h2>{children}</section> }
function Field({ label, children }) { return <label className="block space-y-1"><span className="label">{label}</span>{children}</label> }

function ThemeSegment({ value, onChange }) {
  const options = [['dark', '🌙 Dark'], ['light', '☀️ Light'], ['system', '💻 System']]
  return <div><p className="label">Theme</p><div className="grid grid-cols-3 gap-2">{options.map(([key, label]) => <button key={key} className={`rounded-xl px-3 py-2 text-sm ${value === key ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'border border-white/10'}`} onClick={() => onChange(key)}>{label}</button>)}</div></div>
}

function Segment({ label, value, onChange, options }) {
  return <div><p className="label">{label}</p><div className="flex flex-wrap gap-2">{options.map(opt => <button key={opt} className={`rounded-xl border px-3 py-2 capitalize ${value === opt ? 'border-blue-500 bg-blue-500/20' : 'border-white/10'}`} onClick={() => onChange(opt)}>{opt}</button>)}</div></div>
}

function ToggleRow({ label, checked, onChange }) {
  return <div className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span>{label}</span><ToggleSwitch isOn={checked} onToggle={() => onChange(!checked)} /></div>
}

function PreferenceToggle({ label, k }) {
  const [checked, setChecked] = useState(() => localStorage.getItem(k) !== 'false')
  return <ToggleRow label={label} checked={checked} onChange={next => { setChecked(next); localStorage.setItem(k, String(next)) }} />
}

function MinuteSelector({ value, onChange }) {
  const [selected, setSelected] = useState(String(value))
  return <div><p className="label">Remind me before class/exam starts</p><div className="flex flex-wrap gap-2">{['5', '10', '15', '20'].map(v => <button key={v} onClick={() => { setSelected(v); onChange(v) }} className={`rounded-full px-4 py-2 text-sm ${selected === v ? 'bg-blue-500 text-white' : 'border border-white/10'}`}>{v} minutes</button>)}</div></div>
}

function accentHex(color) {
  return { blue: '#3B82F6', purple: '#8B5CF6', green: '#10B981', cyan: '#06B6D4', orange: '#F97316', red: '#EF4444' }[color] || '#3B82F6'
}
