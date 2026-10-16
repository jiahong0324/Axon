import { useState, useEffect, useMemo } from 'react'
import { Bell, CheckCheck, Clock, ExternalLink, Megaphone, X, ShieldAlert, AlertTriangle, Info } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { supabase } from '../lib/supabase'

export default function NotificationCenter({ user, profile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [readIds, setReadIds] = useState(new Set())
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'unread'
  const [loading, setLoading] = useState(true)

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

      // Filter announcements relevant to this student
      const userAnnouncements = (rawAnnouncements || []).filter(item => {
        if (item.channels && item.channels.in_app === false) return false

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
    if (readIds.has(id)) return

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

  const displayedAnnouncements = useMemo(() => {
    if (activeTab === 'unread') {
      return announcements.filter(a => !readIds.has(a.id))
    }
    return announcements
  }, [announcements, activeTab, readIds])

  function getTypeBadge(type) {
    if (type === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
          <ShieldAlert className="h-3 w-3" /> Urgent
        </span>
      )
    }
    if (type === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
          <AlertTriangle className="h-3 w-3" /> Notice
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-theme-500/15 border border-theme-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-theme-400">
        <Info className="h-3 w-3" /> Info
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
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-white/10 shadow-2xl transition-transform"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-theme-500/10 text-theme-500 dark:text-theme-400">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                    Notifications
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manager Announcements
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Tabs & Mark All Read */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === 'all'
                      ? 'bg-theme-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({announcements.length})
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === 'unread'
                      ? 'bg-theme-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-theme-500 dark:text-theme-400 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {displayedAnnouncements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <Bell className="h-10 w-10 stroke-[1.5] mb-2 opacity-40" />
                  <p className="text-sm font-medium">No announcements found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeTab === 'unread' ? "You're all caught up!" : "You have no manager announcements."}
                  </p>
                </div>
              ) : (
                displayedAnnouncements.map(item => {
                  const isRead = readIds.has(item.id)
                  const createdDate = item.created_at ? new Date(item.created_at) : null
                  const timeLabel = createdDate
                    ? formatDistanceToNow(createdDate, { addSuffix: true })
                    : ''

                  return (
                    <article
                      key={item.id}
                      onClick={() => {
                        markAsRead(item.id)
                        setSelectedAnnouncement(item)
                      }}
                      className={`relative cursor-pointer rounded-2xl border p-3.5 transition-all duration-150 ${
                        isRead
                          ? 'border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] opacity-80 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-white/5'
                          : 'border-theme-500/30 bg-theme-500/5 dark:bg-theme-500/10 shadow-sm hover:border-theme-500/50'
                      }`}
                    >
                      {!isRead && (
                        <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-theme-500 ring-4 ring-theme-500/20" />
                      )}

                      <div className="mb-2 flex items-center gap-2">
                        {getTypeBadge(item.type)}
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {timeLabel}
                        </span>
                      </div>

                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1 pr-4 line-clamp-1">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-white/5">
                        <span className="hover:text-theme-400 font-medium">Click to read full &rarr;</span>
                        {!isRead && (
                          <button
                            onClick={e => markAsRead(item.id, e)}
                            className="text-theme-500 hover:underline"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  {getTypeBadge(selectedAnnouncement.type)}
                  <span className="text-xs text-slate-400">
                    {selectedAnnouncement.created_at
                      ? format(new Date(selectedAnnouncement.created_at), 'PPP · p')
                      : ''}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedAnnouncement.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5">
              {selectedAnnouncement.message}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="btn-primary px-5 py-2 text-sm min-h-0"
              >
                Close
              </button>
            </div>
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

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('axon_open_notifications'))}
      className={`relative inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 shadow-sm transition-all hover:scale-105 active:scale-95 ${className}`}
      title="Notifications & Announcements"
      aria-label="Notifications"
    >
      <Bell className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      {showLabel && <span className="text-xs font-medium ml-2">Notifications</span>}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm shadow-red-500/50 animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
