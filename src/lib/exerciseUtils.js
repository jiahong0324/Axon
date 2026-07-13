import { supabase } from './supabase'
import { logActivity } from './logActivity'

export const ACTIVITY_TYPES = ['Gym', 'Yoga', 'Run', 'Other']

export const ACTIVITY_ICONS = {
  Gym: '🏋️',
  Run: '🏃',
  Sports: '🏀',
  Yoga: '🧘',
  Swim: '🏊',
  Walk: '🚶',
  Other: '⚡'
}

export function getTodayStr() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDailyMessage(messagesPool, dateStr = getTodayStr()) {
  if (!Array.isArray(messagesPool) || messagesPool.length === 0) {
    return 'Awesome job checking in today! Keep building momentum! 🎉'
  }
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) % messagesPool.length
  }
  const idx = Math.abs(hash) % messagesPool.length
  return messagesPool[idx]
}

export function getLevelInfo(xpTotal, t) {
  const xp = Number(xpTotal) || 0
  let level = 1
  let titleKey = 'exercise.levelTitles.1'
  let currentBaseXP = 0
  let nextLevelXP = 100

  if (xp >= 1500) {
    level = Math.floor((xp - 1500) / 1000) + 6
    titleKey = 'exercise.levelTitles.6'
    currentBaseXP = 1500 + (level - 6) * 1000
    nextLevelXP = currentBaseXP + 1000
  } else if (xp >= 900) {
    level = 5
    titleKey = 'exercise.levelTitles.5'
    currentBaseXP = 900
    nextLevelXP = 1500
  } else if (xp >= 500) {
    level = 4
    titleKey = 'exercise.levelTitles.4'
    currentBaseXP = 500
    nextLevelXP = 900
  } else if (xp >= 250) {
    level = 3
    titleKey = 'exercise.levelTitles.3'
    currentBaseXP = 250
    nextLevelXP = 500
  } else if (xp >= 100) {
    level = 2
    titleKey = 'exercise.levelTitles.2'
    currentBaseXP = 100
    nextLevelXP = 250
  }

  const title = t ? t(titleKey) : titleKey
  const progressPercent = Math.min(100, Math.max(0, Math.round(((xp - currentBaseXP) / (nextLevelXP - currentBaseXP)) * 100)))
  const xpNeeded = Math.max(0, nextLevelXP - xp)

  return {
    level,
    title,
    xp,
    currentBaseXP,
    nextLevelXP,
    xpNeeded,
    progressPercent
  }
}

