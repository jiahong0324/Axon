import { useState, useEffect, useMemo } from 'react'
import { Bell, Check, Globe, GraduationCap, Mail, Megaphone, Search, Send, Smartphone, User, Users, X } from 'lucide-react'
import Modal from './Modal'
import { supabase } from '../lib/supabase'
import { studentManager } from '../lib/manageStudent'
import { useToast } from './Toast'

export default function AnnouncementComposerModal({
  isOpen,
  onClose,
  onSuccess,
  editingAnnouncement = null
}) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [universities, setUniversities] = useState([])

  // Form State
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info') // 'info' | 'warning' | 'urgent'
  const [expiresAt, setExpiresAt] = useState('')

  // Targeting State
  const [targetType, setTargetType] = useState('all') // 'all' | 'individual' | 'group'
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [selectedGroup, setSelectedGroup] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  // 3-in-1 Channels State
  const [channels, setChannels] = useState({
    in_app: true,
    push: true,
    email: false
  })

  // Load students & groups
  useEffect(() => {
    if (isOpen) {
      loadStudentsAndGroups()
      if (editingAnnouncement) {
        setTitle(editingAnnouncement.title || '')
        setMessage(editingAnnouncement.message || '')
        setType(editingAnnouncement.type || 'info')
        setExpiresAt(editingAnnouncement.expires_at ? editingAnnouncement.expires_at.slice(0, 10) : '')
        setTargetType(editingAnnouncement.target_type || 'all')
        setSelectedStudentIds(new Set(editingAnnouncement.target_ids || []))
        setSelectedGroup(editingAnnouncement.target_group || '')
        setChannels(editingAnnouncement.channels || { in_app: true, push: false, email: false })
      } else {
        resetForm()
      }
    }
  }, [isOpen, editingAnnouncement])

  function resetForm() {
    setTitle('')
    setMessage('')
    setType('info')
    setExpiresAt('')
    setTargetType('all')
    setSelectedStudentIds(new Set())
    setSelectedGroup('')
    setStudentSearch('')
    setChannels({ in_app: true, push: true, email: false })
  }

  async function loadStudentsAndGroups() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, course, university, student_id')
        .eq('role', 'student')
        .eq('is_active', true)
        .order('full_name')

      if (!error && data) {
        setStudents(data)

        const courseSet = new Set()
        const uniSet = new Set()
        data.forEach(s => {
          if (s.course && s.course.trim()) courseSet.add(s.course.trim())
          if (s.university && s.university.trim()) uniSet.add(s.university.trim())
        })
        setCourses(Array.from(courseSet).sort())
        setUniversities(Array.from(uniSet).sort())
      }
    } catch (e) {
      console.error('Failed to load students for targeting:', e)
    }
  }

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students
    const q = studentSearch.toLowerCase()
    return students.filter(s =>
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.student_id || '').toLowerCase().includes(q)
    )
  }, [students, studentSearch])

  function toggleStudent(id) {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllFiltered() {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      filteredStudents.forEach(s => next.add(s.id))
      return next
    })
  }

  function clearSelection() {
    setSelectedStudentIds(new Set())
  }

  // Calculate target recipients
  const targetRecipientStudents = useMemo(() => {
    if (targetType === 'all') return students
    if (targetType === 'individual') {
      return students.filter(s => selectedStudentIds.has(s.id))
    }
    if (targetType === 'group' && selectedGroup) {
      const g = selectedGroup.toLowerCase()
      return students.filter(s =>
        (s.course || '').toLowerCase() === g ||
        (s.university || '').toLowerCase() === g
      )
    }
    return []
  }, [students, targetType, selectedStudentIds, selectedGroup])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return showToast('Please enter an announcement title.', 'error')
    if (!message.trim()) return showToast('Please enter an announcement message.', 'error')

    if (!channels.in_app && !channels.push && !channels.email) {
      return showToast('Please select at least one delivery channel.', 'error')
    }

    if (targetType === 'individual' && selectedStudentIds.size === 0) {
      return showToast('Please select at least one student.', 'error')
    }
    if (targetType === 'group' && !selectedGroup) {
      return showToast('Please select a course or university group.', 'error')
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const targetIdsArray = targetType === 'individual' ? Array.from(selectedStudentIds) : null

      // 1. If editing an existing announcement, update directly
      if (editingAnnouncement) {
        const payload = {
          title: title.trim(),
          message: message.trim(),
          type,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          target_type: targetType,
          target_ids: targetIdsArray,
          target_group: targetType === 'group' ? selectedGroup : null,
          channels
        }

        const { error: updateError } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingAnnouncement.id)

        if (updateError) throw updateError
        showToast('Announcement updated successfully.', 'success')
        onSuccess?.()
        onClose()
        return
      }

      // 2. Publish New Announcement via Serverless API (handles in-app store + web push)
      let pushCount = 0
      try {
        const response = await fetch('/api/publish-announcement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
            type,
            expires_at: expiresAt || null,
            target_type: targetType,
            target_ids: targetIdsArray,
            target_group: targetType === 'group' ? selectedGroup : null,
            channels
          })
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `Server error ${response.status}`)
        }

        const resData = await response.json()
        pushCount = resData.pushStats?.sent || 0
      } catch (apiErr) {
        // Fallback: If api/publish-announcement fails (e.g. local dev without serverless), write directly to Supabase
        console.warn('API publish fallback to direct Supabase insert:', apiErr)
        const { error: directError } = await supabase.from('announcements').insert({
          manager_id: session.user.id,
          title: title.trim(),
          message: message.trim(),
          type,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          target_type: targetType,
          target_ids: targetIdsArray,
          target_group: targetType === 'group' ? selectedGroup : null,
          channels
        })
        if (directError) throw directError
      }

      // 3. Email Broadcast (if checked)
      let emailSuccessCount = 0
      if (channels.email) {
        const emailRecipients = targetRecipientStudents
          .filter(s => s.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))
          .map(s => ({
            email: s.email.trim(),
            name: s.full_name || 'Student'
          }))

        if (emailRecipients.length > 0) {
          try {
            const emailRes = await studentManager.sendPromotionalEmail({
              subject: title.trim(),
              message: message.trim(),
              audience: 'custom',
              emails: emailRecipients
            })
            emailSuccessCount = emailRes.data?.count || emailRecipients.length
          } catch (emailErr) {
            console.warn('Email broadcast error:', emailErr)
            showToast(`In-app announcement published, but email broadcast could not be sent: ${emailErr.message}`, 'warning')
          }
        }
      }

      // Format clean feedback toast
      const summaryParts = []
      if (channels.in_app) summaryParts.push('In-app saved')
      if (channels.push) summaryParts.push(`Push sent (${pushCount} devices)`)
      if (channels.email && emailSuccessCount > 0) summaryParts.push(`Email sent (${emailSuccessCount})`)

      showToast(`Announcement published! ${summaryParts.join(' • ')}`, 'success')
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Save announcement failed:', err)
      showToast(err.message || 'Failed to publish announcement.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAnnouncement ? 'Edit Announcement' : 'New Announcement & Notification'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* =========================================================================
            1. TARGET AUDIENCE SELECTOR
        ========================================================================= */}
        <div>
          <label className="label mb-2 block font-semibold text-slate-200">
            Target Audience
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTargetType('all')}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-all ${
                targetType === 'all'
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm'
                  : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>All Students ({students.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetType('individual')}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-all ${
                targetType === 'individual'
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm'
                  : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <User className="h-4 w-4" />
              <span>
                {selectedStudentIds.size > 0
                  ? `${selectedStudentIds.size} Selected`
                  : 'Specific Students'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetType('group')}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-all ${
                targetType === 'group'
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm'
                  : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Course / Group</span>
            </button>
          </div>

          {/* Individual Student Selector Drawer */}
          {targetType === 'individual' && (
            <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    className="input h-8 pl-8 text-xs py-0 w-full bg-slate-950/60 border-white/10 placeholder:text-slate-500"
                    placeholder="Search by name, email, or student ID..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-amber-400 hover:underline font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-slate-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
                {filteredStudents.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">No students found</p>
                ) : (
                  filteredStudents.map(student => {
                    const isChecked = selectedStudentIds.has(student.id)
                    return (
                      <label
                        key={student.id}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'bg-amber-500/15 text-slate-200 border border-amber-500/30'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-400/20 h-3.5 w-3.5 shrink-0 cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleStudent(student.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-200 truncate">
                            {student.full_name || 'Unnamed Student'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {student.email} {student.student_id ? `• ${student.student_id}` : ''}
                          </p>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Group Selector */}
          {targetType === 'group' && (
            <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/80 p-3 space-y-2">
              <label className="text-xs text-slate-400 block">Select Course or University Group:</label>
              <select
                className="input text-xs py-2 h-10 w-full bg-slate-950/60"
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                required={targetType === 'group'}
              >
                <option value="">-- Choose Course or University --</option>
                {courses.length > 0 && (
                  <optgroup label="Courses">
                    {courses.map(c => (
                      <option key={`course-${c}`} value={c}>
                        Course: {c}
                      </option>
                    ))}
                  </optgroup>
                )}
                {universities.length > 0 && (
                  <optgroup label="Universities">
                    {universities.map(u => (
                      <option key={`uni-${u}`} value={u}>
                        University: {u}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}
        </div>

        {/* =========================================================================
            2. THE 3 COMBINED DELIVERY CHANNELS
        ========================================================================= */}
        <div>
          <label className="label mb-2 block font-semibold text-slate-200">
            Delivery Channels (3-in-1)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Channel 1: In-App Announcement */}
            <label
              className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer select-none transition-all ${
                channels.in_app
                  ? 'border-amber-500/50 bg-amber-500/10 text-slate-200'
                  : 'border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-400/20 h-4 w-4 shrink-0 cursor-pointer"
                checked={channels.in_app}
                onChange={e => setChannels({ ...channels, in_app: e.target.checked })}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-300">
                  <Smartphone className="h-3.5 w-3.5" /> In-App Alert
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Appears on top when user opens app & stored in Bell drawer
                </p>
              </div>
            </label>

            {/* Channel 2: Push Notification */}
            <label
              className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer select-none transition-all ${
                channels.push
                  ? 'border-amber-500/50 bg-amber-500/10 text-slate-200'
                  : 'border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-400/20 h-4 w-4 shrink-0 cursor-pointer"
                checked={channels.push}
                onChange={e => setChannels({ ...channels, push: e.target.checked })}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-300">
                  <Bell className="h-3.5 w-3.5" /> Push Alert
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Standard device notification (lock screen & upper banner)
                </p>
              </div>
            </label>

            {/* Channel 3: Email Broadcast */}
            <label
              className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer select-none transition-all ${
                channels.email
                  ? 'border-amber-500/50 bg-amber-500/10 text-slate-200'
                  : 'border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-400/20 h-4 w-4 shrink-0 cursor-pointer"
                checked={channels.email}
                onChange={e => setChannels({ ...channels, email: e.target.checked })}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-300">
                  <Mail className="h-3.5 w-3.5" /> Email Broadcast
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Delivers email message directly to students' inboxes
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* =========================================================================
            3. ANNOUNCEMENT CONTENT
        ========================================================================= */}
        <div className="space-y-4">
          <div>
            <label className="label mb-1.5 block">Title</label>
            <input
              className="input"
              required
              placeholder="e.g. Campus Closed Due to Weather, Exam Dates Released"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block">Priority / Urgency</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'info', label: 'Info' },
                  { id: 'warning', label: 'Notice' },
                  { id: 'urgent', label: 'Urgent' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`rounded-xl border py-2 text-xs font-semibold capitalize transition-all ${
                      type === item.id
                        ? item.id === 'urgent'
                          ? 'border-red-500 bg-red-500/20 text-red-300'
                          : item.id === 'warning'
                          ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300'
                          : 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Expires On (Optional)</label>
              <input
                type="date"
                className="input"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block">Message Body</label>
            <textarea
              className="input min-h-32 text-sm leading-relaxed"
              required
              placeholder="Write the full message details for the students..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
        </div>

        {/* =========================================================================
            4. ACTION BUTTONS
        ========================================================================= */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <p className="text-xs text-slate-400">
            Sending to{' '}
            <strong className="text-amber-300">
              {targetType === 'all'
                ? `All ${students.length} students`
                : targetType === 'individual'
                ? `${selectedStudentIds.size} student${selectedStudentIds.size === 1 ? '' : 's'}`
                : selectedGroup
                ? `Group: ${selectedGroup}`
                : 'Select group'}
            </strong>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-ghost px-4 py-2 text-xs min-h-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="manager-primary-btn px-5 py-2 text-xs min-h-0 flex items-center gap-2"
            >
              <Send className="h-3.5 w-3.5" />
              {loading
                ? 'Publishing...'
                : editingAnnouncement
                ? 'Update Announcement'
                : 'Publish & Send'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
