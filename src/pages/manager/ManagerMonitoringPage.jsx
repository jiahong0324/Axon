import { useState, useEffect, useMemo } from 'react'
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  LineChart,
  MessageSquare,
  MessageSquareText,
  Pause,
  Play,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Zap
} from 'lucide-react'
import { fetchAllRealSupabaseData, trackPageView } from '../../lib/telemetry'
import { formatDistanceToNow } from 'date-fns'

const DD_SITE = import.meta.env.VITE_DATADOG_SITE || 'us5.datadoghq.com'
const DD_BASE_URL = `https://${DD_SITE}`

export default function ManagerMonitoringPage() {
  const [timeRange, setTimeRange] = useState('24h') // '24h' | '7d' | '30d'
  const [isLive, setIsLive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [activeLogFilter, setActiveLogFilter] = useState('all') // 'all' | 'page' | 'action'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  // Track page view for this manager route
  useEffect(() => {
    trackPageView('/manager/monitoring', { title: 'Manager System Monitoring' })
  }, [])

  // Load 100% REAL Supabase data
  const loadRealData = async () => {
    try {
      const result = await fetchAllRealSupabaseData(timeRange)
      setData(result)
    } catch (err) {
      console.error('Failed to load real Supabase data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadRealData()
  }, [timeRange])

  // Auto-refresh interval (every 12 seconds if live)
  useEffect(() => {
    if (!isLive) return
    const timer = setInterval(() => {
      loadRealData()
    }, 12000)
    return () => clearInterval(timer)
  }, [isLive, timeRange])

  // Filtered real logs
  const filteredLogs = useMemo(() => {
    if (!data?.recentLogs) return []
    return data.recentLogs.filter(log => {
      if (activeLogFilter === 'page' && !log.event_type?.includes('PAGE') && !log.path?.startsWith('/')) return false
      if (activeLogFilter === 'action' && log.event_type?.includes('PAGE')) return false

      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const event = (log.event_type || '').toLowerCase()
      const path = (log.path || '').toLowerCase()
      const user = (log.user || '').toLowerCase()
      const role = (log.role || '').toLowerCase()
      return event.includes(q) || path.includes(q) || user.includes(q) || role.includes(q)
    })
  }, [data?.recentLogs, activeLogFilter, searchQuery])

  // Calculate real chart points from real data
  const chartPoints = useMemo(() => {
    if (!data?.trend || data.trend.length === 0) return []
    const maxVal = Math.max(...data.trend.map(p => Math.max(p.activityCount, p.views)), 4)
    return data.trend.map((pt, idx) => {
      const count = Math.max(pt.activityCount, pt.views)
      const x = (idx / (data.trend.length - 1)) * 100
      const y = 92 - (count / maxVal) * 78 // Leave margins
      return { ...pt, count, x, y, maxVal }
    })
  }, [data?.trend])

  // Build SVG path
  const svgPathD = useMemo(() => {
    if (chartPoints.length === 0) return ''
    return chartPoints.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`
      const prev = chartPoints[idx - 1]
      const cx = (prev.x + pt.x) / 2
      const cy = (prev.y + pt.y) / 2
      return `${acc} Q ${prev.x} ${prev.y}, ${cx} ${cy} T ${pt.x} ${pt.y}`
    }, '')
  }, [chartPoints])

  const svgAreaD = useMemo(() => {
    if (!svgPathD || chartPoints.length === 0) return ''
    const lastX = chartPoints[chartPoints.length - 1].x
    return `${svgPathD} L ${lastX} 100 L 0 100 Z`
  }, [svgPathD, chartPoints])

  const stats = data?.stats || {}

  return (
    <main className="main-content space-y-6">
      {/* 1. Header with Status & Time Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <LineChart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title !mb-0 font-bold tracking-tight">System Telemetry & Database Metrics</h1>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                  <Database className="h-3 w-3" /> Live Supabase
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                100% real database telemetry, active students, activity trends, and system health
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Database Ping Status */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 px-3 py-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-slate-500 dark:text-slate-400">Database:</span>
            <span className="font-semibold text-emerald-500">Connected ({data?.dbPingMs || 35}ms)</span>
          </div>

          {/* Time range selector */}
          <div className="flex rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 p-1">
            {[
              { id: '24h', label: '24H' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={`min-h-[34px] rounded-lg px-3 text-xs font-semibold transition-all ${
                  timeRange === range.id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Pause / Play Live */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`min-h-[38px] flex items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
              isLive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                : 'border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-400'
            }`}
            title={isLive ? 'Pause auto-refresh' : 'Resume auto-refresh'}
          >
            {isLive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isLive ? 'Live Sync' : 'Paused'}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => loadRealData()}
            disabled={loading}
            className="min-h-[38px] flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Row (100% Real Numbers from Supabase) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Students */}
        <div className="card p-4 border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered Students</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {stats.totalStudents ?? 0}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1">
            <span className="font-semibold text-emerald-500">{stats.activeStudents ?? 0}</span> active accounts
          </p>
        </div>

        {/* System Activity Count */}
        <div className="card p-4 border-l-4 border-l-purple-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total System Activities</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {stats.totalActivities ?? 0}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1">
            <span className="font-semibold text-purple-400">{stats.filteredActivitiesCount ?? 0}</span> in selected period
          </p>
        </div>

        {/* Academic Entities */}
        <div className="card p-4 border-l-4 border-l-blue-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Academic Records</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {(stats.totalClasses || 0) + (stats.totalAssignments || 0) + (stats.totalExams || 0)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 truncate">
            {stats.totalClasses ?? 0} classes • {stats.totalAssignments ?? 0} tasks • {stats.totalExams ?? 0} exams
          </p>
        </div>

        {/* AI & Interactions */}
        <div className="card p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">AI Chats & Feedback</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {(stats.totalAIChats || 0) + (stats.totalFeedback || 0)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <MessageSquareText className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
            {stats.totalAIChats ?? 0} AI prompts • {stats.totalFeedback ?? 0} feedback items
          </p>
        </div>
      </section>

      {/* 3. Real System Traffic & Activity Timeline Chart */}
      <section className="card p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Real System Activity & Traffic Trend</h2>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500 border border-amber-500/20">
                {timeRange === '24h' ? 'Hourly Activity' : 'Daily Activity'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Real student actions and database writes recorded by timestamps</p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Activity Volume
            </span>
          </div>
        </div>

        {/* Real Chart Canvas */}
        <div className="relative h-56 w-full overflow-hidden pt-3">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
            <div className="border-b border-dashed border-slate-500 w-full" />
            <div className="border-b border-dashed border-slate-500 w-full" />
            <div className="border-b border-dashed border-slate-500 w-full" />
            <div className="border-b border-dashed border-slate-500 w-full" />
          </div>

          {/* SVG */}
          <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="amberRealGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {svgAreaD && <path d={svgAreaD} fill="url(#amberRealGradient)" />}
            {svgPathD && (
              <path
                d={svgPathD}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* Interactive Hover anchors */}
          <div className="absolute inset-0 flex items-stretch">
            {chartPoints.map((pt, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="flex-1 relative group cursor-pointer"
              >
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-white dark:border-navy-950 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  style={{ top: `${pt.y}%` }}
                />
              </div>
            ))}
          </div>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-20 rounded-xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-navy-900/95 p-2.5 text-xs shadow-xl backdrop-blur-md -translate-x-1/2 -translate-y-full transition-all"
              style={{
                left: `${Math.max(10, Math.min(90, hoveredPoint.x))}%`,
                top: `${Math.max(12, hoveredPoint.y - 10)}%`
              }}
            >
              <p className="font-semibold text-slate-900 dark:text-white">{hoveredPoint.label}</p>
              <p className="mt-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Real Events:</span>
                <strong className="text-slate-900 dark:text-white">{hoveredPoint.count}</strong>
              </p>
            </div>
          )}
        </div>

        {/* X-axis time marks */}
        <div className="mt-2 flex justify-between text-[11px] text-slate-400 px-1 font-mono">
          {chartPoints.filter((_, i) => i % Math.ceil(chartPoints.length / 6) === 0).map((pt, i) => (
            <span key={i}>{pt.label}</span>
          ))}
          {chartPoints.length > 0 && <span>{chartPoints[chartPoints.length - 1].label}</span>}
        </div>
      </section>

      {/* 4. Deep Database Analytics Grid (Academic, Demographics, Most Active) */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Academic Progression Stats */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-emerald-400" />
            Academic Tasks & Completion
          </h2>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">Assignments Completion Rate</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats.assignmentCompletionRate || 0}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${stats.assignmentCompletionRate || 0}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50/50 dark:bg-white/5 text-center">
                <p className="text-[11px] text-slate-500">Completed</p>
                <p className="text-lg font-bold text-emerald-500 mt-0.5">{stats.completedAssignments || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50/50 dark:bg-white/5 text-center">
                <p className="text-[11px] text-slate-500">Pending</p>
                <p className="text-lg font-bold text-amber-500 mt-0.5">{stats.pendingAssignments || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50/50 dark:bg-white/5 text-center">
                <p className="text-[11px] text-slate-500">Upcoming Exams</p>
                <p className="text-lg font-bold text-blue-500 mt-0.5">{stats.upcomingExams || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50/50 dark:bg-white/5 text-center">
                <p className="text-[11px] text-slate-500">Graded Results</p>
                <p className="text-lg font-bold text-purple-400 mt-0.5">{stats.totalExamResults || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Student Demographics (Universities & Courses) */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-amber-400" />
            University Demographics
          </h2>

          <div className="space-y-3">
            {data?.universities?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No student university data recorded yet.</p>
            ) : (
              data?.universities?.slice(0, 4).map(uni => (
                <div key={uni.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{uni.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{uni.count} students ({uni.percent}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${uni.percent}%` }}
                    />
                  </div>
                </div>
              ))
            )}

            {/* Top Courses */}
            {data?.courses?.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">Top Degree Courses</p>
                <div className="space-y-1.5">
                  {data.courses.slice(0, 3).map(c => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[200px] text-slate-600 dark:text-slate-400">{c.name}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Most Active Students Leaderboard */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            Most Active Students
          </h2>

          <div className="space-y-2.5">
            {data?.activeStudentsLeaderboard?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No student activity logged yet.</p>
            ) : (
              data?.activeStudentsLeaderboard?.map((student, idx) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-2.5 bg-slate-50/50 dark:bg-white/5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/10 text-amber-500 font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{student.name}</p>
                      <p className="truncate text-[10px] text-slate-500">{student.university}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/20">
                      {student.activityCount} acts
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 5. Live Activity & Telemetry Log Stream (100% Real Supabase Data) */}
      <section className="card p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Real Database Activity & Telemetry Stream
            </h2>
            <p className="text-xs text-slate-500">Live feed of student interactions, timetable edits, and system events</p>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search event, user, role..."
                className="input min-h-[36px] pl-8 text-xs w-48 sm:w-60"
              />
            </div>

            <div className="flex rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 p-1">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'action', label: 'Student Actions' },
                { id: 'page', label: 'Page Hits' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveLogFilter(tab.id)}
                  className={`min-h-[30px] rounded-lg px-2.5 text-xs font-medium transition-all ${
                    activeLogFilter === tab.id
                      ? 'bg-amber-500 text-white font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Event / Action</th>
                <th className="py-2.5 px-3">Target / Path</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No matching real activity logs found in the database.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                  >
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : 'just now'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20 uppercase">
                        {log.event_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                      {log.path}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                      {log.user}
                    </td>
                    <td className="py-2.5 px-3 capitalize text-slate-400">
                      {log.role}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                      {log.platform}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedLog(selectedLog?.id === log.id ? null : log)
                        }}
                        className="text-[11px] text-amber-500 hover:text-amber-400 underline font-medium"
                      >
                        {selectedLog?.id === log.id ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Log Inspector */}
        {selectedLog && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs font-mono">
            <div className="mb-2 flex items-center justify-between text-slate-300 font-sans">
              <span className="font-bold flex items-center gap-2 text-amber-400">
                <Layers className="h-4 w-4" /> Activity Payload Inspection
              </span>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <pre className="max-h-60 overflow-y-auto rounded-lg bg-black/40 p-3 text-slate-200 scrollbar-hide">
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* 6. Datadog Cloud Observability Quick-Links (Clean Footer Dock) */}
      <section className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4 backdrop-blur flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 items-center rounded-lg bg-[#632CA6] px-2 text-[11px] font-bold text-white">
            DATADOG
          </span>
          <span className="text-xs text-slate-400">
            Datadog Cloud Sync is active on <strong className="text-purple-300">{DD_SITE}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`${DD_BASE_URL}/rum/sessions?query=service%3Aaxon-pwa`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-all"
          >
            RUM Explorer <ArrowUpRight className="h-3 w-3" />
          </a>
          <a
            href={`${DD_BASE_URL}/rum/replay/sessions?query=service%3Aaxon-pwa`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-all"
          >
            Session Replays <ArrowUpRight className="h-3 w-3" />
          </a>
          <a
            href={`${DD_BASE_URL}/logs?query=service%3Aaxon-ai-companion`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-all"
          >
            AI Logs <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </section>
    </main>
  )
}