export function calculateStreakAndStats(logs = [], weeklyGoal = 4, storedFreezes = 1, todayStr = getTodayStr(), xpTotal = 0) {
  const loggedDatesSet = new Set(logs.map(log => log.log_date))
  const isCheckedInToday = loggedDatesSet.has(todayStr)

  // Compute weekly count (Monday to Sunday containing todayStr)
  const todayDate = new Date(todayStr + 'T00:00:00')
  const dayOfWeek = (todayDate.getDay() + 6) % 7 // Monday = 0, Sunday = 6
  const mondayDate = new Date(todayDate)
  mondayDate.setDate(todayDate.getDate() - dayOfWeek)

  let weeklyCount = 0
  const currentWeekDays = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate)
    d.setDate(mondayDate.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const ds = `${y}-${m}-${day}`
    const logged = loggedDatesSet.has(ds)
    const logItem = logs.find(l => l.log_date === ds)
    currentWeekDays.push({
      dateStr: ds,
      dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      logged,
      activityType: logItem?.activity_type || null
    })
    if (logged) weeklyCount++
  }

  // Calculate current streak backwards
  let currentStreak = 0
  let freezesAvailable = Number(storedFreezes) >= 0 ? Number(storedFreezes) : 1
  let freezeUsedThisStreak = false

  const cursorDate = new Date(todayStr + 'T00:00:00')
  if (!isCheckedInToday) {
    cursorDate.setDate(cursorDate.getDate() - 1)
  }

  for (let step = 0; step < 3650; step++) {
    const y = cursorDate.getFullYear()
    const m = String(cursorDate.getMonth() + 1).padStart(2, '0')
    const day = String(cursorDate.getDate()).padStart(2, '0')
    const ds = `${y}-${m}-${day}`

    if (loggedDatesSet.has(ds)) {
      currentStreak++
    } else {
      // Check if we can protect a single gap day with a freeze
      if (freezesAvailable > 0 && currentStreak > 0) {
        freezesAvailable--
        freezeUsedThisStreak = true
        currentStreak++
      } else {
        break
      }
    }
    cursorDate.setDate(cursorDate.getDate() - 1)
  }

  // Calculate longest streak historically
  const sortedDates = Array.from(loggedDatesSet).sort()
  let longestStreak = 0
  let tempStreak = 0
  let prevDate = null

  for (const ds of sortedDates) {
    const curr = new Date(ds + 'T00:00:00')
    if (!prevDate) {
      tempStreak = 1
    } else {
      const diffDays = Math.round((curr - prevDate) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        tempStreak++
      } else if (diffDays === 2) {
        // Protected 1 skipped day
        tempStreak += 2
      } else {
        tempStreak = 1
      }
    }
    prevDate = curr
    if (tempStreak > longestStreak) longestStreak = tempStreak
  }
  if (currentStreak > longestStreak) longestStreak = currentStreak

  // Compute 8 Milestone Badges
  const computedXp = Math.max(xpTotal, logs.reduce((acc, cur) => acc + (cur.xp_earned || 20), 0))
  const badgeStatuses = [
    {
      id: 'first_step',
      titleKey: 'First Check-in',
      descKey: 'Log your very first workout in Axon',
      icon: '🌟',
      unlocked: logs.length >= 1
    },
    {
      id: '3_day',
      titleKey: '3-Day Starter',
      descKey: 'Reach a 3-day workout streak',
      icon: '⚡',
      unlocked: longestStreak >= 3 || currentStreak >= 3
    },
    {
      id: '7_day',
      titleKey: '7-Day Streak',
      descKey: 'Reach a 7-day workout streak',
      icon: '🔥',
      unlocked: longestStreak >= 7 || currentStreak >= 7
    },
    {
      id: '14_day',
      titleKey: '14-Day Warrior',
      descKey: 'Reach a 14-day workout streak',
      icon: '💪',
      unlocked: longestStreak >= 14 || currentStreak >= 14
    },
    {
      id: '30_day',
      titleKey: '30-Day Streak',
      descKey: 'Reach a 30-day workout streak',
      icon: '🚀',
      unlocked: longestStreak >= 30 || currentStreak >= 30
    },
    {
      id: '100_day',
      titleKey: '100-Day Legend',
      descKey: 'Reach a 100-day workout streak',
      icon: '👑',
      unlocked: longestStreak >= 100 || currentStreak >= 100
    },
    {
      id: 'weekly_goal',
      titleKey: 'Weekly Champion',
      descKey: 'Meet your weekly exercise target',
      icon: '🏆',
      unlocked: weeklyCount >= weeklyGoal
    },
    {
      id: 'xp_500',
      titleKey: 'XP Master (500+ XP)',
      descKey: 'Earn 500 total XP from workouts & habits',
      icon: '💎',
      unlocked: computedXp >= 500
    }
  ]

  return {
    currentStreak,
    longestStreak,
    weeklyCount,
    weeklyGoal,
    isCheckedInToday,
    currentWeekDays,
    freezesAvailable,
    freezeUsedThisStreak,
    badgeStatuses
  }
}

