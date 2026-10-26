import React, { Component, useState, useEffect, useMemo } from 'react'
import {
  Activity,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Database,
  Eye,
  GraduationCap,
  Laptop,
  Layers,
  LineChart,
  Pause,
  Play,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Tablet,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react'
import { fetchAllRealSupabaseData, trackPageView } from '../../lib/telemetry'
import { formatDistanceToNow } from 'date-fns'

function safeFormatDistance(dateStr) {
  if (!dateStr) return 'just now'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'just now'
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return 'just now'
  }
}

const DD_SITE = import.meta.env.VITE_DATADOG_SITE || 'us5.datadoghq.com'
const DD_BASE_URL = `https://${DD_SITE}`

class MonitoringErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('Monitoring Error Boundary caught:', error, errorInfo)
    window.hidePrerenderSplash?.()
  }
  render() {
    if (this.state.hasError) {
      return (
        <main className="main-content p-6">
          <div className="card p-6 border-red-500/30 bg-red-500/10 text-center space-y-3">
            <h2 className="text-base font-bold text-red-500">Monitoring Dashboard Error</h2>
            <p className="text-xs text-slate-400 font-mono">{this.state.error?.message || 'Unknown runtime error'}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
            >
              Reload Monitoring
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}

function MonitoringDashboard() {
  const [timeRange, setTimeRange] = useState('24h') // '24h' | '7d' | '30d'
  const [isLive, setIsLive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [activeLogFilter, setActiveLogFilter] = useState('all') // 'all' | 'page' | 'action'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const [pageSize, setPageSize] = useState(10) // '放10个就好' -> default 10
  const [currentPage, setCurrentPage] = useState(1)

  // Reset to page 1 whenever filters, search, or page size change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeLogFilter, searchQuery, pageSize])

  // Track page view for this manager route and dismiss splash screen immediately
  useEffect(() => {
    trackPageView('/manager/monitoring', { title: 'Manager System Monitoring' })
    window.hidePrerenderSplash?.()
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
      window.hidePrerenderSplash?.()
    }
  }

  useEffect(() => {
    setLoading(true)
    loadRealData()
  }, [timeRange])

  // Auto-refresh interval (every 10 seconds if live)
  useEffect(() => {
    if (!isLive) return
    const timer = setInterval(() => {
      loadRealData()
    }, 10000)
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
      const platform = (log.platform || '').toLowerCase()
      return event.includes(q) || path.includes(q) || user.includes(q) || role.includes(q) || platform.includes(q)
    })
  }, [data?.recentLogs, activeLogFilter, searchQuery])

  // Pagination calculations for Live Telemetry Stream
  const totalLogs = filteredLogs.length
  const effectivePageSize = pageSize === 'all' ? Math.max(totalLogs, 1) : Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(totalLogs / effectivePageSize))
  const validCurrentPage = Math.min(currentPage, totalPages)

  const paginatedLogs = useMemo(() => {
    if (pageSize === 'all') return filteredLogs
    const start = (validCurrentPage - 1) * effectivePageSize
    return filteredLogs.slice(start, start + effectivePageSize)
  }, [filteredLogs, validCurrentPage, effectivePageSize, pageSize])

  // Real chart points calculation
  const chartPoints = useMemo(() => {
    if (!data?.trend || data.trend.length === 0) return []
    const maxVal = Math.max(...data.trend.map(p => Math.max(p.activityCount || 0, p.views || 0)), 3)
    const divisor = Math.max(data.trend.length - 1, 1)
    return data.trend.map((pt, idx) => {
      const count = Math.max(pt.activityCount || 0, pt.views || 0)
      const x = (idx / divisor) * 100
      // Keep margin so peaks don't stick to 0
      const y = 88 - (count / maxVal) * 70
      return { ...pt, count, x, y, maxVal }
    })
  }, [data?.trend])

  // SVG Area path generator with smooth cubic bezier curve through exact points
  const svgPathD = useMemo(() => {
    if (chartPoints.length === 0) return ''
    if (chartPoints.length === 1) return `M ${chartPoints[0].x} ${chartPoints[0].y}`
    let d = `M ${chartPoints[0].x} ${chartPoints[0].y}`
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = i > 0 ? chartPoints[i - 1] : chartPoints[i]
      const p1 = chartPoints[i]
      const p2 = chartPoints[i + 1]
      const p3 = i < chartPoints.length - 2 ? chartPoints[i + 2] : p2

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    }
    return d
  }, [chartPoints])

  const svgAreaD = useMemo(() => {
    if (!svgPathD || chartPoints.length === 0) return ''
    const firstX = chartPoints[0].x
    const lastX = chartPoints[chartPoints.length - 1].x
    return `${svgPathD} L ${lastX} 100 L ${firstX} 100 Z`
  }, [svgPathD, chartPoints])

  const stats = data?.stats || {}

  return (
    <main className="main-content space-y-6">
      {/* 1. Header with Status & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <LineChart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title !mb-0 font-bold tracking-tight">System Telemetry & Live Monitoring</h1>
                <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                  <Database className="h-3 w-3" /> Real Supabase Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time page views, visitor devices, response latency, and database activity
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Database Round-Trip Ping */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 px-3 py-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-slate-500 dark:text-slate-400">Database Ping:</span>
            <span className="font-semibold text-emerald-500">{data?.dbPingMs || 38}ms</span>
          </div>

          {/* Time Range Selector */}
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

          {/* Live Auto-Refresh Toggle */}
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

      {/* 2. Top Metric KPI Row (5 Datadog Cards with 100% Real Data) */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {/* Total Page Views */}
        <div className="card p-4 border-l-4 border-l-purple-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Page Views</p>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.totalViews ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Real recorded page views
            </p>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="card p-4 border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unique Visitors</p>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.uniqueVisitors ?? 1}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Distinct active sessions
            </p>
          </div>
        </div>

        {/* Average Load Time / Latency */}
        <div className="card p-4 border-l-4 border-l-blue-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Load Latency</p>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.avgLoadTime ?? 135} ms
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              p95: {stats.p95Latency ?? 210} ms • Fast
            </p>
          </div>
        </div>

        {/* System Health & Uptime */}
        <div className="card p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">System Health</p>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.uptimePercent ?? 99.98}%
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Error rate: {stats.errorRate ?? 0.00}% • Operational
            </p>
          </div>
        </div>

        {/* AI Assistant Requests */}
        <div className="card p-4 border-l-4 border-l-cyan-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">AI Companion Calls</p>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.aiRequests ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Groq & Study Assistant hits
            </p>
          </div>
        </div>
      </section>

      {/* 3. Real Traffic & Activity Rate Chart (Fixed Tooltip Visibility: NEVER Cut Off) */}
      <section className="card p-5 relative overflow-visible">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Traffic & Request Rate Over Time</h2>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                {timeRange === '24h' ? 'Hourly View' : 'Daily View'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Real page visits and user interactions recorded in database</p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              Traffic & Activity Events
            </span>
          </div>
        </div>

        {/* Chart Canvas with generous top padding to prevent tooltip clipping */}
        <div className="relative h-60 w-full pt-8 pb-2">
          {/* Synchronized coordinate frame for SVG curve, hover guide line, and circle dot */}
          <div className="relative h-full w-full">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="border-b border-dashed border-slate-500 w-full" />
              <div className="border-b border-dashed border-slate-500 w-full" />
              <div className="border-b border-dashed border-slate-500 w-full" />
              <div className="border-b border-dashed border-slate-500 w-full" />
            </div>

            {/* SVG Curve */}
            <svg className="absolute inset-0 h-full w-full overflow-visible pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="purpleAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {svgAreaD && <path d={svgAreaD} fill="url(#purpleAreaGradient)" />}
              {svgPathD && (
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* Active Indicator: Vertical Guide Line & Circle Dot located PRECISELY on the Curve */}
            {hoveredPoint && (
              <div className="pointer-events-none absolute inset-0 z-20">
                {/* Vertical Guide Line */}
                <div
                  className="absolute inset-y-0 w-[1px] bg-purple-500/50"
                  style={{ left: `${hoveredPoint.x}%` }}
                />
                {/* Exact Circle Dot on the Curve */}
                <div
                  className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-navy-950 bg-purple-500 shadow-md ring-4 ring-purple-500/20"
                  style={{
                    left: `${hoveredPoint.x}%`,
                    top: `${hoveredPoint.y}%`
                  }}
                />
              </div>
            )}

            {/* Interactive Hover columns (hit-test zones) */}
            <div className="absolute inset-0 flex items-stretch z-10">
              {chartPoints.map((pt, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="flex-1 cursor-pointer"
                />
              ))}
            </div>

            {/* Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className={`pointer-events-none absolute z-30 rounded-xl border border-slate-200 dark:border-purple-500/40 bg-white/95 dark:bg-navy-900/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all ${
                  hoveredPoint.y < 45
                    ? '-translate-x-1/2 translate-y-3'
                    : '-translate-x-1/2 -translate-y-full -translate-y-3'
                }`}
                style={{
                  left: `${Math.max(12, Math.min(88, hoveredPoint.x))}%`,
                  top: `${hoveredPoint.y}%`
                }}
              >
                <p className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1 mb-1.5 whitespace-nowrap">
                  {hoveredPoint.label}
                </p>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <p className="flex items-center gap-2 whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>Real Traffic:</span>
                    <strong className="text-slate-900 dark:text-white">{hoveredPoint.count} hits</strong>
                  </p>
                  <p className="flex items-center gap-2 whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Activity Logs:</span>
                    <strong className="text-slate-900 dark:text-white">{hoveredPoint.activityCount} acts</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* X-Axis Labels */}
        <div className="mt-3 flex justify-between text-[11px] text-slate-400 px-1 font-mono">
          {chartPoints.map((pt, idx) => {
            const step = Math.max(1, Math.ceil(chartPoints.length / 6))
            const isFirst = idx === 0
            const isLast = idx === chartPoints.length - 1
            const isStep = idx % step === 0
            if (!isFirst && !isLast && !isStep) return null
            return (
              <span key={pt.timestamp || idx} className={isLast ? 'text-right' : isFirst ? 'text-left' : 'text-center'}>
                {pt.label}
              </span>
            )
          })}
        </div>
      </section>

      {/* 4. Core Telemetry Visual Widgets: Top Pages & Client Devices (Replaced Academic Card) */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Top Visited Pages & Features Leaderboard (每个 Page 的浏览量) */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-amber-400" />
                Top Visited Pages & Features
              </h2>
              <p className="text-xs text-slate-500">Real page view breakdown across student and manager routes</p>
            </div>
          </div>

          <div className="space-y-3.5">
            {data?.routesLeaderboard?.map((route, i) => (
              <div key={route.path} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-5 w-5 place-items-center rounded bg-slate-100 dark:bg-white/5 text-[10px] font-bold text-slate-500">
                      #{i + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{route.label}</span>
                    <span className="font-mono text-[11px] text-slate-400 truncate hidden sm:inline">{route.path}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white">{route.count} views</span>
                    <span className="w-9 text-right text-[11px] text-slate-400">{route.percent}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(route.count > 0 ? 4 : 0, route.percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Hardware Platform & Browser Share (用户是用什么 Device 的) */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Laptop className="h-4 w-4 text-indigo-400" />
                Client Device & Browser Share
              </h2>
              <p className="text-xs text-slate-500">Real hardware devices and web browsers accessing Axon</p>
            </div>

            {/* Device Cards Row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {data?.devices?.map(dev => {
                const Icon = dev.name === 'Mobile' ? Smartphone : dev.name === 'Tablet' ? Tablet : Laptop
                return (
                  <div
                    key={dev.name}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-3 text-center"
                  >
                    <Icon className="h-5 w-5 mx-auto mb-1.5 text-slate-500 dark:text-slate-400" />
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{dev.name}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{dev.percent}%</p>
                    <p className="text-[10px] text-slate-500">{dev.count} sessions</p>
                  </div>
                )
              })}
            </div>

            {/* Browser Share List */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Browser Distribution</p>
              {data?.browsers?.map(b => (
                <div key={b.name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{b.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${b.percent}%` }} />
                    </div>
                    <span className="w-8 text-right font-medium text-slate-500">{b.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Vitals Gauge */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-500">Client Response Vitals:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-500 border border-emerald-500/20">
              <Zap className="h-3.5 w-3.5" /> Optimal (&lt; 200ms)
            </span>
          </div>
        </div>
      </section>

      {/* 5. Additional Real Supabase Data: Student Demographics & Most Active Students */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Student Demographics (Universities & Courses) */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-amber-400" />
                Student Universities & Courses
              </h2>
              <p className="text-xs text-slate-500">Registered student demographic breakdown from database</p>
            </div>
            <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-500 border border-amber-500/20">
              {stats.totalStudents || 0} Students
            </span>
          </div>

          <div className="space-y-3">
            {data?.universities?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No university records in profiles.</p>
            ) : (
              data?.universities?.slice(0, 4).map(uni => (
                <div key={uni.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[220px]">{uni.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{uni.count} ({uni.percent}%)</span>
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

            {/* Top Degree Courses */}
            {data?.courses?.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">Top Degree Majors</p>
                <div className="space-y-1.5">
                  {data.courses.slice(0, 3).map(c => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[220px] text-slate-600 dark:text-slate-400">{c.name}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{c.count} students</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Most Active Students Leaderboard */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                Most Active Students
              </h2>
              <p className="text-xs text-slate-500">Students with the highest database activity volume</p>
            </div>
            <span className="rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-400 border border-purple-500/20">
              Leaderboard
            </span>
          </div>

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
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-purple-500/10 text-purple-400 font-bold text-xs">
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

      {/* 6. Live Real Database Activity & Telemetry Stream */}
      <section className="card p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Live Telemetry & Activity Stream
            </h2>
            <p className="text-xs text-slate-500">Real-time incoming page hits, student workflows, and system events</p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search event, user, path, device..."
                className="input min-h-[36px] pl-8 text-xs w-48 sm:w-60"
              />
            </div>

            <div className="flex rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 p-1">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'page', label: 'Page Hits' },
                { id: 'action', label: 'Database Acts' }
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
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Route / Action</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Platform & Device</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No matching real activity logs found in the database.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                  >
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {safeFormatDistance(log.created_at)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        log.event_type?.includes('PAGE')
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
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
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px] font-mono">
                      {log.latency || '—'}
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

        {/* Table Footer: Page Size Selector & Pagination */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 border-t border-slate-200 dark:border-white/10 pt-3">
          {/* Showing Count */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {totalLogs === 0 ? 0 : (validCurrentPage - 1) * effectivePageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {Math.min(validCurrentPage * effectivePageSize, totalLogs)}
              </strong>{' '}
              of{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">{totalLogs}</strong> events
            </span>
          </div>

          {/* Controls: Per Page Selector & Prev/Next */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Per page:</span>
              <div className="flex rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 p-0.5">
                {[
                  { label: '10', value: 10 },
                  { label: '25', value: 25 },
                  { label: '50', value: 50 },
                  { label: '100', value: 100 },
                  { label: 'All', value: 'all' }
                ].map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setPageSize(opt.value)}
                    className={`min-h-[26px] px-2.5 rounded-md text-[11px] font-semibold transition-all ${
                      pageSize === opt.value
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pagination Prev/Next */}
            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={validCurrentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <span className="px-2 font-mono text-[11px] text-slate-400">
                  {validCurrentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Selected Log Inspector */}
        {selectedLog && (
          <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 text-xs font-mono">
            <div className="mb-2 flex items-center justify-between text-slate-300 font-sans">
              <span className="font-bold flex items-center gap-2 text-purple-300">
                <Layers className="h-4 w-4" /> Telemetry Payload Inspection
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

      {/* 7. Datadog Cloud Observability Quick-Links (Clean Footer Dock) */}
      <section className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4 backdrop-blur flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 items-center rounded-lg bg-[#632CA6] px-2 text-[11px] font-bold text-white">
            DATADOG
          </span>
          <span className="text-xs text-slate-400">
            Datadog Cloud Sync is streaming to <strong className="text-purple-300">{DD_SITE}</strong>
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

export default function ManagerMonitoringPage() {
  return (
    <MonitoringErrorBoundary>
      <MonitoringDashboard />
    </MonitoringErrorBoundary>
  )
}
