import { Bot, Download, ExternalLink, Filter, Image, MessageSquareText, RefreshCw, Search, Users } from 'lucide-react'
import { format, formatDistanceToNow, isSameMonth, isSameWeek, isToday } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { initials, markdownToHtml } from '../../lib/utils'

const dateOptions = ['All Time', 'Today', 'This Week', 'This Month']
const roleOptions = [
  { id: 'all', label: 'All Interactions' },
  { id: 'user', label: 'Student Questions Only' },
  { id: 'assistant', label: 'AI Responses Only' }
]

export default function ManagerAIChatsPage() {
  const [students, setStudents] = useState([])
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [dateFilter, setDateFilter] = useState('All Time')
  const [searchQuery, setSearchQuery] = useState('')
  const [zoomedImage, setZoomedImage] = useState(null)
  const [limit, setLimit] = useState(60)
  const { showToast } = useToast()

  useEffect(() => {
    loadData()

    // Real-time listener for incoming student AI chats
    const channel = supabase
      .channel('manager-all-ai-chats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_ai_chats'
      }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [studentsRes, chatsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
        supabase
          .from('student_ai_chats')
          .select('*')
          .eq('is_manager', false)
          .order('created_at', { ascending: false })
          .limit(1000)
      ])

      let loadedChats = chatsRes.data || []

      // Fallback: If DB table query returned 0 rows, check the admin endpoint with service role
      if (loadedChats.length === 0) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            const apiRes = await fetch('/api/admin-student?mode=all_chats', {
              headers: { Authorization: `Bearer ${session.access_token}` }
            })
            if (apiRes.ok) {
              const json = await apiRes.json()
              if (json?.chats && json.chats.length > 0) {
                loadedChats = json.chats
              }
            }
          }
        } catch (e) {
          console.warn('Fallback admin-student all_chats query failed:', e)
        }
      }

      setStudents(studentsRes.data || [])
      setChats([...loadedChats].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)))
    } catch (err) {
      console.error('Failed to load AI chats:', err)
      showToast('Could not load student AI chats.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const studentMap = useMemo(() => {
    return new Map(students.map(s => [s.id, s]))
  }, [students])

  const filtered = useMemo(() => {
    return chats.filter(item => {
      const student = studentMap.get(item.user_id) || {}
      const created = new Date(item.created_at)

      // Student filter
      if (selectedStudent !== 'all' && item.user_id !== selectedStudent) return false

      // Role filter
      if (selectedRole !== 'all' && item.role !== selectedRole) return false

      // Date filter
      if (dateFilter === 'Today' && !isToday(created)) return false
      if (dateFilter === 'This Week' && !isSameWeek(created, new Date())) return false
      if (dateFilter === 'This Month' && !isSameMonth(created, new Date())) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const contentMatch = (item.content || '').toLowerCase().includes(q)
        const nameMatch = (student.full_name || '').toLowerCase().includes(q)
        const emailMatch = (student.email || '').toLowerCase().includes(q)
        const studentIdMatch = (student.student_id || '').toLowerCase().includes(q)
        if (!contentMatch && !nameMatch && !emailMatch && !studentIdMatch) return false
      }

      return true
    })
  }, [chats, studentMap, selectedStudent, selectedRole, dateFilter, searchQuery])

  // Aggregate stats
  const totalQuestions = useMemo(() => chats.filter(c => c.role === 'user').length, [chats])
  const activeStudentsCount = useMemo(() => new Set(chats.map(c => c.user_id)).size, [chats])
  const questionsToday = useMemo(() => chats.filter(c => c.role === 'user' && isToday(new Date(c.created_at))).length, [chats])
  const imageQueriesCount = useMemo(() => chats.filter(c => c.image).length, [chats])

  const visible = filtered.slice(0, limit)

  function exportAsJson() {
    if (filtered.length === 0) return
    const exportData = filtered.map(item => {
      const student = studentMap.get(item.user_id)
      return {
        id: item.id,
        timestamp: item.created_at,
        student_name: student?.full_name || 'Unknown',
        student_email: student?.email || 'N/A',
        student_id: student?.student_id || 'N/A',
        role: item.role === 'user' ? 'Student' : 'AI Assistant',
        has_image: Boolean(item.image),
        content: item.content
      }
    })

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `axon_student_ai_chats_${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Exported AI chats to JSON file.', 'success')
  }

  return (
    <main className="main-content">
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="page-title mb-1 flex items-center gap-2">
            <MessageSquareText className="h-6 w-6 text-amber-400" /> Student AI Chats & Inquiries
          </h1>
          <p className="muted">
            Monitor questions students are asking the AI Helper, review concept inquiries, and inspect study conversations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-ghost text-xs border border-white/10"
            title="Refresh AI chats"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={exportAsJson}
            disabled={filtered.length === 0}
            className="manager-primary-btn px-3 py-2 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export Logs
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card flex items-center gap-4 border-l-4 border-l-amber-500">
          <MessageSquareText className="h-7 w-7 text-amber-400" />
          <div>
            <p className="muted text-xs">Total Interactions</p>
            <p className="text-2xl font-bold">{chats.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-l-4 border-l-purple-500">
          <Bot className="h-7 w-7 text-purple-400" />
          <div>
            <p className="muted text-xs">Student Questions</p>
            <p className="text-2xl font-bold">{totalQuestions}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-l-4 border-l-emerald-500">
          <Users className="h-7 w-7 text-emerald-400" />
          <div>
            <p className="muted text-xs">Active Students</p>
            <p className="text-2xl font-bold">{activeStudentsCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-l-4 border-l-blue-500">
          <Image className="h-7 w-7 text-blue-400" />
          <div>
            <p className="muted text-xs">Image Inquiries</p>
            <p className="text-2xl font-bold">{imageQueriesCount}</p>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="card mb-6 grid gap-4 lg:grid-cols-4">
        <label className="block">
          <span className="label">Search Chats</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search content, student name, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </label>

        <label className="block">
          <span className="label">Filter by Student</span>
          <select
            className="input text-sm"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            <option value="all">All Students ({students.length})</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.full_name || s.email} {s.student_id ? `(${s.student_id})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Interaction Type</span>
          <select
            className="input text-sm"
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
          >
            {roleOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Date Range</span>
          <select
            className="input text-sm"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          >
            {dateOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      </section>

      {/* Chat Feed */}
      <section className="space-y-4">
        {loading && chats.length === 0 ? (
          <div className="card space-y-4 py-8">
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
          </div>
        ) : visible.length === 0 ? (
          <div className="card py-16 text-center">
            <Bot className="mx-auto mb-3 h-12 w-12 text-slate-600" />
            <p className="text-lg font-semibold text-slate-300">No student AI chats match your filters.</p>
            <p className="muted mt-1 text-sm">
              {chats.length === 0
                ? 'No student AI conversations have been recorded yet. When students use the AI Helper, their questions and study topics will appear here.'
                : 'Try clearing your search query or adjusting your filters.'}
            </p>
          </div>
        ) : (
          visible.map(item => {
            const student = studentMap.get(item.user_id) || {}
            const isUser = item.role === 'user'
            const msgDate = new Date(item.created_at)

            return (
              <article
                key={item.id}
                className={`card rounded-2xl border p-4 sm:p-5 transition-all ${
                  isUser
                    ? 'border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/30'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                {/* Header row */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white shadow"
                      style={{ background: isUser ? (student.avatar_color || '#F59E0B') : '#8B5CF6' }}
                    >
                      {isUser ? initials(student.full_name || student.email || 'S') : <Bot className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/manager/students/${item.user_id}`}
                          className="font-semibold text-sm sm:text-base text-white hover:text-amber-400 transition-colors flex items-center gap-1.5"
                        >
                          {student.full_name || student.email || 'Student'}
                          <ExternalLink className="h-3 w-3 text-slate-500" />
                        </Link>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                            isUser ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {isUser ? 'Student Question' : 'AI Assistant Reply'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {student.email} {student.student_id ? `• ID: ${student.student_id}` : ''} {student.course ? `• ${student.course}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-300" title={format(msgDate, 'yyyy-MM-dd HH:mm:ss')}>
                      {format(msgDate, 'dd MMM yyyy, hh:mm a')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatDistanceToNow(msgDate, { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Uploaded study image preview */}
                {item.image && (
                  <div className="mb-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Image className="h-3.5 w-3.5 text-blue-400" /> Student Uploaded Image (Study Notes / Problem):
                    </p>
                    <button
                      type="button"
                      onClick={() => setZoomedImage(item.image)}
                      className="group relative inline-block overflow-hidden rounded-xl border border-white/20 transition-transform hover:scale-[1.01]"
                    >
                      <img
                        src={item.image}
                        alt="Student query attachment"
                        className="max-h-56 w-auto rounded-lg object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        Click to view full image
                      </div>
                    </button>
                  </div>
                )}

                {/* Content body */}
                {isUser ? (
                  <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap rounded-xl bg-white/[0.02] p-3 border border-white/5">
                    {item.content}
                  </div>
                ) : (
                  <div
                    className="ai-formatted-content text-sm text-slate-300 leading-relaxed rounded-xl bg-white/[0.01] p-3 border border-white/5 overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(item.content) }}
                  />
                )}

                {/* Footer link to student's complete profile */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[11px] text-slate-500">
                    User ID: <code className="text-slate-400">{item.user_id.slice(0, 8)}...</code>
                  </span>
                  <Link
                    to={`/manager/students/${item.user_id}`}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
                  >
                    View All {student.full_name ? `${student.full_name}'s` : "Student's"} Records & Chats →
                  </Link>
                </div>
              </article>
            )
          })
        )}

        {filtered.length > limit && (
          <button
            onClick={() => setLimit(prev => prev + 50)}
            className="btn-ghost mx-auto mt-6 flex text-sm border border-white/10"
          >
            Load More Messages ({filtered.length - limit} remaining)
          </button>
        )}
      </section>

      {/* Lightbox Modal for Zoomed Image */}
      {zoomedImage && (
        <Modal isOpen={Boolean(zoomedImage)} onClose={() => setZoomedImage(null)} title="Student Uploaded Image">
          <div className="flex flex-col items-center">
            <img
              src={zoomedImage}
              alt="Uploaded study question"
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              className="btn-ghost mt-4 border border-white/10"
              onClick={() => setZoomedImage(null)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}
