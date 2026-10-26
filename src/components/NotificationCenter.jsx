import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  X,
  ArrowLeft,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  Info
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { parseAnnouncement } from '../lib/announcements'

export default function NotificationCenter({ user, profile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [readIds, setReadIds] = useState(new Set())
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [loading, setLoading] = useState(true)

  // Touch handling for mobile swipe-down dismiss
  const [touchOffset, setTouchOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const contentRef = useRef(null)
  const sheetRef = useRef(null)
  const historyPushedRef = useRef(false)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('axon_open_notifications', handleOpen)
    return () => window.removeEventListener('axon_open_notifications', handleOpen)
  }, [])

  useEffect(() => {
    if (!user) return
    loadData()

    // Realtime subscription for instant updates when manager sends an announcement
    const channel = supabase
      .channel('announcements-center-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_reads' }, () => {
        loadData()
      })
      .subscribe()

    const handleSync = () => loadData()
    window.addEventListener('axon_announcements_updated', handleSync)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('axon_announcements_updated', handleSync)
    }
  }, [user?.id, profile?.course, profile?.university])

  // Android hardware back / browser back & Escape handling for the detail view
  useEffect(() => {
    if (!selectedAnnouncement) return

    // Push history state so back button closes the detail view instead of leaving the app
    window.history.pushState({ axonModal: 'notification-detail' }, '')
    historyPushedRef.current = true

    const handlePopState = () => {
      historyPushedRef.current = false
      closeDetail(false)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeDetail(true)
      }
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('keydown', handleKeyDown)
      if (historyPushedRef.current) {
        historyPushedRef.current = false
        if (window.history.state?.axonModal === 'notification-detail') {
          window.history.back()
        }
      }
    }
  }, [selectedAnnouncement?.id])

  async function openAnnouncementById(targetId) {
    if (!targetId) return
    setIsOpen(true)

    // 1. Check if already loaded in state
    const found = announcements.find(a => String(a.id) === String(targetId))
    if (found) {
      setSelectedAnnouncement(found)
      markAsRead(found.id)
      return
    }

    // 2. Fetch directly from database if not yet loaded in list
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', targetId)
        .maybeSingle()

      if (data && !error) {
        const parsed = parseAnnouncement(data)
        setAnnouncements(prev => {
          if (prev.some(a => String(a.id) === String(parsed.id))) return prev
          return [parsed, ...prev]
        })
        setSelectedAnnouncement(parsed)
        markAsRead(parsed.id)
      }
    } catch (e) {
      console.warn('Failed to fetch target announcement:', e)
    }
  }

  // Detect URL parameter ?open_announcement=<id> when student taps push notification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const annId = params.get('open_announcement')
    if (annId) {
      openAnnouncementById(annId)
      // Clean query parameter from URL so browser refresh does not re-open it indefinitely
      const cleanUrl = window.location.pathname + window.location.hash
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [announcements.length])

  // Listen to Service Worker message or custom window event when app is already open
  useEffect(() => {
    const handleSwMessage = (event) => {
      if (event.data?.type === 'OPEN_ANNOUNCEMENT' && event.data.announcementId) {
        openAnnouncementById(event.data.announcementId)
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSwMessage)

    const handleCustom = (event) => {
      if (event.detail?.id) {
        openAnnouncementById(event.detail.id)
      }
    }
    window.addEventListener('axon_open_announcement', handleCustom)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage)
      window.removeEventListener('axon_open_announcement', handleCustom)
    }
  }, [announcements])

  async function loadData() {
    if (!user) return
    try {
      // 1. Fetch announcements
      const { data: rawAnnouncements, error: annError } = await supabase
        .from('announcements')
        .select('*')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })

      if (annError) {
        console.warn('Error fetching announcements:', annError.message)
      }

      // Filter announcements relevant to this student (push or in-app, excluding email-only)
      const userAnnouncements = (rawAnnouncements || [])
        .map(parseAnnouncement)
        .filter(item => {
          // If neither in-app nor push was selected (e.g. email-only), do not show in notifications drawer
          if (item.channels && item.channels.in_app === false && item.channels.push === false) {
            return false
          }

          const targetType = item.target_type || 'all'
          if (targetType === 'all') return true
          if (targetType === 'individual') {
            const ids = item.target_ids || []
            return ids.includes(user.id)
          }
          if (targetType === 'group' && item.target_group) {
            const group = item.target_group.trim().toLowerCase()
            const course = (profile?.course || '').trim().toLowerCase()
            const uni = (profile?.university || '').trim().toLowerCase()
            return group === course || group === uni
          }
          return true
        })

      // 2. Fetch read receipts
      let readSet = new Set()
      try {
        const { data: reads } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id)

        if (reads) {
          readSet = new Set(reads.map(r => r.announcement_id))
        }
      } catch (_) {
        // Fallback to localStorage tracking if table not yet migrated
      }

      // Merge with localStorage reads
      for (const ann of userAnnouncements) {
        if (localStorage.getItem(`axon_ann_read_${ann.id}`) === '1') {
          readSet.add(ann.id)
        }
      }

      setAnnouncements(userAnnouncements)
      setReadIds(readSet)
    } catch (e) {
      console.error('Failed to load notification center data:', e)
    } finally {
      setLoading(false)
    }
  }

  const unreadCount = useMemo(() => {
    return announcements.filter(a => !readIds.has(a.id)).length
  }, [announcements, readIds])

  async function markAsRead(id, e) {
    e?.stopPropagation?.()
    if (!id || readIds.has(id)) return

    const next = new Set(readIds)
    next.add(id)
    setReadIds(next)
    localStorage.setItem(`axon_ann_read_${id}`, '1')
    sessionStorage.setItem(`axon_ann_dismissed_${id}`, '1')

    try {
      await supabase.from('announcement_reads').upsert({
        announcement_id: id,
        user_id: user.id,
        read_at: new Date().toISOString()
      }, { onConflict: 'announcement_id,user_id' })
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('axon_announcements_updated'))
  }

  // Closes detail view, marks notification as read, updates unread counter, and manages history
  function closeDetail(shouldPopHistory = true) {
    if (!selectedAnnouncement) return
    const closingId = selectedAnnouncement.id
    setSelectedAnnouncement(null)
    setTouchOffset(0)
    setIsDragging(false)

    // Mark as read upon close and update counter
    if (closingId) {
      markAsRead(closingId)
    }

    if (shouldPopHistory && historyPushedRef.current) {
      historyPushedRef.current = false
      if (window.history.state?.axonModal === 'notification-detail') {
        window.history.back()
      }
    }
  }

  // Swipe-down touch handlers for mobile bottom sheet
  function handleTouchStart(e) {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    setIsDragging(false)
  }

  function handleTouchMove(e) {
    const touch = e.touches[0]
    const deltaY = touch.clientY - touchStartRef.current.y
    const deltaX = touch.clientX - touchStartRef.current.x

    if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
      const scrollTop = contentRef.current ? contentRef.current.scrollTop : 0
      if (scrollTop <= 0) {
        setIsDragging(true)
        setTouchOffset(deltaY)
      }
    }
  }

  function handleTouchEnd() {
    if (touchOffset > 80) {
      closeDetail(true)
    } else {
      setIsDragging(false)
      setTouchOffset(0)
    }
  }

  async function markAllAsRead() {
    const unread = announcements.filter(a => !readIds.has(a.id))
    if (unread.length === 0) return

    const next = new Set(readIds)
    unread.forEach(a => {
      next.add(a.id)
      localStorage.setItem(`axon_ann_read_${a.id}`, '1')
      sessionStorage.setItem(`axon_ann_dismissed_${a.id}`, '1')
    })
    setReadIds(next)

    try {
      const records = unread.map(a => ({
        announcement_id: a.id,
        user_id: user.id,
        read_at: new Date().toISOString()
      }))
      await supabase.from('announcement_reads').upsert(records, { onConflict: 'announcement_id,user_id' })
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('axon_announcements_updated'))
  }

  const displayedAnnouncements = announcements

  // Consistent semantic priority colors across list and detail view: Info = blue, Notice = amber, Urgent = red
  function getTypeBadge(type) {
    if (type === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-semibold text-red-400 tracking-wide uppercase">
          <ShieldAlert className="h-2.5 w-2.5" /> Urgent
        </span>
      )
    }
    if (type === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400 tracking-wide uppercase">
          <AlertTriangle className="h-2.5 w-2.5" /> Notice
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-400 tracking-wide uppercase">
        <Info className="h-2.5 w-2.5" /> Info
      </span>
    )
  }

  useEffect(() => {
    localStorage.setItem('axon_unread_announcements_count', String(unreadCount))
    window.dispatchEvent(new CustomEvent('axon_unread_count_updated', { detail: { count: unreadCount } }))
  }, [unreadCount])

  return (
    <>
      {/* Notification Drawer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" style={{ isolation: 'isolate' }}>
          {/* Sibling Backdrop without blurring the drawer */}
          <div
            className="fixed inset-0 bg-black/70 transition-opacity animate-in fade-in duration-200"
            style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
            onClick={() => {
              closeDetail(true)
              setIsOpen(false)
            }}
          />

          {/* Drawer Container */}
          <div
            className="fixed inset-y-0 right-0 flex h-full w-full max-w-md flex-col bg-[#0F172A] border-l border-white/10 shadow-2xl z-10 animate-in slide-in-from-right duration-200"
            style={{
              isolation: 'isolate',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              backgroundColor: '#0F172A'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              className="flex items-center justify-between border-b border-white/10 px-4 sm:px-5 pb-3 sm:pb-3.5 bg-[#0F172A] shrink-0"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.875rem)',
                backgroundColor: '#0F172A',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
              }}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="h-5 w-5 text-blue-400 shrink-0" />
                <h2 className="font-heading text-lg font-bold text-white tracking-tight leading-none">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  closeDetail(true)
                  setIsOpen(false)
                }}
                aria-label="Close notifications"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white active:bg-white/15 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Top Action Bar: Status summary + Dedicated "Mark all as read" button */}
            {announcements.length > 0 && (
              <div className="flex items-center justify-between border-b border-white/5 px-4 sm:px-5 py-2.5 bg-slate-950/40 shrink-0">
                <span className="text-xs text-slate-400 font-medium">
                  {unreadCount > 0 ? (
                    <span><strong className="text-blue-400 font-semibold">{unreadCount}</strong> unread</span>
                  ) : (
                    <span className="text-slate-500">All caught up</span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    unreadCount > 0
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 active:scale-95 cursor-pointer shadow-sm'
                      : 'text-slate-600 border border-white/5 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all as read</span>
                </button>
              </div>
            )}

            {/* Notification List */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-hide"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
            >
              {displayedAnnouncements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3 shadow-inner">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    You're all caught up!
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                    You have no announcements right now.
                  </p>
                </div>
              ) : (
                displayedAnnouncements.map(item => {
                  const isRead = readIds.has(item.id)
                  const createdDate = item.created_at ? new Date(item.created_at) : null
                  const timeLabel = createdDate
                    ? format(createdDate, 'PP · p')
                    : ''

                  return (
                    <article
                      key={item.id}
                      onClick={() => {
                        markAsRead(item.id)
                        setSelectedAnnouncement(item)
                      }}
                      className={`group relative cursor-pointer rounded-2xl border p-4 transition-all duration-150 active:scale-[0.99] ${
                        isRead
                          ? 'border-white/5 bg-slate-900/35 opacity-70 hover:opacity-100 hover:bg-slate-900/60 hover:border-white/10'
                          : 'border-blue-500/30 bg-slate-900/80 shadow-md hover:border-blue-500/50 hover:bg-slate-900'
                      }`}
                    >
                      {/* Top Row: Priority Badge + Relative Time + Unread indicator dot */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getTypeBadge(item.type)}
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3 shrink-0" /> {timeLabel}
                          </span>
                        </div>
                        {!isRead && (
                          <span
                            className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)] ring-2 ring-[#0F172A] shrink-0"
                            title="Unread"
                          />
                        )}
                      </div>

                      {/* Title */}
                      <h3 className={`font-semibold text-sm leading-snug mb-1 line-clamp-1 transition-colors ${
                        isRead ? 'text-slate-300 group-hover:text-white' : 'text-white'
                      }`}>
                        {item.title}
                      </h3>

                      {/* Message Preview */}
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ANNOUNCEMENT DETAIL VIEW (RESPONSIVE MODAL & BOTTOM SHEET)
          - Higher z-index (z-[70]) than drawer (z-50)
          - Mobile bottom sheet with swipe-down dismissal
          - Sticky header with 44x44px Back and Close (X) buttons
          - iPhone safe area insets (top and bottom)
          - Sticky footer with full-width Close button
          - Android hardware back / browser back via history state
          - Unread counter automatically updated on close
      ========================================================================= */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center sm:items-center bg-black/75 p-0 sm:p-4 transition-opacity duration-200"
          style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
          onClick={() => closeDetail(true)}
        >
          <div
            ref={sheetRef}
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: touchOffset > 0 ? `translateY(${touchOffset}px)` : undefined,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              isolation: 'isolate',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none'
            }}
            className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] h-full sm:h-auto flex flex-col rounded-t-[28px] sm:rounded-2xl bg-white dark:bg-[#0F172A] border-t sm:border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in sm:zoom-in-95 duration-150"
          >
            {/* Mobile swipe-down pull pill handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing bg-white dark:bg-[#0F172A]">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700/80" />
            </div>

            {/* 3. STICKY HEADER */}
            <header
              className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A]"
              style={{
                paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
              }}
            >
              {/* 2. Top-Left ← Back button (min 44x44px tap target) */}
              <button
                type="button"
                onClick={() => closeDetail(true)}
                className="min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-xl inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 active:bg-slate-200 dark:active:bg-white/10 transition-colors"
                title="Back to notification list"
                aria-label="Back to notification list"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>Back</span>
              </button>

              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Announcement
              </span>

              {/* 1. Top-Right Close (X) button (min 44x44px tap target) */}
              <button
                type="button"
                onClick={() => closeDetail(true)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 active:bg-slate-200 dark:active:bg-white/10 transition-colors"
                title="Close"
                aria-label="Close notification detail"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* SCROLLABLE BODY CONTENT */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-slate-900 dark:text-white scrollbar-hide"
            >
              {/* Priority badge + date and time */}
              <div className="flex flex-wrap items-center gap-2 pb-1">
                {getTypeBadge(selectedAnnouncement.type)}
                {selectedAnnouncement.created_at && (
                  <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>
                      {format(new Date(selectedAnnouncement.created_at), 'PPP · p')}
                    </span>
                  </span>
                )}
              </div>

              {/* Title (large, bold) */}
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                {selectedAnnouncement.title}
              </h2>

              {/* Expiry Date (if present) */}
              {selectedAnnouncement.expires_at && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 text-xs text-amber-600 dark:text-amber-400">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    Expires on{' '}
                    <strong className="font-semibold text-amber-700 dark:text-amber-300">
                      {format(new Date(selectedAnnouncement.expires_at), 'PPP · p')}
                    </strong>
                  </span>
                </div>
              )}

              {/* Full message body with good line spacing */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4 sm:p-5 text-sm sm:text-[15px] leading-relaxed text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/5 whitespace-pre-wrap selection:bg-blue-500/30">
                {selectedAnnouncement.message}
              </div>
            </div>

            {/* 5. STICKY BOTTOM FOOTER WITH FULL-WIDTH CLOSE BUTTON */}
            <footer
              className="sticky bottom-0 z-20 shrink-0 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] px-5 py-3 sm:py-3.5"
              style={{
                paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
              }}
            >
              <button
                type="button"
                onClick={() => closeDetail(true)}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl font-semibold text-sm bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 active:bg-slate-700 active:scale-[0.99] text-white border border-slate-700 dark:border-white/10 flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}

export function NotificationBellButton({ className = '', size = 'default', showLabel = false }) {
  const [unreadCount, setUnreadCount] = useState(() => {
    return parseInt(localStorage.getItem('axon_unread_announcements_count') || '0', 10)
  })

  useEffect(() => {
    function onUpdate(e) {
      if (e?.detail?.count !== undefined) {
        setUnreadCount(e.detail.count)
      } else {
        const count = parseInt(localStorage.getItem('axon_unread_announcements_count') || '0', 10)
        setUnreadCount(count)
      }
    }
    window.addEventListener('axon_unread_count_updated', onUpdate)
    window.addEventListener('axon_announcements_updated', onUpdate)
    return () => {
      window.removeEventListener('axon_unread_count_updated', onUpdate)
      window.removeEventListener('axon_announcements_updated', onUpdate)
    }
  }, [])

  const iconClass =
    size === 'sm'
      ? 'h-4 w-4'
      : size === 'lg'
      ? 'h-[22px] w-[22px]'
      : size === 'xl'
      ? 'h-6 w-6'
      : 'h-5 w-5'

  const dotClass =
    size === 'sm'
      ? 'top-0 right-0 h-1.5 w-1.5'
      : 'top-0 right-0 h-2 w-2'

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('axon_open_notifications'))}
      className={`min-w-0 min-h-0 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all ${className}`}
      title="Notifications"
      aria-label="Notifications"
    >
      <span className="relative inline-flex items-center justify-center">
        <Bell className={iconClass} />
        {unreadCount > 0 && (
          <span
            className={`absolute rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0F172A] shadow-sm pointer-events-none ${dotClass}`}
          />
        )}
      </span>
      {showLabel && <span className="text-sm font-medium ml-2">Notifications</span>}
    </button>
  )
}

export function NotificationBadge({ className = '' }) {
  const [unreadCount, setUnreadCount] = useState(() => {
    return parseInt(localStorage.getItem('axon_unread_announcements_count') || '0', 10)
  })

  useEffect(() => {
    function onUpdate(e) {
      if (e?.detail?.count !== undefined) {
        setUnreadCount(e.detail.count)
      } else {
        const count = parseInt(localStorage.getItem('axon_unread_announcements_count') || '0', 10)
        setUnreadCount(count)
      }
    }
    window.addEventListener('axon_unread_count_updated', onUpdate)
    window.addEventListener('axon_announcements_updated', onUpdate)
    return () => {
      window.removeEventListener('axon_unread_count_updated', onUpdate)
      window.removeEventListener('axon_announcements_updated', onUpdate)
    }
  }, [])

  if (unreadCount <= 0) return null

  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm ${className}`} />
  )
}
