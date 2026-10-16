import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Bell,
  Check,
  Globe,
  Mail,
  Megaphone,
  Search,
  Send,
  Smartphone,
  User,
  Users,
  X,
  Info,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react'
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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // =========================================================================
  // NO DEFAULTS: Everything starts completely empty!
  // =========================================================================
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('') // '' | 'info' | 'warning' | 'urgent' (none selected initially)
  const [expiresAt, setExpiresAt] = useState('')

  // Audience: '' | 'all' | 'individual' (neither selected initially)
  const [targetType, setTargetType] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [studentSearch, setStudentSearch] = useState('')

  // Delivery Channels: All 3 start UNCHECKED
  const [channels, setChannels] = useState({
    in_app: false,
    push: false,
    email: false
  })

  // Has attempted submit (for validation cues if needed)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Reset form to empty state
  function resetForm() {
    setTitle('')
    setMessage('')
    setType('')
    setExpiresAt('')
    setTargetType('')
    setSelectedStudentIds(new Set())
    setStudentSearch('')
    setChannels({ in_app: false, push: false, email: false })
    setHasSubmitted(false)
    setShowDiscardConfirm(false)
  }

  // Load students & handle open/close resets
  useEffect(() => {
    if (isOpen) {
      loadStudents()
      if (editingAnnouncement) {
        setTitle(editingAnnouncement.title || '')
        setMessage(editingAnnouncement.message || '')
        setType(editingAnnouncement.type || '')
        setExpiresAt(editingAnnouncement.expires_at ? editingAnnouncement.expires_at.slice(0, 10) : '')
        setTargetType(editingAnnouncement.target_type || '')
        setSelectedStudentIds(new Set(editingAnnouncement.target_ids || []))
        setChannels(editingAnnouncement.channels || { in_app: false, push: false, email: false })
      } else {
        resetForm()
      }
    } else {
      resetForm()
    }
  }, [isOpen, editingAnnouncement])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        handleAttemptClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, title, message, type, targetType, channels, selectedStudentIds])

  async function loadStudents() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, student_id')
        .eq('role', 'student')
        .eq('is_active', true)
        .order('full_name')

      if (!error && data) {
        setStudents(data)
      }
    } catch (e) {
      console.error('Failed to load students:', e)
    }
  }

  // Check if form has unsaved content
  const isDirty = useMemo(() => {
    return Boolean(
      title.trim() ||
      message.trim() ||
      type ||
      targetType ||
      expiresAt ||
      channels.in_app ||
      channels.push ||
      channels.email ||
      selectedStudentIds.size > 0
    )
  }, [title, message, type, targetType, expiresAt, channels, selectedStudentIds])

  function handleAttemptClose() {
    if (isDirty && !showDiscardConfirm) {
      setShowDiscardConfirm(true)
    } else {
      resetForm()
      onClose()
    }
  }

  function handleConfirmDiscard() {
    resetForm()
    onClose()
  }

  // Student filtering for multi-select
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students
    const q = studentSearch.toLowerCase()
    return students.filter(s =>
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.student_id || '').toLowerCase().includes(q)
    )
  }, [students, studentSearch])

  const selectedStudentsList = useMemo(() => {
    return students.filter(s => selectedStudentIds.has(s.id))
  }, [students, selectedStudentIds])

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

  // =========================================================================
  // Validation Logic (Must satisfy ALL to enable Send button)
  // =========================================================================
  const isAudienceValid = Boolean(
    targetType === 'all' || (targetType === 'individual' && selectedStudentIds.size > 0)
  )
  const isChannelsValid = Boolean(channels.in_app || channels.push || channels.email)
  const isPriorityValid = Boolean(type === 'info' || type === 'warning' || type === 'urgent')
  const isTitleValid = Boolean(title.trim().length > 0)
  const isMessageValid = Boolean(message.trim().length > 0)

  const isFormValid = isAudienceValid && isChannelsValid && isPriorityValid && isTitleValid && isMessageValid

  // Target count description
  const recipientCount = targetType === 'all'
    ? students.length
    : targetType === 'individual'
    ? selectedStudentIds.size
    : 0

  const activeChannelsCount = [channels.in_app, channels.push, channels.email].filter(Boolean).length

  // Submission handler
  async function handleSubmit(e) {
    e?.preventDefault?.()
    setHasSubmitted(true)

    if (!isFormValid) {
      if (!isAudienceValid) return showToast('Please choose a target audience.', 'error')
      if (!isChannelsValid) return showToast('Please select at least one delivery channel.', 'error')
      if (!isTitleValid) return showToast('Please enter an announcement title.', 'error')
      if (!isPriorityValid) return showToast('Please choose a priority level.', 'error')
      if (!isMessageValid) return showToast('Please write the announcement message.', 'error')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const targetIdsArray = targetType === 'individual' ? Array.from(selectedStudentIds) : null

      // 1. If editing an existing announcement
      if (editingAnnouncement) {
        const payload = {
          title: title.trim(),
          message: message.trim(),
          type,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          target_type: targetType,
          target_ids: targetIdsArray,
          channels
        }

        const { error: updateError } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingAnnouncement.id)

        if (updateError) throw updateError
        showToast('Announcement updated successfully.', 'success')
        onSuccess?.()
        resetForm()
        onClose()
        return
      }

      // 2. Publish New Announcement via Serverless API
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
        // Fallback: If in_app is enabled, insert directly
        if (channels.in_app) {
          console.warn('API publish fallback to direct Supabase insert:', apiErr)
          const { error: directError } = await supabase.from('announcements').insert({
            manager_id: session.user.id,
            title: title.trim(),
            message: message.trim(),
            type,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            target_type: targetType,
            target_ids: targetIdsArray,
            channels
          })
          if (directError) throw directError
        }
      }

      // 3. Email Broadcast (if enabled)
      let emailSuccessCount = 0
      if (channels.email) {
        const emailRecipients = (targetType === 'all' ? students : selectedStudentsList)
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
            showToast(`Announcement published, but email broadcast failed: ${emailErr.message}`, 'warning')
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
      resetForm()
      onClose()
    } catch (err) {
      console.error('Save announcement failed:', err)
      showToast(err.message || 'Failed to publish announcement.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) handleAttemptClose()
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-2xl border border-white/10 bg-[#0F172A] shadow-2xl overflow-hidden text-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* =========================================================================
            STICKY HEADER
        ========================================================================= */}
        <header className="shrink-0 px-5 sm:px-6 py-4 border-b border-white/10 bg-[#0F172A]/95 backdrop-blur-md flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-500 shrink-0" />
              <span>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement & Notification'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Send a message to your students across web, device push, and email.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Discard confirmation warning banner */}
        {showDiscardConfirm && (
          <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-4 w-4" /> You have unsaved changes. Discard draft?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-2.5 py-1 rounded-md bg-white/10 text-white hover:bg-white/15 transition-colors font-medium"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-2.5 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCROLLABLE BODY
        ========================================================================= */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <form id="announcement-form" onSubmit={handleSubmit} className="space-y-5">
              {/* 1. TARGET AUDIENCE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Target Audience
                  </label>
                  {!targetType && (
                    <span className="text-xs text-slate-500 font-normal">Choose an audience</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('all')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                      targetType === 'all'
                        ? 'border-blue-500 bg-blue-500/10 text-white shadow-sm ring-1 ring-blue-500/30'
                        : 'border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className={`h-4 w-4 ${targetType === 'all' ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span>All Students</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      targetType === 'all' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400'
                    }`}>
                      {students.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('individual')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                      targetType === 'individual'
                        ? 'border-blue-500 bg-blue-500/10 text-white shadow-sm ring-1 ring-blue-500/30'
                        : 'border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className={`h-4 w-4 ${targetType === 'individual' ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span>Specific Students</span>
                    </div>
                    {selectedStudentIds.size > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300">
                        {selectedStudentIds.size}
                      </span>
                    )}
                  </button>
                </div>

                {/* Specific Students Multi-Select Drawer */}
                {targetType === 'individual' && (
                  <div className="mt-2 space-y-2.5 rounded-xl border border-white/10 bg-slate-900/70 p-3 animate-in fade-in duration-150">
                    {/* Selected chips row */}
                    {selectedStudentsList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/50 rounded-lg border border-white/5 max-h-24 overflow-y-auto scrollbar-thin">
                        {selectedStudentsList.map(s => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] px-2 py-0.5 font-medium"
                          >
                            <span className="truncate max-w-[120px]">{s.full_name || s.email}</span>
                            <button
                              type="button"
                              onClick={() => toggleStudent(s.id)}
                              className="text-blue-400 hover:text-white rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Search & Actions Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          className="h-8 pl-8 text-xs py-0 w-full rounded-lg bg-slate-950/70 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                          placeholder="Search student name, email, or ID..."
                          value={studentSearch}
                          onChange={e => setStudentSearch(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs shrink-0">
                        <button
                          type="button"
                          onClick={selectAllFiltered}
                          className="text-blue-400 hover:underline font-medium text-[11px]"
                        >
                          Select All
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="text-slate-400 hover:underline text-[11px]"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Student List */}
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {filteredStudents.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-500">No students match your search</p>
                      ) : (
                        filteredStudents.map(student => {
                          const isChecked = selectedStudentIds.has(student.id)
                          return (
                            <label
                              key={student.id}
                              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors ${
                                isChecked
                                  ? 'bg-blue-500/10 text-slate-100 border border-blue-500/30'
                                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="rounded border-white/20 bg-slate-900 text-blue-500 focus:ring-blue-400/20 h-3.5 w-3.5 shrink-0 cursor-pointer"
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
              </div>

              {/* 2. DELIVERY CHANNELS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Delivery Channels
                  </label>
                  {!isChannelsValid && (
                    <span className="text-xs text-slate-500 font-normal">Select at least one channel</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Channel 1: In-App */}
                  <div
                    onClick={() => setChannels({ ...channels, in_app: !channels.in_app })}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
                      channels.in_app
                        ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/30'
                        : 'border-white/10 bg-slate-900/40 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-1.5 rounded-lg ${channels.in_app ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500'}`}>
                        <Smartphone className="h-4 w-4" />
                      </div>
                      {channels.in_app && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold text-xs ${channels.in_app ? 'text-white' : 'text-slate-300'}`}>
                        In-App Alert
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Top banner & Notification Center
                      </p>
                    </div>
                  </div>

                  {/* Channel 2: Push */}
                  <div
                    onClick={() => setChannels({ ...channels, push: !channels.push })}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
                      channels.push
                        ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/30'
                        : 'border-white/10 bg-slate-900/40 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-1.5 rounded-lg ${channels.push ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500'}`}>
                        <Bell className="h-4 w-4" />
                      </div>
                      {channels.push && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold text-xs ${channels.push ? 'text-white' : 'text-slate-300'}`}>
                        Push Notification
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Lock screen & device top banner
                      </p>
                    </div>
                  </div>

                  {/* Channel 3: Email */}
                  <div
                    onClick={() => setChannels({ ...channels, email: !channels.email })}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
                      channels.email
                        ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/30'
                        : 'border-white/10 bg-slate-900/40 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-1.5 rounded-lg ${channels.email ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500'}`}>
                        <Mail className="h-4 w-4" />
                      </div>
                      {channels.email && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold text-xs ${channels.email ? 'text-white' : 'text-slate-300'}`}>
                        Email Broadcast
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Direct to student email inboxes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. TITLE INPUT */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Title
                  </label>
                  <span className={`text-[11px] font-mono ${title.length > 90 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {title.length}/100
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-slate-900/60 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="e.g. Campus Closed Tomorrow, Exam Schedules Released"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              {/* 4. PRIORITY & EXPIRES ON (SAME ROW) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Priority
                    </label>
                    {!type && (
                      <span className="text-xs text-slate-500 font-normal">Choose a priority</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Info = Blue */}
                    <button
                      type="button"
                      onClick={() => setType('info')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all duration-150 ${
                        type === 'info'
                          ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 shadow-sm ring-1 ring-blue-500/30'
                          : 'border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20 hover:text-slate-200'
                      }`}
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span>Info</span>
                    </button>

                    {/* Notice = Amber */}
                    <button
                      type="button"
                      onClick={() => setType('warning')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all duration-150 ${
                        type === 'warning'
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-400 shadow-sm ring-1 ring-amber-500/30'
                          : 'border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20 hover:text-slate-200'
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Notice</span>
                    </button>

                    {/* Urgent = Red */}
                    <button
                      type="button"
                      onClick={() => setType('urgent')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all duration-150 ${
                        type === 'urgent'
                          ? 'border-red-500/50 bg-red-500/15 text-red-400 shadow-sm ring-1 ring-red-500/30'
                          : 'border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20 hover:text-slate-200'
                      }`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Urgent</span>
                    </button>
                  </div>
                </div>

                {/* Expires On */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Expires On <span className="text-slate-500 font-normal normal-case">(Optional)</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-slate-900/60 border border-white/10 text-slate-200 [color-scheme:dark] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all h-[42px]"
                      value={expiresAt}
                      onChange={e => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 5. MESSAGE BODY */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Message Body
                  </label>
                  <span className={`text-[11px] font-mono ${message.length > 450 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {message.length}/500
                  </span>
                </div>
                <textarea
                  maxLength={500}
                  className="w-full rounded-xl px-3.5 py-3 text-sm bg-slate-900/60 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[120px] leading-relaxed resize-y"
                  placeholder="Type the full announcement message here..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>
          </form>
        </div>

        {/* =========================================================================
            STICKY FOOTER
        ========================================================================= */}
        <footer className="shrink-0 px-5 sm:px-6 py-4 border-t border-white/10 bg-[#0F172A]/95 backdrop-blur-md flex items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="text-xs text-slate-400 min-w-0">
            {isFormValid ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5 truncate">
                <Check className="h-4 w-4 shrink-0" />
                <span>Ready to send to {recipientCount} student{recipientCount === 1 ? '' : 's'} via {activeChannelsCount} channel{activeChannelsCount === 1 ? '' : 's'}</span>
              </span>
            ) : (
              <span className="text-slate-500 truncate block">
                {!isAudienceValid
                  ? '• Choose an audience'
                  : !isChannelsValid
                  ? '• Select at least one channel'
                  : !isTitleValid
                  ? '• Enter a title'
                  : !isPriorityValid
                  ? '• Select a priority'
                  : '• Enter message body'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleAttemptClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="announcement-form"
              disabled={!isFormValid || loading}
              className={`px-5 py-2.5 rounded-xl font-semibold text-xs inline-flex items-center gap-2 transition-all duration-150 ${
                isFormValid && !loading
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{editingAnnouncement ? 'Save Changes' : 'Send Announcement'}</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
