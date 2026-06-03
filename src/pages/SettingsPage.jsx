import { Download, LogOut, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ToggleSwitch from '../components/ToggleSwitch'
import { useConfirmDialog } from '../components/ConfirmModal'
import { useTheme } from '../components/ThemeProvider'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { initials, formatTime } from '../lib/utils'
import { registerPushSubscription } from '../lib/pushNotifications'
import { updatePreference } from '../lib/preferences'

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
  const [notificationPermission, setNotificationPermission] = useState('Notification' in window ? Notification.permission : 'default')
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => { loadUser() }, [])

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setUser(user)
    setProfile({
      full_name: profileRow?.full_name || user?.user_metadata?.full_name || '',
      university: profileRow?.university || user?.user_metadata?.university || '',
      course: profileRow?.course || user?.user_metadata?.course || '',
      student_id: profileRow?.student_id || user?.user_metadata?.student_id || '',
      avatar_color: colorName(profileRow?.avatar_color || user?.user_metadata?.avatar_color || 'blue')
    })
    setSecurity(s => ({ ...s, email: profileRow?.email || user?.email || '' }))
  }

  async function saveProfile() {
    const { error } = await supabase.auth.updateUser({ data: profile })
    if (!error && user) {
      await supabase.from('profiles').update({
        full_name: profile.full_name,
        university: profile.university,
        course: profile.course,
        student_id: profile.student_id,
        avatar_color: accentHex(profile.avatar_color)
      }).eq('id', user.id)
    }
    showToast(error ? 'Profile could not be saved.' : 'Profile saved.', error ? 'error' : 'success')
  }

  async function updateEmail() {
    const { error } = await supabase.auth.updateUser({ email: security.email })
    if (!error && user) await supabase.from('profiles').update({ email: security.email }).eq('id', user.id)
    showToast(error ? 'Email update failed.' : 'Check your inbox to confirm the new email.', error ? 'error' : 'success')
  }

  async function updatePassword() {
    const { error } = await supabase.auth.updateUser({ password: security.password })
    showToast(error ? 'Password update failed.' : 'Password updated.', error ? 'error' : 'success')
    setSecurity(s => ({ ...s, password: '' }))
  }

  async function exportData() {
    showToast('Preparing academic PDF report...', 'info')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return showToast('User session not found.', 'error')

      const tables = ['classes', 'assignments', 'exams', 'reminders']
      const result = {}
      for (const table of tables) {
        const { data } = await supabase.from(table).select('*').eq('user_id', user.id)
        result[table] = data || []
      }

      const doc = new jsPDF()

      // --- Title & Header ---
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(15, 23, 42) // slate-900
      doc.text('AXON ACADEMIC OVERVIEW', 15, 20)

      // Accent Line
      doc.setDrawColor(59, 130, 246) // blue-500
      doc.setLineWidth(1)
      doc.line(15, 24, 195, 24)

      // Student Profile Info
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(71, 85, 105) // slate-600

      // Left Column Info
      doc.text(`Student Name: ${profile.full_name || 'N/A'}`, 15, 32)
      doc.text(`Email Address: ${user.email || 'N/A'}`, 15, 38)
      doc.text(`University: ${profile.university || 'N/A'}`, 15, 44)

      // Right Column Info
      doc.text(`Course/Major: ${profile.course || 'N/A'}`, 110, 32)
      doc.text(`Student ID: ${profile.student_id || 'N/A'}`, 110, 38)
      doc.text(`Export Date: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 110, 44)

      let yPos = 52

      // Function to add table if there is data
      const addSectionTable = (title, headers, rows, emptyMsg) => {
        // Add section header
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(15, 23, 42) // slate-900

        // Check space remaining, page break if needed
        if (yPos > 240) {
          doc.addPage()
          yPos = 20
        }

        doc.text(title, 15, yPos)
        yPos += 4

        if (rows.length === 0) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(10)
          doc.setTextColor(148, 163, 184) // slate-400
          doc.text(emptyMsg, 15, yPos)
          yPos += 12
        } else {
          autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: rows,
            margin: { left: 15, right: 15 },
            theme: 'striped',
            headStyles: {
              fillColor: [30, 41, 59], // slate-800
              textColor: 255,
              fontStyle: 'bold'
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252] // slate-50
            },
            styles: {
              fontSize: 9,
              cellPadding: 3
            }
          })
          yPos = doc.lastAutoTable.finalY + 12
        }
      }

      // 1. Classes
      const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const classesData = (result.classes || []).sort((a, b) => {
        const dayDiff = daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day)
        if (dayDiff !== 0) return dayDiff
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      }).map(c => [
        c.day,
        c.subject,
        `${formatTime(c.start_time)} - ${formatTime(c.end_time)}`,
        c.class_type === 'L' ? 'Lecture' : c.class_type === 'T' ? 'Tutorial' : c.class_type === 'P' ? 'Practical' : c.class_type || '',
        c.classroom || 'TBA',
        c.lecturer || 'TBA'
      ])
      addSectionTable(
        'Weekly Timetable',
        ['Day', 'Subject', 'Time', 'Type', 'Classroom', 'Lecturer'],
        classesData,
        'No classes in timetable.'
      )

      // 2. Assignments
      const assignmentsData = (result.assignments || []).sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline.localeCompare(b.deadline)
      }).map(a => [
        a.title,
        a.subject,
        a.deadline ? new Date(a.deadline).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A',
        a.priority,
        a.status,
        a.notes || ''
      ])
      addSectionTable(
        'Assignments',
        ['Title', 'Subject', 'Deadline', 'Priority', 'Status', 'Notes'],
        assignmentsData,
        'No assignments found.'
      )

      // 3. Exams
      const examsData = (result.exams || []).sort((a, b) => {
        if (!a.exam_date) return 1
        if (!b.exam_date) return -1
        return a.exam_date.localeCompare(b.exam_date)
      }).map(e => [
        e.subject,
        e.exam_type,
        e.exam_date ? new Date(e.exam_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A',
        e.start_time && e.end_time ? `${formatTime(e.start_time)} - ${formatTime(e.end_time)}` : formatTime(e.start_time) || 'TBA',
        e.venue || 'TBA',
        e.notes || ''
      ])
      addSectionTable(
        'Exams Schedule',
        ['Subject', 'Type', 'Date', 'Time', 'Venue', 'Notes'],
        examsData,
        'No exams found.'
      )

      // 4. Reminders
      const remindersData = (result.reminders || []).sort((a, b) => {
        if (!a.reminder_time) return 1
        if (!b.reminder_time) return -1
        return a.reminder_time.localeCompare(b.reminder_time)
      }).map(r => [
        r.title,
        formatTime(r.reminder_time) || 'TBA',
        r.repeat_type,
        r.is_active ? 'Active' : 'Inactive'
      ])
      addSectionTable(
        'Smart Reminders',
        ['Title', 'Time', 'Repeat Type', 'Status'],
        remindersData,
        'No reminders found.'
      )

      // Add Page Numbers/Footer dynamically on each page
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(`Page ${i} of ${pageCount}`, 195, 287, { align: 'right' })
        doc.text('Generated by Axon Academic Planner', 15, 287)
      }

      doc.save('axon-academic-report.pdf')
      showToast('PDF report successfully exported!', 'success')
    } catch (error) {
      console.error(error)
      showToast('Failed to export PDF report.', 'error')
    }
  }

  async function clearTable(table) {
    const displayName = table === 'classes' ? 'timetable' : table
    if (!await confirm({ title: `Clear ${displayName}?`, message: `All ${displayName} will be deleted. This cannot be undone.`, confirmText: 'Clear' })) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from(table).delete().eq('user_id', user.id)
    showToast(`${displayName.charAt(0).toUpperCase() + displayName.slice(1)} cleared.`, 'success')

    if (table === 'push_subscriptions' && 'Notification' in window && Notification.permission === 'granted') {
      showToast('Re-registering this device...', 'info')
      const sub = await registerPushSubscription(user)
      if (sub) {
        showToast('This device successfully re-registered for notifications!', 'success')
      } else {
        showToast('Auto-registration failed. Please refresh the page.', 'error')
      }
    }
  }

  async function deleteAccount() {
    if (!await confirm({ title: 'Delete account?', message: 'This permanently deletes your Axon account. Please confirm before continuing.', confirmText: 'Delete account' })) return
    
    try {
      const { error } = await supabase.rpc('delete_user')
      if (error) throw error

      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      showToast('Could not delete account. Server configuration missing.', 'error')
    }
  }

  async function globalSignOut() {
    await supabase.auth.signOut({ scope: 'global' })
    navigate('/login')
  }

  async function enablePush() {
    if (!('Notification' in window)) return
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      
      if (permission === 'granted') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          showToast('Registering push notification service...', 'info')
          const sub = await registerPushSubscription(user)
          if (sub) {
            showToast('Push notifications successfully registered!', 'success')
          } else {
            showToast('Push registration failed. Check console.', 'error')
          }
        }
      } else if (permission === 'denied') {
        showToast('Notification permission was denied.', 'warning')
      }
    } catch (err) {
      console.error(err)
      showToast('Error requesting notification permission.', 'error')
    }
  }

  async function sendTestPushNotification() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSendingTest(true)
    try {
      const res = await fetch('/api/send-test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Background push sent! Check your device.', 'success')
      } else {
        showToast(data.error || 'Failed to send test push.', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Connection error. Failed to trigger test push.', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  async function testNotification() {
    if (!('Notification' in window)) return showToast('Notifications are not supported in this browser.', 'error')
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
    if (Notification.permission !== 'granted') return showToast('Notification permission is not enabled.', 'error')
    new Notification('Axon test', { body: 'Notifications are working.', icon: '/icons/logo.png' })
  }

  const [prefTick, setPrefTick] = useState(0)
  useEffect(() => {
    const handleSync = () => setPrefTick(t => t + 1)
    window.addEventListener('preferences-synced', handleSync)
    return () => window.removeEventListener('preferences-synced', handleSync)
  }, [])

  function pref(key, fallback) { return localStorage.getItem(key) ?? fallback }
  function setPref(key, value) { updatePreference(user, key, value); showToast('Preference saved.', 'success') }

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

        <Section id="notifications" title="Notification Preferences">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400">Push Notifications</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Receive background notifications on this device</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  !('Notification' in window) ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  notificationPermission === 'granted' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                  notificationPermission === 'denied' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                }`}>
                  {!('Notification' in window) ? 'Not Supported' :
                   notificationPermission === 'granted' ? 'Enabled' :
                   notificationPermission === 'denied' ? 'Blocked' :
                   'Disabled'}
                </span>
              </div>

              <div className="pt-2">
                {!('Notification' in window) ? (
                  <p className="text-xs leading-relaxed text-amber-500/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    ⚠️ Web Push is not supported in this browser. To receive push notifications on iOS/iPhone, tap Safari's <strong>Share</strong> button, select <strong>"Add to Home Screen"</strong>, then open the Axon app from your home screen.
                  </p>
                ) : notificationPermission === 'default' ? (
                  <button className="btn-primary w-full py-2.5 rounded-xl font-semibold" onClick={enablePush}>
                    🔔 Enable Push Notifications
                  </button>
                ) : notificationPermission === 'denied' ? (
                  <p className="text-xs leading-relaxed text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    ❌ Notifications are blocked on this browser/device. Please open your device's System Settings or Browser Site Settings to allow notifications for Axon.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-green-400/90 bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                      ✅ This device is successfully registered to receive background notifications!
                    </p>
                    <div className="flex gap-2">
                      <button className="btn-ghost flex-1 py-2 text-xs" onClick={sendTestPushNotification} disabled={sendingTest}>
                        {sendingTest ? 'Sending...' : '🚀 Send Test Background Push'}
                      </button>
                      <button className="btn-ghost flex-1 py-2 text-xs" onClick={testNotification}>
                        Test Foreground Alert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-white/10 w-full" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-400">Deadlines & Due Dates</h4>
              <PreferenceToggle label="Assignment due reminders" k="assignmentReminders" />
              <PreferenceToggle label="Exam countdown alerts" k="examAlerts" />
              <div className="mt-2">
                <Field label="Remind me before deadline:">
                  <select key={`due-remind-${prefTick}`} className="input" defaultValue={pref('reminderLeadTime', '3 days')} onChange={e => setPref('reminderLeadTime', e.target.value)}>
                    {['1 day', '3 days', '1 week'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div className="h-px bg-white/10 w-full" />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-purple-400">Event Start Reminders</h4>
              <PreferenceToggle label="Class start reminders" k="axon_class_notify" />
              <PreferenceToggle label="Exam start reminders" k="axon_exam_notify" />
              <div className="mt-2">
                <MinuteSelector key={`min-sel-${prefTick}`} value={pref('axon_notify_minutes', '10')} onChange={v => setPref('axon_notify_minutes', v)} />
              </div>
            </div>

          </div>
        </Section>
        <Section id="appearance" title="Appearance">
          <ThemeSegment value={themeCtx.theme} onChange={themeCtx.setTheme} />
          <Segment label="Accent" value={themeCtx.accentColor} onChange={themeCtx.setAccentColor} options={['blue', 'purple', 'green', 'cyan', 'orange', 'red']} />
          <Segment label="Font size" value={themeCtx.fontSize} onChange={themeCtx.setFontSize} options={['small', 'medium', 'large']} />
          <ToggleRow label="Compact mode" checked={themeCtx.compactMode} onChange={themeCtx.setCompactMode} />
        </Section>
        <Section id="account" title="Account & Security">
          <Field label="Change email"><input className="input" type="email" value={security.email} onChange={e => setSecurity({ ...security, email: e.target.value })} /></Field>
          <button className="btn-ghost mb-4 w-full md:w-auto" onClick={updateEmail}>Update Email</button>
          <Field label="New password"><input className="input" type="password" value={security.password} onChange={e => setSecurity({ ...security, password: e.target.value })} /></Field>
          <button className="btn-ghost mb-4 w-full md:w-auto" onClick={updatePassword}>Update Password</button>
          <button className="btn-danger w-full md:w-auto" onClick={deleteAccount}><ShieldAlert className="h-4 w-4" /> Delete Account</button>
        </Section>
        <Section id="ai" title="AI Preferences">
          <Field label="Language"><select key={`ai-lang-${prefTick}`} className="input" defaultValue={pref('aiLanguage', 'English')} onChange={e => setPref('aiLanguage', e.target.value)}>{['English', 'Bahasa Malaysia', '中文'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="Style"><select key={`ai-style-${prefTick}`} className="input" defaultValue={pref('aiStyle', 'Casual')} onChange={e => setPref('aiStyle', e.target.value)}>{['Casual', 'Formal', 'Bullet points only'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <PreferenceToggle label="Auto-generate daily tip" k="dailyTipEnabled" />
        </Section>
        <Section title="Timetable Preferences">
          <Field label="First day of week"><select key={`first-day-${prefTick}`} className="input" defaultValue={pref('firstDay', 'Monday')} onChange={e => setPref('firstDay', e.target.value)}>{['Monday', 'Sunday'].map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="Time format"><select key={`time-format-${prefTick}`} className="input" defaultValue={pref('timeFormat', '24hr')} onChange={e => setPref('timeFormat', e.target.value)}>{['12hr', '24hr'].map(v => <option key={v}>{v}</option>)}</select></Field>
        </Section>
        <Section id="data" title="Data & Privacy">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button className="btn-primary" onClick={exportData}><Download className="h-4 w-4" /> Export my data</button>

            {['classes', 'assignments', 'exams', 'reminders'].map(table => <button key={table} className="btn-danger" onClick={() => clearTable(table)}><Trash2 className="h-4 w-4" /> Clear {table === 'classes' ? 'timetable' : table}</button>)}
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

  useEffect(() => {
    const handleSync = () => {
      setChecked(localStorage.getItem(k) !== 'false')
    }
    window.addEventListener('preferences-synced', handleSync)
    return () => window.removeEventListener('preferences-synced', handleSync)
  }, [k])

  return <ToggleRow label={label} checked={checked} onChange={next => { setChecked(next); updatePreference(null, k, next) }} />
}

function MinuteSelector({ value, onChange }) {
  const [selected, setSelected] = useState(String(value))

  useEffect(() => {
    setSelected(String(value))
  }, [value])

  return <div><p className="label">Remind me before class/exam starts</p><div className="flex flex-wrap gap-2">{['5', '10', '15', '20', '30'].map(v => <button key={v} onClick={() => { setSelected(v); onChange(v) }} className={`rounded-full px-4 py-2 text-sm ${selected === v ? 'bg-blue-500 text-white' : 'border border-white/10'}`}>{v} minutes</button>)}</div></div>
}

function accentHex(color) {
  return { blue: '#3B82F6', purple: '#8B5CF6', green: '#10B981', cyan: '#06B6D4', orange: '#F97316', red: '#EF4444' }[color] || '#3B82F6'
}

function colorName(value) {
  if (!value?.startsWith?.('#')) return value || 'blue'
  const normalized = value.toUpperCase()
  const match = Object.entries({ blue: '#3B82F6', purple: '#8B5CF6', green: '#10B981', cyan: '#06B6D4', orange: '#F97316', red: '#EF4444' }).find(([, hex]) => hex === normalized)
  return match?.[0] || 'blue'
}
