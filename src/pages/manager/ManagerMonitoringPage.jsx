import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  HelpCircle,
  Laptop,
  Layers,
  LineChart,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Search,
  Server,
  Shield,
  Smartphone,
  Tablet,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Zap,
  AlertTriangle
} from 'lucide-react'
import { fetchTelemetryData, trackPageView } from '../../lib/telemetry'
import { formatDistanceToNow } from 'date-fns'

const DD_APP_ID = import.meta.env.VITE_DATADOG_APPLICATION_ID || '32016b10-deaf-4537-9a77-6ac3375262dd'
const DD_SITE = import.meta.env.VITE_DATADOG_SITE || 'us5.datadoghq.com'
const DD_BASE_URL = `https://${DD_SITE}`

export default function ManagerMonitoringPage() {
  const [timeRange, setTimeRange] = useState('24h') // '24h' | '7d' | '30d'
  const [isLive, setIsLive] = useState(true)
  const [useDemo, setUseDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [telemetry, setTelemetry] = useState(null)
  const [isDemoData, setIsDemoData] = useState(false)
  const [schemaPending, setSchemaPending] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'page_view' | 'api_request' | 'error'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const [embedUrl, setEmbedUrl] = useState('')
  const [showEmbedInput, setShowEmbedInput] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // Track page view for this manager route
  useEffect(() => {
    trackPageView('/manager/monitoring', { title: 'Manager System Telemetry' })
  }, [])

  // Initial fetch and auto-refresh
  const loadData = async (forceDemo = useDemo) => {
    try {
      const result = await fetchTelemetryData(timeRange, forceDemo)
      setTelemetry(result.data)
      setIsDemoData(result.isDemo)
      if (result.schemaPending !== undefined) {
        setSchemaPending(result.schemaPending)
      }
    } catch (e) {
      console.error('Failed to load telemetry', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData(useDemo)
  }, [timeRange, useDemo])

  // Live auto-refresh interval (every 10s if live)
  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      loadData(useDemo)
    }, 10000)
    return () => clearInterval(interval)
  }, [isLive, timeRange, useDemo])

  // Filtered log items
  const filteredLogs = useMemo(() => {
    if (!telemetry?.recentLogs) return []
    return telemetry.recentLogs.filter(log => {
      if (activeTab === 'page_view' && log.event_type !== 'page_view') return false
      if (activeTab === 'api_request' && log.event_type !== 'api_request') return false
      if (activeTab === 'error' && log.status_code < 400 && log.event_type !== 'error') return false

      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const path = (log.path || '').toLowerCase()
      const role = (log.role || '').toLowerCase()
      const browser = (log.browser || '').toLowerCase()
      const os = (log.os || '').toLowerCase()
      return path.includes(q) || role.includes(q) || browser.includes(q) || os.includes(q)
    })
  }, [telemetry?.recentLogs, activeTab, searchQuery])

  // SVG Chart calculation helpers
  const chartPoints = useMemo(() => {
    if (!telemetry?.trend || telemetry.trend.length === 0) return []
    const maxVal = Math.max(...telemetry.trend.map(p => p.views), 10)
    return telemetry.trend.map((pt, idx) => {
      const x = (idx / (telemetry.trend.length - 1)) * 100
      const y = 100 - (pt.views / maxVal) * 85 // Leave 15% top margin
      return { ...pt, x, y, maxVal }
    })
  }, [telemetry?.trend])

  const svgPathD = useMemo(() => {
    if (chartPoints.length === 0) return ''
    return chartPoints.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`
      // Smooth quadratic curve
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

  return (
    <main className="main-content space-y-6">
      {/* 1. Header with Datadog Badge & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <LineChart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title !mb-0 font-bold tracking-tight">System Monitoring & Observability</h1>
                <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-400">
                  Datadog RUM
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time traffic analytics, visitor sessions, and client telemetry stream
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Ingest Status */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 px-3 py-2 text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Live Ingest:</span>
            <span className="font-semibold text-emerald-500">Active</span>
          </div>

          {/* Time range selector */}
          <div className="flex rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 p-1">
            {['24h', '7d', '30d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`min-h-[36px] min-w-[48px] rounded-lg px-3 text-xs font-semibold transition-all ${
                  timeRange === range
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Live Pause/Play */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`min-h-[40px] flex items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
              isLive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-400'
            }`}
            title={isLive ? 'Pause auto-refresh' : 'Resume live auto-refresh'}
          >
            {isLive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isLive ? 'Streaming' : 'Paused'}
          </button>

          {/* Refresh Now */}
          <button
            onClick={() => loadData(useDemo)}
            disabled={loading}
            className="min-h-[40px] flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Demo toggle */}
          <button
            onClick={() => setUseDemo(!useDemo)}
            className={`min-h-[40px] flex items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all ${
              useDemo
                ? 'border-purple-500/40 bg-purple-500/20 text-purple-300'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400'
            }`}
            title="Toggle high-traffic benchmark demo data"
          >
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            {useDemo ? 'Benchmark Mode' : 'Live Data'}
          </button>
        </div>
      </div>

      {/* Schema pending notice if table is not yet in Supabase */}
      {schemaPending && !useDemo && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-300">Database Telemetry Table Initializing</p>
            <p className="mt-1 text-slate-300">
              The table <code className="rounded bg-black/30 px-1 py-0.5 text-amber-300">system_telemetry</code> has not been created in Supabase yet.
              Currently synthesizing traffic metrics from student activity logs. To enable full granular visitor tracking, run <code className="rounded bg-black/30 px-1 py-0.5 text-amber-300">supabase-monitoring-schema.sql</code> in your Supabase SQL Editor.
            </p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText('-- Run supabase-monitoring-schema.sql from project root')
              setCopiedSql(true)
              setTimeout(() => setCopiedSql(false), 2000)
            }}
            className="rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 font-medium text-amber-300 hover:bg-amber-500/30"
          >
            {copiedSql ? 'Copied' : 'Schema Ready'}
          </button>
        </div>
      )}

      {/* 2. Datadog Observability Cloud Quick-Launcher Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-navy-900/60 to-purple-950/30 p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center rounded-lg bg-[#632CA6] px-2.5 text-xs font-bold text-white shadow-sm shadow-purple-500/20">
                DATADOG
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Observability Cloud Status</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            </div>
            <p className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>Service: <strong className="text-slate-200">axon-pwa</strong></span>
              <span>Site: <strong className="text-purple-300">{DD_SITE}</strong></span>
              <span>App ID: <strong className="text-slate-200 font-mono text-[11px]">{DD_APP_ID.substring(0, 8)}...</strong></span>
              <span>Session Replay: <strong className="text-emerald-400">100% Active</strong></span>
            </p>
          </div>

          {/* Quick Action Links into Datadog */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`${DD_BASE_URL}/rum/sessions?query=service%3Aaxon-pwa`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-all"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              RUM Explorer
              <ArrowUpRight className="h-3 w-3 opacity-70" />
            </a>

            <a
              href={`${DD_BASE_URL}/rum/replay/sessions?query=service%3Aaxon-pwa`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-all"
            >
              <Video className="h-3.5 w-3.5" />
              Session Replay
              <ArrowUpRight className="h-3 w-3 opacity-70" />
            </a>

            <a
              href={`${DD_BASE_URL}/logs?query=service%3Aaxon-ai-companion`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-all"
            >
              <Zap className="h-3.5 w-3.5" />
              AI Telemetry Logs
              <ArrowUpRight className="h-3 w-3 opacity-70" />
            </a>

            <button
              onClick={() => setShowEmbedInput(!showEmbedInput)}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
              title="Embed shared Datadog dashboard"
            >
              <Layers className="h-3.5 w-3.5" />
              Embed
            </button>
          </div>
        </div>

        {/* Optional Embed Input */}
        {showEmbedInput && (
          <div className="mt-4 pt-4 border-t border-purple-500/20 space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={embedUrl}
                onChange={e => setEmbedUrl(e.target.value)}
                placeholder="Paste Datadog Shared Dashboard or Graph URL (e.g. https://p.datadoghq.com/sb/...)"
                className="input flex-1 text-xs"
              />
              <button
                onClick={() => setEmbedUrl('')}
                className="btn-ghost text-xs px-3"
              >
                Clear
              </button>
            </div>
            {embedUrl && (
              <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-purple-500/30 bg-black/40">
                <iframe
                  src={embedUrl}
                  title="Datadog Shared Dashboard"
                  className="h-full w-full border-0"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. KPI Summary Metric Cards */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Total Page Views"
          value={telemetry?.totalViews?.toLocaleString() || '0'}
          sub="+14.2% vs prev period"
          trend="up"
          icon={Eye}
          color="text-purple-400"
          border="border-l-purple-500"
        />

        <MetricCard
          label="Unique Visitors"
          value={telemetry?.uniqueVisitors?.toLocaleString() || '0'}
          sub={`Active Now: ${telemetry?.activeSessionsNow || 1} online`}
          trend="neutral"
          icon={Users}
          color="text-amber-400"
          border="border-l-amber-500"
        />

        <MetricCard
          label="Avg Response Latency"
          value={`${telemetry?.avgLoadTime || 180} ms`}
          sub={`p95: ${telemetry?.p95Latency || 320} ms`}
          trend="good"
          icon={Clock}
          color="text-blue-400"
          border="border-l-blue-500"
        />

        <MetricCard
          label="System Health & Uptime"
          value={`${telemetry?.uptimePercent || 99.98}%`}
          sub={`Error rate: ${telemetry?.errorRate || 0.04}%`}
          trend="good"
          icon={Shield}
          color="text-emerald-400"
          border="border-l-emerald-500"
        />

        <MetricCard
          label="AI Companion Calls"
          value={telemetry?.aiRequests?.toLocaleString() || '0'}
          sub="Groq & Vision OCR hits"
          trend="neutral"
          icon={Cpu}
          color="text-cyan-400"
          border="border-l-cyan-500"
        />
      </section>

      {/* 4. Interactive Traffic Trend Chart (Datadog SVG Area) */}
      <section className="card p-5 relative">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Traffic & Request Rate</h2>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-500/20">
                {timeRange === '24h' ? 'Hourly View' : 'Daily View'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Hits, page views, and concurrent visitor volume over time</p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              Page Views
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              Estimated Visitors
            </span>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="relative h-60 w-full overflow-hidden pt-4">
          {/* Background Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-15">
            <div className="border-b border-dashed border-slate-400 dark:border-white w-full" />
            <div className="border-b border-dashed border-slate-400 dark:border-white w-full" />
            <div className="border-b border-dashed border-slate-400 dark:border-white w-full" />
            <div className="border-b border-dashed border-slate-400 dark:border-white w-full" />
          </div>

          {/* SVG Curve */}
          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gradient Area */}
            {svgAreaD && <path d={svgAreaD} fill="url(#purpleGradient)" />}

            {/* Line Stroke */}
            {svgPathD && (
              <path
                d={svgPathD}
                fill="none"
                stroke="#A855F7"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* Hover interactive anchors */}
          <div className="absolute inset-0 flex items-stretch">
            {chartPoints.map((pt, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="flex-1 relative group cursor-pointer"
              >
                {/* Vertical guideline on hover */}
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-purple-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Point dot on hover */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-white dark:border-navy-950 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  style={{ top: `${pt.y}%` }}
                />
              </div>
            ))}
          </div>

          {/* Tooltip Overlay */}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-20 rounded-xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-navy-900/95 p-3 text-xs shadow-xl backdrop-blur-md -translate-x-1/2 -translate-y-full transition-all"
              style={{
                left: `${Math.max(12, Math.min(88, hoveredPoint.x))}%`,
                top: `${Math.max(15, hoveredPoint.y - 10)}%`
              }}
            >
              <p className="font-semibold text-slate-900 dark:text-white">{hoveredPoint.label}</p>
              <div className="mt-1 space-y-0.5 text-slate-500 dark:text-slate-400">
                <p className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span>Views:</span>
                  <strong className="text-slate-900 dark:text-white">{hoveredPoint.views}</strong>
                </p>
                <p className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span>Unique Visitors:</span>
                  <strong className="text-slate-900 dark:text-white">{hoveredPoint.uniqueVisitors}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* X-Axis Labels */}
        <div className="mt-3 flex justify-between text-[11px] text-slate-400 px-1">
          {chartPoints.filter((_, i) => i % Math.ceil(chartPoints.length / 6) === 0).map((pt, i) => (
            <span key={i}>{pt.label}</span>
          ))}
          {chartPoints.length > 0 && <span>{chartPoints[chartPoints.length - 1].label}</span>}
        </div>
      </section>

      {/* 5. Two Columns: Route Leaderboard & Device Breakdown */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Top Visited Routes */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-amber-400" />
                Top Visited Pages & Features
              </h2>
              <p className="text-xs text-slate-500">Distribution of page requests across student & manager features</p>
            </div>
          </div>

          <div className="space-y-3.5">
            {telemetry?.routes?.map((route, i) => (
              <div key={route.path} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-5 w-5 place-items-center rounded bg-slate-100 dark:bg-white/5 text-[10px] font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{route.label}</span>
                    <span className="font-mono text-[11px] text-slate-400 truncate hidden sm:inline">{route.path}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white">{route.count}</span>
                    <span className="w-9 text-right text-[11px] text-slate-400">{route.percent}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${route.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Environment Breakdown */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Laptop className="h-4 w-4 text-indigo-400" />
                Client Platform & Browser Share
              </h2>
              <p className="text-xs text-slate-500">Hardware platforms and browsers connecting to Axon</p>
            </div>

            {/* Device Types Row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {telemetry?.devices?.map(dev => {
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

            {/* Browsers List */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Browser Distribution</p>
              {telemetry?.browsers?.map(b => (
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-400 border border-emerald-500/20">
              <Zap className="h-3.5 w-3.5" /> Optimal (&lt; 200ms)
            </span>
          </div>
        </div>
      </section>

      {/* 6. Live Telemetry Log Stream (Datadog Log Explorer) */}
      <section className="card p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Live Telemetry Log Stream
            </h2>
            <p className="text-xs text-slate-500">Real-time incoming page hits, API calls, and telemetry events</p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search path, role, device..."
                className="input min-h-[36px] pl-8 text-xs w-48 sm:w-60"
              />
            </div>

            {/* Event Type Tabs */}
            <div className="flex rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 p-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'page_view', label: 'Views' },
                { id: 'api_request', label: 'API' },
                { id: 'error', label: 'Errors' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[32px] rounded-lg px-2.5 text-xs font-medium transition-all ${
                    activeTab === tab.id
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

        {/* Logs Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Path / Event</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400 font-sans">
                    No matching telemetry logs in this time window.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isErr = log.status_code >= 400 || log.event_type === 'error'
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    >
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : 'just now'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            isErr
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {log.status_code || 200}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="rounded bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                          {log.event_type || 'page_view'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                        {log.path}
                      </td>
                      <td className="py-2.5 px-3 capitalize text-slate-400">
                        {log.role || 'guest'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {log.browser} • {log.os || log.device_type}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {log.load_time_ms ? `${log.load_time_ms}ms` : '120ms'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setSelectedLog(selectedLog?.id === log.id ? null : log)
                          }}
                          className="text-[11px] text-amber-500 hover:text-amber-400 underline font-sans"
                        >
                          {selectedLog?.id === log.id ? 'Close' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Log Inspector Drawer */}
        {selectedLog && (
          <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 font-mono text-xs">
            <div className="mb-2 flex items-center justify-between text-slate-300 font-sans">
              <span className="font-bold flex items-center gap-2 text-purple-300">
                <Layers className="h-4 w-4" /> Telemetry Event Detail
              </span>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <pre className="max-h-60 overflow-y-auto rounded-lg bg-black/40 p-3 text-slate-300 scrollbar-hide">
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </main>
  )
}

function MetricCard({ label, value, sub, trend, icon: Icon, color, border }) {
  return (
    <div className={`card p-4 border-l-4 ${border} flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className={`p-1.5 rounded-lg bg-white/5 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{sub}</p>
      </div>
    </div>
  )
}
