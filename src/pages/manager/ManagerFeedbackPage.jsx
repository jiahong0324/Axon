import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Filter,
  ImageIcon,
  Maximize2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { dateLabel } from '../../lib/utils'
import { parseFeedbackItem } from '../../lib/feedbackImage'
import { useConfirmDialog } from '../../components/ConfirmModal'
import { useToast } from '../../components/Toast'

export default function ManagerFeedbackPage() {
  const [feedback, setFeedback] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'pending', 'reviewed', 'resolved'
  const [onlyWithImages, setOnlyWithImages] = useState(false)
  const [viewingImage, setViewingImage] = useState(null) // { url, title, date, message }
  const [zoomLevel, setZoomLevel] = useState(1)

  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { showToast } = useToast()

  useEffect(() => {
    fetchFeedback()

    // Realtime subscription for incoming student feedback
    const channel = supabase
      .channel('manager-feedback-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feedback'
      }, () => {
        fetchFeedback(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Keyboard shortcut (Escape) to close lightbox
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && viewingImage) {
        closeLightbox()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewingImage])

  async function fetchFeedback(showLoading = true) {
    if (showLoading) setLoading(true)

    try {
      const { data: feedbackData, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Error fetching feedback:', error)
      }

      if (feedbackData && feedbackData.length > 0) {
        const userIds = [...new Set(feedbackData.filter(f => f.user_id).map(f => f.user_id))]
        let profileData = []
        if (userIds.length > 0) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
          profileData = data || []
        }

        const profileMap = {}
        if (profileData) {
          profileData.forEach(p => {
            profileMap[p.id] = p
          })
        }

        // Parse items to extract clean message and image_url (handles both direct column & fallback marker)
        const parsedItems = feedbackData.map(parseFeedbackItem)
        setProfiles(profileMap)
        setFeedback(parsedItems)
      } else {
        setFeedback([])
      }
    } catch (err) {
      console.error('Failed to load feedback:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function updateStatus(id, status) {
    try {
      const { error } = await supabase.from('feedback').update({ status }).eq('id', id)
      if (error) throw error
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f))
      showToast(`Feedback marked as ${status}.`, 'success')
    } catch (err) {
      console.error('Failed to update status:', err)
      showToast('Could not update status. Please try again.', 'error')
    }
  }

  async function deleteFeedback(item) {
    const ok = await confirm({
      title: 'Delete Feedback?',
      message: `Are you sure you want to delete this feedback ticket from ${profiles[item.user_id]?.full_name || item.name || 'this user'}? This action cannot be undone.`,
      confirmText: 'Delete Ticket'
    })
    if (!ok) return

    try {
      const { error } = await supabase.from('feedback').delete().eq('id', item.id)
      if (error) throw error
      setFeedback(prev => prev.filter(f => f.id !== item.id))
      showToast('Feedback ticket deleted.', 'success')
    } catch (err) {
      console.error('Failed to delete feedback:', err)
      showToast('Could not delete feedback. Check database delete policies.', 'error')
    }
  }

  function openLightbox(item, displayName) {
    setZoomLevel(1)
    setViewingImage({
      url: item.imageUrl,
      title: displayName,
      email: profiles[item.user_id]?.email || item.email || 'No email',
      date: item.created_at,
      message: item.cleanMessage
    })
  }

  function closeLightbox() {
    setViewingImage(null)
    setZoomLevel(1)
  }

  function handleDownloadImage(url, title) {
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = `axon_feedback_${title?.replace(/\s+/g, '_') || 'screenshot'}_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.warn('Download image fallback:', err)
      window.open(url, '_blank')
    }
  }

  function handleOpenOriginal(url) {
    if (url.startsWith('data:')) {
      const win = window.open('')
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Axon Feedback Screenshot</title></head>
            <body style="margin:0; background:#0b0f19; display:flex; align-items:center; justify-content:center; min-height:100vh;">
              <img src="${url}" style="max-width:95vw; max-height:95vh; object-fit:contain; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5); border-radius:8px;" />
            </body>
          </html>
        `)
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Filtered feedback list
  const filteredFeedback = useMemo(() => {
    return feedback.filter(item => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }

      // Images filter
      if (onlyWithImages && !item.imageUrl) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const user = profiles[item.user_id]
        const name = (user?.full_name || item.name || '').toLowerCase()
        const email = (user?.email || item.email || '').toLowerCase()
        const msg = (item.cleanMessage || '').toLowerCase()

        return name.includes(query) || email.includes(query) || msg.includes(query)
      }

      return true
    })
  }, [feedback, profiles, statusFilter, onlyWithImages, searchQuery])

  // Aggregate stats
  const stats = useMemo(() => {
    const total = feedback.length
    const pending = feedback.filter(f => f.status === 'pending').length
    const reviewed = feedback.filter(f => f.status === 'reviewed').length
    const resolved = feedback.filter(f => f.status === 'resolved').length
    const withImages = feedback.filter(f => Boolean(f.imageUrl)).length
    return { total, pending, reviewed, resolved, withImages }
  }, [feedback])

  return (
    <main className="main-content">
      {/* Page Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <span>Student Feedback</span>
            {stats.withImages > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-theme-500/10 px-2.5 py-0.5 text-xs font-semibold text-theme-400 border border-theme-500/20">
                <ImageIcon className="h-3 w-3" />
                {stats.withImages} with screenshot{stats.withImages !== 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review bug reports, suggestions, and visual screenshots submitted by students.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchFeedback(true)}
          className="btn-ghost self-start md:self-auto flex items-center gap-2 border border-white/10 text-xs py-2 px-3 text-slate-300 hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-3.5 border-white/5 bg-slate-900/40">
          <p className="text-xs text-slate-400 font-medium">Total Tickets</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="card p-3.5 border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Pending
          </p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.pending}</p>
        </div>
        <div className="card p-3.5 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" /> Resolved
          </p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.resolved}</p>
        </div>
        <div className="card p-3.5 border-theme-500/20 bg-theme-500/5">
          <p className="text-xs text-theme-400 font-medium flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> With Images
          </p>
          <p className="text-2xl font-bold text-theme-400 mt-1">{stats.withImages}</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="input pl-10 py-2 text-sm w-full"
            placeholder="Search by student, email, or message..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/5">
            {[
              { id: 'all', label: 'All', count: stats.total },
              { id: 'pending', label: 'Pending', count: stats.pending },
              { id: 'reviewed', label: 'Reviewed', count: stats.reviewed },
              { id: 'resolved', label: 'Resolved', count: stats.resolved }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-theme-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label} <span className="opacity-70 text-[11px]">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Toggle with images only */}
          <button
            type="button"
            onClick={() => setOnlyWithImages(prev => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium border transition-colors ${
              onlyWithImages
                ? 'border-theme-500 bg-theme-500/20 text-theme-300'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Has Screenshot</span>
            {stats.withImages > 0 && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">
                {stats.withImages}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Ticket List */}
      {loading ? (
        <div className="flex justify-center p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-500 border-t-transparent" />
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 border-dashed">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-slate-300">No feedback tickets match your filter</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery || statusFilter !== 'all' || onlyWithImages
              ? 'Try resetting the filters or search keywords above.'
              : 'No student feedback has been submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFeedback.map(item => {
            const user = profiles[item.user_id]
            const displayName = user?.full_name || item.name || 'Anonymous Student'
            const displayEmail = user?.email || item.email || 'No email provided'

            const statusColors = {
              pending: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
              reviewed: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
              resolved: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
            }

            const statusIcons = {
              pending: <Clock className="h-4 w-4 text-amber-400" />,
              reviewed: <AlertCircle className="h-4 w-4 text-blue-400" />,
              resolved: <CheckCircle className="h-4 w-4 text-emerald-400" />
            }

            return (
              <div
                key={item.id}
                className="card flex flex-col justify-between gap-5 p-5 sm:p-6 transition-all hover:border-white/15"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: User info & Message */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        item.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.status === 'reviewed'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-theme-500/20 text-theme-400'
                      }`}
                    >
                      {item.status === 'resolved' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <MessageSquare className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* User Header */}
                      <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                        <h3 className="font-semibold text-white text-base truncate">
                          {displayName}
                        </h3>
                        <span className="text-xs text-slate-400 truncate max-w-[220px]">
                          {displayEmail}
                        </span>
                        <span className="text-xs text-slate-500 bg-white/5 px-2.5 py-0.5 rounded-full font-mono">
                          {dateLabel(item.created_at)}
                        </span>
                        {item.imageUrl && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-theme-500/20 border border-theme-500/30 px-2 py-0.5 text-[11px] font-semibold text-theme-300">
                            <ImageIcon className="h-3 w-3" /> Screenshot Attached
                          </span>
                        )}
                      </div>

                      {/* Clean Message Body */}
                      <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                        {item.cleanMessage || <span className="italic text-slate-500">No message provided (image only)</span>}
                      </p>

                      {/* Attached Screenshot Section */}
                      {item.imageUrl && (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <ImageIcon className="h-4 w-4 text-theme-400" />
                              <span>Student Uploaded Screenshot:</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDownloadImage(item.imageUrl, displayName)}
                                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/5 text-xs inline-flex items-center gap-1 px-2"
                                title="Download Image"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Download</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenOriginal(item.imageUrl)}
                                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/5 text-xs inline-flex items-center gap-1 px-2"
                                title="Open Original in New Tab"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Open Original</span>
                              </button>
                            </div>
                          </div>

                          {/* Image Thumbnail Card */}
                          <button
                            type="button"
                            onClick={() => openLightbox(item, displayName)}
                            className="group relative block max-w-md w-full overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-lg transition-all hover:border-theme-500/50 hover:shadow-theme-500/10 text-left cursor-zoom-in"
                          >
                            <div className="relative aspect-video max-h-52 w-full overflow-hidden flex items-center justify-center bg-slate-950">
                              <img
                                src={item.imageUrl}
                                alt="Feedback problem screenshot"
                                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-white font-medium text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-xs">
                                <Maximize2 className="h-4 w-4" />
                                <span>Click to inspect full image</span>
                              </div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Status & Actions */}
                  <div className="shrink-0 flex items-center md:flex-col md:items-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                    <div className="flex items-center gap-2">
                      <select
                        value={item.status || 'pending'}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        className={`input py-1.5 px-3 text-xs font-semibold rounded-xl border cursor-pointer ${
                          statusColors[item.status] || statusColors.pending
                        }`}
                      >
                        <option value="pending" className="bg-slate-900 text-amber-400">● Pending</option>
                        <option value="reviewed" className="bg-slate-900 text-blue-400">● Reviewed</option>
                        <option value="resolved" className="bg-slate-900 text-emerald-400">● Resolved</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => deleteFeedback(item)}
                        className="inline-flex items-center justify-center h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                        title="Delete Feedback"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full-Screen Lightbox Image Viewer */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md p-3 sm:p-6 overscroll-none animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          {/* Lightbox Header Bar */}
          <div
            className="flex items-center justify-between gap-4 pb-3 border-b border-white/10 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-theme-400 shrink-0" />
                <span>Screenshot from {viewingImage.title}</span>
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {viewingImage.email} • {dateLabel(viewingImage.date)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:flex items-center rounded-xl bg-white/10 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                  className="rounded-lg p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-mono text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                  className="rounded-lg p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="rounded-lg p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDownloadImage(viewingImage.url, viewingImage.title)}
                className="btn-ghost py-1.5 px-2.5 text-xs flex items-center gap-1.5 border border-white/10 text-slate-200"
                title="Download screenshot"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenOriginal(viewingImage.url)}
                className="btn-ghost py-1.5 px-2.5 text-xs flex items-center gap-1.5 border border-white/10 text-slate-200"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">New Tab</span>
              </button>

              <button
                type="button"
                onClick={closeLightbox}
                className="inline-flex items-center justify-center h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1 shrink-0"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Main View Area */}
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4"
            onClick={closeLightbox}
          >
            <div
              className="relative max-w-full max-h-full transition-transform duration-150"
              style={{ transform: `scale(${zoomLevel})` }}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={viewingImage.url}
                alt="Enlarged feedback screenshot"
                className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/10 bg-slate-950"
              />
            </div>
          </div>

          {/* Context Footer: Shows message so admin can read context while viewing screenshot */}
          {viewingImage.message && (
            <div
              className="rounded-2xl border border-white/10 bg-slate-900/90 p-3 sm:p-4 text-xs sm:text-sm text-slate-200 max-w-3xl mx-auto w-full shrink-0 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-[11px] font-semibold text-theme-400 mb-1 uppercase tracking-wider">
                Student's Issue Description:
              </p>
              <p className="leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                {viewingImage.message}
              </p>
            </div>
          )}
        </div>
      )}

      {ConfirmDialog}
    </main>
  )
}
