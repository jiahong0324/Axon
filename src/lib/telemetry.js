import { supabase } from './supabase'
import { datadogRum } from '@datadog/browser-rum'

const VISITOR_ID_KEY = 'axon_telemetry_vid'
let lastTrackedPath = null
let lastTrackedTime = 0

// Retrieve or generate a persistent anonymous visitor ID
export function getVisitorId() {
  if (typeof window === 'undefined') return 'anon'
  try {
    let vid = localStorage.getItem(VISITOR_ID_KEY)
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36)
      localStorage.setItem(VISITOR_ID_KEY, vid)
    }
    return vid
  } catch {
    return 'anon'
  }
}

// Lightweight browser/device parser
export function detectClientEnvironment() {
  if (typeof window === 'undefined' || !navigator) {
    return { deviceType: 'desktop', browser: 'Browser', os: 'Unknown' }
  }

  const ua = navigator.userAgent || ''

  let deviceType = 'desktop'
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet'
  } else if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) {
    deviceType = 'mobile'
  }

  let os = 'Unknown'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  let browser = 'Other'
  if (/edg/i.test(ua)) browser = 'Edge'
  else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = 'Chrome'
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'
  else if (/opr|opera/i.test(ua)) browser = 'Opera'

  return { deviceType, browser, os }
}

// Track a page view across the application (100% real recording)
export async function trackPageView(path, metadata = {}) {
  if (!path || typeof window === 'undefined') return

  const now = Date.now()
  // Debounce consecutive hits to the exact same path within 2.5 seconds
  if (lastTrackedPath === path && now - lastTrackedTime < 2500) {
    return
  }
  lastTrackedPath = path
  lastTrackedTime = now

  try {
    const visitorId = getVisitorId()
    const env = detectClientEnvironment()

    // Measure client load duration
    let loadTimeMs = 0
    if (window.performance?.getEntriesByType) {
      const navEntries = window.performance.getEntriesByType('navigation')
      if (navEntries?.[0]?.duration > 0) {
        loadTimeMs = Math.round(navEntries[0].duration)
      }
    }

    // Identify user if logged in
    let userId = null
    let role = 'guest'
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        userId = session.user.id
        role = session.user.user_metadata?.role || (path.startsWith('/manager') ? 'manager' : 'student')
      }
    } catch {
      // non-blocking
    }

    // 1. Send action to Datadog RUM if active
    try {
      if (typeof datadogRum?.addAction === 'function') {
        datadogRum.addAction('page_view', {
          path,
          role,
          visitorId,
          device: env.deviceType,
          browser: env.browser,
          ...metadata
        })
      }
    } catch {}

    // 2. Insert into system_telemetry table if available
    supabase.from('system_telemetry').insert({
      event_type: 'page_view',
      path,
      user_id: userId,
      visitor_id: visitorId,
      role,
      device_type: env.deviceType,
      browser: env.browser,
      os: env.os,
      load_time_ms: loadTimeMs,
      status_code: 200,
      metadata: {
        title: document.title || '',
        screen: `${window.innerWidth}x${window.innerHeight}`,
        ...metadata
      }
    }).then(() => {}).catch(() => {})

    // 3. Also record into activity_log if logged in so it's guaranteed to persist in the existing database
    if (userId) {
      supabase.from('activity_log').insert({
        user_id: userId,
        action: 'PAGE_VIEW',
        entity_type: 'page',
        entity_name: path
      }).then(() => {}).catch(() => {})
    }
  } catch {
    // Non-blocking telemetry
  }
}