export async function fetchExerciseData(userId) {
  const cacheKey = userId ? `axon_exercise_data_${userId}` : 'axon_exercise_data_global'
  let logs = []
  let weeklyGoal = 4
  let xpTotal = 0
  let freezesAvailable = 1

  // 1. Read from local cache first (global fallback + user specific)
  try {
    const cachedGlobal = JSON.parse(localStorage.getItem('axon_exercise_data_global') || 'null')
    const cachedUser = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    const cached = cachedUser || cachedGlobal
    if (cached) {
      if (Array.isArray(cached.logs)) logs = cached.logs
      if (typeof cached.weeklyGoal === 'number') weeklyGoal = cached.weeklyGoal
      if (typeof cached.xpTotal === 'number') xpTotal = cached.xpTotal
      if (typeof cached.freezesAvailable === 'number') freezesAvailable = cached.freezesAvailable
    }
  } catch (e) {}

  if (!userId) return { logs, weeklyGoal, xpTotal, freezesAvailable }

  // 2. Read from Supabase profile, auth user_metadata, and exercise_logs table
  try {
    const [userRes, profileRes, logsRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('weekly_exercise_goal, xp_total, streak_freezes_available').eq('id', userId).single(),
      supabase.from('exercise_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false })
    ])

    if (profileRes.data) {
      if (typeof profileRes.data.weekly_exercise_goal === 'number') weeklyGoal = profileRes.data.weekly_exercise_goal
      if (typeof profileRes.data.xp_total === 'number') xpTotal = Math.max(xpTotal, profileRes.data.xp_total)
      if (typeof profileRes.data.streak_freezes_available === 'number') freezesAvailable = profileRes.data.streak_freezes_available
    }

    const meta = userRes?.data?.user?.user_metadata || {}
    const metaLogs = Array.isArray(meta.axon_exercise_logs) ? meta.axon_exercise_logs : []
    const tableLogs = (logsRes.data && Array.isArray(logsRes.data)) ? logsRes.data : []

    // Merge and deduplicate logs by log_date across local cache + metadata + database table
    const mergedMap = new Map()
    for (const l of [...logs, ...metaLogs, ...tableLogs]) {
      if (l && l.log_date) {
        if (!mergedMap.has(l.log_date)) {
          mergedMap.set(l.log_date, l)
        }
      }
    }
    const mergedLogs = Array.from(mergedMap.values()).sort((a, b) => (a.log_date < b.log_date ? 1 : -1))

    if (mergedLogs.length > 0) {
      logs = mergedLogs
    }
    if (typeof meta.axon_xp_total === 'number') {
      xpTotal = Math.max(xpTotal, meta.axon_xp_total)
    }
    if (typeof meta.axon_weekly_goal === 'number') {
      weeklyGoal = meta.axon_weekly_goal
    }
  } catch (e) {}

  // Also sync weekly freeze reward check
  const checkWeekKey = `axon_freeze_awarded_week_${userId}`
  const todayDate = new Date()
  const weekNo = getWeekNumber(todayDate)
  if (localStorage.getItem(checkWeekKey) !== String(weekNo)) {
    freezesAvailable += 1
    localStorage.setItem(checkWeekKey, String(weekNo))
    try {
      await supabase.from('profiles').update({ streak_freezes_available: freezesAvailable }).eq('id', userId)
    } catch {}
  }

  const result = { logs, weeklyGoal, xpTotal, freezesAvailable }
  try {
    localStorage.setItem(cacheKey, JSON.stringify(result))
    localStorage.setItem('axon_exercise_data_global', JSON.stringify(result))
  } catch {}

  return result
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

export async function logExerciseCheckIn({ userId, logDate = getTodayStr(), activityType = 'Gym', currentWeeklyGoal = 4, currentXpTotal = 0, currentFreezes = 1, logs = [] }) {
  if (!userId) return { error: 'No user' }

  // Check if already checked in
  if (logs.some(l => l.log_date === logDate)) {
    return { error: 'Already checked in today' }
  }

  const newLog = {
    id: `local-${Date.now()}`,
    user_id: userId,
    log_date: logDate,
    activity_type: activityType,
    xp_earned: 20,
    created_at: new Date().toISOString()
  }

  const updatedLogs = [newLog, ...logs]

  // Calculate stats before and after to see badges unlocked
  const beforeStats = calculateStreakAndStats(logs, currentWeeklyGoal, currentFreezes, logDate)
  const afterStats = calculateStreakAndStats(updatedLogs, currentWeeklyGoal, currentFreezes, logDate)

  let bonusXP = 0
  const unlockedNow = []

  if (!beforeStats.badgeStatuses.find(b => b.id === '7_day')?.unlocked && afterStats.badgeStatuses.find(b => b.id === '7_day')?.unlocked) {
    bonusXP += 100
    unlockedNow.push('7_day')
  }
  if (!beforeStats.badgeStatuses.find(b => b.id === '30_day')?.unlocked && afterStats.badgeStatuses.find(b => b.id === '30_day')?.unlocked) {
    bonusXP += 300
    unlockedNow.push('30_day')
  }
  if (!beforeStats.badgeStatuses.find(b => b.id === '100_day')?.unlocked && afterStats.badgeStatuses.find(b => b.id === '100_day')?.unlocked) {
    bonusXP += 1000
    unlockedNow.push('100_day')
  }
  if (!beforeStats.badgeStatuses.find(b => b.id === 'weekly_goal')?.unlocked && afterStats.badgeStatuses.find(b => b.id === 'weekly_goal')?.unlocked) {
    bonusXP += 50
    unlockedNow.push('weekly_goal')
  }

  const xpEarned = 20 + bonusXP
  newLog.xp_earned = xpEarned
  const newXpTotal = currentXpTotal + xpEarned
  const newFreezes = afterStats.freezesAvailable

  // 1. Update local cache immediately
  const resultData = {
    logs: updatedLogs,
    weeklyGoal: currentWeeklyGoal,
    xpTotal: newXpTotal,
    freezesAvailable: newFreezes
  }
  try {
    localStorage.setItem(`axon_exercise_data_${userId}`, JSON.stringify(resultData))
    localStorage.setItem('axon_exercise_data_global', JSON.stringify(resultData))
  } catch {}

  // 2. Persist to Supabase user_metadata (guaranteed dual cloud sync across laptop & mobile) + SQL tables
  try {
    await supabase.auth.updateUser({
      data: {
        axon_exercise_logs: updatedLogs,
        axon_xp_total: newXpTotal,
        axon_freezes: newFreezes
      }
    })
  } catch {}

  try {
    await supabase.from('exercise_logs').insert({
      user_id: userId,
      log_date: logDate,
      activity_type: activityType,
      xp_earned: xpEarned
    })
    await supabase.from('profiles').update({
      xp_total: newXpTotal,
      streak_freezes_available: newFreezes
    }).eq('id', userId)
  } catch {}

  try {
    await logActivity(`Exercise check-in (${activityType})`, 'exercise', activityType)
  } catch {}

  return {
    success: true,
    newLog,
    xpEarned,
    newXpTotal,
    newFreezes,
    unlockedBadges: unlockedNow,
    updatedLogs
  }
}