// Fetch 100% REAL database metrics from Supabase
export async function fetchAllRealSupabaseData(timeRange = '24h') {
  const startTime = Date.now()

  // Calculate cutoff date based on selected time range
  const cutoff = new Date()
  if (timeRange === '24h') cutoff.setHours(cutoff.getHours() - 24)
  else if (timeRange === '7d') cutoff.setDate(cutoff.getDate() - 7)
  else cutoff.setDate(cutoff.getDate() - 30)

  // Query all existing Supabase tables in parallel
  const [
    profilesRes,
    activityRes,
    classesRes,
    assignmentsRes,
    examsRes,
    examResultsRes,
    announcementsRes,
    feedbackRes,
    aiChatsRes,
    telemetryRes
  ] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('classes').select('*'),
    supabase.from('assignments').select('*'),
    supabase.from('exams').select('*'),
    supabase.from('exam_results').select('*'),
    supabase.from('announcements').select('*'),
    supabase.from('feedback').select('*').order('created_at', { ascending: false }),
    supabase.from('student_ai_chats').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('system_telemetry').select('*').gte('created_at', cutoff.toISOString()).order('created_at', { ascending: false }).limit(500)
  ])

  const dbPingMs = Date.now() - startTime

  // 1. Profiles & Demographics
  const allProfiles = profilesRes.data || []
  const students = allProfiles.filter(p => p.role === 'student')
  const managers = allProfiles.filter(p => p.role === 'manager')
  const activeStudents = students.filter(p => p.is_active !== false)

  // University distribution
  const uniMap = {}
  students.forEach(s => {
    const uni = (s.university || 'Unspecified').trim()
    uniMap[uni] = (uniMap[uni] || 0) + 1
  })
  const universities = Object.entries(uniMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / (students.length || 1)) * 100)
    }))

  // Course distribution
  const courseMap = {}
  students.forEach(s => {
    const c = (s.course || 'Unspecified').trim()
    courseMap[c] = (courseMap[c] || 0) + 1
  })
  const courses = Object.entries(courseMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / (students.length || 1)) * 100)
    }))

  // 2. Activity Logs & Traffic
  const allActivities = activityRes.data || []
  const profileMap = new Map(allProfiles.map(p => [p.id, p]))

  // Filter activities by time range
  const filteredActivities = allActivities.filter(a => new Date(a.created_at) >= cutoff)

  // Activity breakdown by type
  const entityTypeCounts = {}
  filteredActivities.forEach(a => {
    const type = a.entity_type || 'general'
    entityTypeCounts[type] = (entityTypeCounts[type] || 0) + 1
  })

  // Action breakdown
  const actionCounts = {}
  filteredActivities.forEach(a => {
    const action = a.action || 'ACTION'
    actionCounts[action] = (actionCounts[action] || 0) + 1
  })

  // Telemetry rows (if system_telemetry exists)
  const telemetryRows = telemetryRes.data || []
  const hasTelemetryTable = !telemetryRes.error

  // Combined traffic timeline (hourly for 24h, daily for 7d/30d)
  const bucketCount = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30
  const trend = []

  for (let i = bucketCount - 1; i >= 0; i--) {
    const bucketDate = new Date()
    if (timeRange === '24h') {
      bucketDate.setHours(bucketDate.getHours() - i)
      const hour = bucketDate.getHours()
      const label = `${hour.toString().padStart(2, '0')}:00`

      // Count activities matching this hour
      const actCount = filteredActivities.filter(a => {
        const d = new Date(a.created_at)
        return d.getDate() === bucketDate.getDate() && d.getHours() === hour
      }).length

      // Count telemetry hits matching this hour
      const telCount = telemetryRows.filter(t => {
        const d = new Date(t.created_at)
        return d.getDate() === bucketDate.getDate() && d.getHours() === hour
      }).length

      trend.push({
        label,
        timestamp: bucketDate.toISOString(),
        activityCount: actCount,
        views: hasTelemetryTable ? telCount : actCount
      })
    } else {
      bucketDate.setDate(bucketDate.getDate() - i)
      const label = bucketDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })

      const actCount = filteredActivities.filter(a => {
        const d = new Date(a.created_at)
        return d.toDateString() === bucketDate.toDateString()
      }).length

      const telCount = telemetryRows.filter(t => {
        const d = new Date(t.created_at)
        return d.toDateString() === bucketDate.toDateString()
      }).length

      trend.push({
        label,
        timestamp: bucketDate.toISOString(),
        activityCount: actCount,
        views: hasTelemetryTable ? telCount : actCount
      })
    }
  }

  // 3. Academic Entities
  const classes = classesRes.data || []
  const assignments = assignmentsRes.data || []
  const exams = examsRes.data || []
  const examResults = examResultsRes.data || []
  const announcements = announcementsRes.data || []
  const feedback = feedbackRes.data || []
  const aiChats = aiChatsRes.data || []

  // Assignments stats
  const completedAssignments = assignments.filter(a => a.status === 'Done')
  const pendingAssignments = assignments.filter(a => a.status !== 'Done')
  const assignmentCompletionRate = assignments.length > 0
    ? Math.round((completedAssignments.length / assignments.length) * 100)
    : 0

  // Exams stats (upcoming vs past)
  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingExams = exams.filter(e => e.exam_date && e.exam_date >= todayStr)
  const pastExams = exams.filter(e => e.exam_date && e.exam_date < todayStr)

  // Top Active Students Leaderboard
  const studentActivityMap = {}
  allActivities.forEach(a => {
    if (a.user_id) {
      studentActivityMap[a.user_id] = (studentActivityMap[a.user_id] || 0) + 1
    }
  })
  const activeStudentsLeaderboard = Object.entries(studentActivityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => {
      const p = profileMap.get(userId)
      return {
        id: userId,
        name: p?.full_name || p?.email || 'Student',
        email: p?.email || '',
        university: p?.university || 'Axon',
        avatarColor: p?.avatar_color || '#F59E0B',
        activityCount: count
      }
    })

  // Format real recent live logs combining telemetry and activity logs
  const combinedRecentLogs = [
    ...telemetryRows.map(t => ({
      id: t.id,
      created_at: t.created_at,
      source: 'telemetry',
      event_type: t.event_type || 'PAGE_VIEW',
      path: t.path || '/',
      user: profileMap.get(t.user_id)?.full_name || t.role || 'Visitor',
      role: t.role || 'guest',
      platform: `${t.browser || 'Browser'} on ${t.os || t.device_type || 'Device'}`,
      latency: t.load_time_ms ? `${t.load_time_ms}ms` : null,
      status: t.status_code || 200,
      details: t.metadata
    })),
    ...allActivities.slice(0, 40).map(a => {
      const p = profileMap.get(a.user_id)
      return {
        id: a.id,
        created_at: a.created_at,
        source: 'activity',
        event_type: a.action,
        path: `/${a.entity_type || 'system'}`,
        user: p?.full_name || p?.email || 'Student',
        role: p?.role || 'student',
        platform: 'Database Action',
        latency: null,
        status: 200,
        details: { entity: a.entity_name, type: a.entity_type }
      }
    })
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 60)

  return {
    dbPingMs,
    hasTelemetryTable,
    stats: {
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      totalManagers: managers.length,
      totalClasses: classes.length,
      totalAssignments: assignments.length,
      completedAssignments: completedAssignments.length,
      pendingAssignments: pendingAssignments.length,
      assignmentCompletionRate,
      totalExams: exams.length,
      upcomingExams: upcomingExams.length,
      pastExams: pastExams.length,
      totalExamResults: examResults.length,
      totalAnnouncements: announcements.length,
      totalFeedback: feedback.length,
      totalAIChats: aiChats.length,
      totalActivities: allActivities.length,
      filteredActivitiesCount: filteredActivities.length,
      totalTelemetryViews: telemetryRows.length
    },
    universities,
    courses,
    trend,
    activeStudentsLeaderboard,
    recentLogs: combinedRecentLogs,
    entityTypeCounts,
    actionCounts
  }
}
