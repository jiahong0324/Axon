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

  const defaultTitles = {
    'exercise.levelTitles.1': 'Novice Mover',
    'exercise.levelTitles.2': 'Active Explorer',
    'exercise.levelTitles.3': 'Fitness Buff',
    'exercise.levelTitles.4': 'Dedicated Athlete',
    'exercise.levelTitles.5': 'Streak Master',
    'exercise.levelTitles.6': 'Elite Performer'
  }

  let title = t ? t(titleKey) : (defaultTitles[titleKey] || titleKey)
  if (title === titleKey && defaultTitles[titleKey]) {
    title = defaultTitles[titleKey]
  }

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

export const MAX_FREEZES = 5
export const INITIAL_FREEZES = 5

export function formatDateYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getWeekMondayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = (d.getDay() + 6) % 7 // Monday = 0, Sunday = 6
  const monday = new Date(d)
  monday.setDate(d.getDate() - dayOfWeek)
  return formatDateYMD(monday)
}

export function calculateStreakAndStats(
  logs = [],
  weeklyGoal = 4,
  storedFreezes = 5,
  todayStr = getTodayStr(),
  xpTotal = 0,
  storedFrozenDates = []
) {
  const validLogs = Array.isArray(logs)
    ? logs.filter(l => l && l.log_date && l.activity_type !== 'Streak Freeze')
    : []
  const loggedDatesSet = new Set(validLogs.map(log => log.log_date))
  const isCheckedInToday = loggedDatesSet.has(todayStr)

  // 1. Compute weekly count (Monday to Sunday containing todayStr)
  const todayDate = new Date(todayStr + 'T00:00:00')
  const dayOfWeek = (todayDate.getDay() + 6) % 7 // Monday = 0, Sunday = 6
  const mondayDate = new Date(todayDate)
  mondayDate.setDate(todayDate.getDate() - dayOfWeek)

  const yesterdayDate = new Date(todayDate)
  yesterdayDate.setDate(todayDate.getDate() - 1)
  const yesterdayStr = formatDateYMD(yesterdayDate)

  const frozenDatesSet = new Set(
    (Array.isArray(storedFrozenDates) ? storedFrozenDates : []).filter(ds => ds && !loggedDatesSet.has(ds))
  )

  let weeklyCount = 0
  const currentWeekDays = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate)
    d.setDate(mondayDate.getDate() + i)
    const ds = formatDateYMD(d)
    const logged = loggedDatesSet.has(ds)
    const isFrozen = frozenDatesSet.has(ds)
    const logItem = validLogs.find(l => l.log_date === ds)
    currentWeekDays.push({
      dateStr: ds,
      dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      logged,
      isFrozen,
      activityType: logItem?.activity_type || null
    })
    if (logged) weeklyCount++
  }

  // Track workouts per calendar week (Monday-Sunday) across all history for permanent Weekly Champion badge
  const weekCountsMap = new Map()
  for (const ds of loggedDatesSet) {
    const wkMon = getWeekMondayStr(ds)
    weekCountsMap.set(wkMon, (weekCountsMap.get(wkMon) || 0) + 1)
  }
  let maxWeeklyCountEver = weeklyCount
  for (const count of weekCountsMap.values()) {
    if (count > maxWeeklyCountEver) maxWeeklyCountEver = count
  }

  // Find the earliest log date in user history
  const sortedDates = Array.from(loggedDatesSet).sort()
  const earliestLogDate = sortedDates.length > 0 ? sortedDates[0] : null

  // 2. Chronological 5/5 Shield Inventory Simulation up to Yesterday:
  // - Starts full at 5/5 shields (INITIAL_FREEZES = 5, MAX_FREEZES = 5)
  // - Consumes 1 shield on each previously frozen date
  // - Refills +1 shield (up to 5/5) every 5 workouts completed
  // - Refills +1 shield (up to 5/5) whenever weeklyGoal is met in a week
  let simulatedFreezesBeforeToday = INITIAL_FREEZES
  let workoutsBeforeToday = 0
  const simWeekCounts = new Map()

  if (earliestLogDate && earliestLogDate < todayStr) {
    const simCursor = new Date(earliestLogDate + 'T00:00:00')
    while (formatDateYMD(simCursor) < todayStr) {
      const ds = formatDateYMD(simCursor)
      if (loggedDatesSet.has(ds)) {
        workoutsBeforeToday++
        const wkMon = getWeekMondayStr(ds)
        const wkCount = (simWeekCounts.get(wkMon) || 0) + 1
        simWeekCounts.set(wkMon, wkCount)

        if (workoutsBeforeToday % 5 === 0) {
          simulatedFreezesBeforeToday = Math.min(MAX_FREEZES, simulatedFreezesBeforeToday + 1)
        }
        if (wkCount === weeklyGoal) {
          simulatedFreezesBeforeToday = Math.min(MAX_FREEZES, simulatedFreezesBeforeToday + 1)
        }
      } else if (frozenDatesSet.has(ds)) {
        simulatedFreezesBeforeToday = Math.max(0, simulatedFreezesBeforeToday - 1)
      }
      simCursor.setDate(simCursor.getDate() + 1)
    }
  }

  let availableFreezes = simulatedFreezesBeforeToday
  const totalWorkoutsCount = loggedDatesSet.size
  const freezeProgress = totalWorkoutsCount % 5

  // Determine if today's check-in earned any refill shields
  let earnedToday = 0
  let earnedMilestoneFreezeToday = false
  let earnedWeeklyGoalFreezeToday = false
  if (isCheckedInToday) {
    const totalAfterToday = workoutsBeforeToday + 1
    if (totalAfterToday % 5 === 0) {
      earnedToday++
      earnedMilestoneFreezeToday = true
    }
    const currentWeekMonday = formatDateYMD(mondayDate)
    const currentWeekBeforeToday = simWeekCounts.get(currentWeekMonday) || 0
    if (currentWeekBeforeToday + 1 === weeklyGoal) {
      earnedToday++
      earnedWeeklyGoalFreezeToday = true
    }
  }

  const newlyFrozenDates = []
  let currentStreak = 0
  let freezeUsedThisStreak = false

  if (sortedDates.length > 0) {
    // Start examining from today if checked in, or from yesterday if not yet checked in today
    let cursorDate = new Date(todayStr + 'T00:00:00')
    if (!isCheckedInToday) {
      cursorDate.setDate(cursorDate.getDate() - 1)
    }

    let seenPastWorkout = false

    while (true) {
      const ds = formatDateYMD(cursorDate)

      if (ds < earliestLogDate) {
        break
      }

      if (loggedDatesSet.has(ds)) {
        currentStreak++
        if (ds < todayStr) {
          seenPastWorkout = true
        }
        cursorDate.setDate(cursorDate.getDate() - 1)
      } else if (frozenDatesSet.has(ds)) {
        // Missed day was previously frozen — streak remains protected
        freezeUsedThisStreak = true
        cursorDate.setDate(cursorDate.getDate() - 1)
      } else {
        // Missed day encountered!
        // Measure the length of this consecutive missed gap
        let gapLength = 0
        const probeDate = new Date(cursorDate)
        const earliestDateObj = new Date(earliestLogDate + 'T00:00:00')
        while (probeDate >= earliestDateObj) {
          const pds = formatDateYMD(probeDate)
          if (loggedDatesSet.has(pds) || frozenDatesSet.has(pds)) {
            break
          }
          gapLength++
          probeDate.setDate(probeDate.getDate() - 1)
        }

        // Check if there is an earlier workout log before this gap
        let hasEarlierLog = false
        const checkEarlier = new Date(cursorDate)
        checkEarlier.setDate(checkEarlier.getDate() - gapLength)
        while (checkEarlier >= earliestDateObj) {
          const eds = formatDateYMD(checkEarlier)
          if (loggedDatesSet.has(eds)) {
            hasEarlierLog = true
            break
          }
          checkEarlier.setDate(checkEarlier.getDate() - 1)
        }

        // Auto-freeze the most recent missed gap before today (!seenPastWorkout)
        // if freezes available BEFORE today can cover this entire gap.
        // Removing !isCheckedInToday ensures checking in today still protects yesterday if not yet persisted.
        if (!seenPastWorkout && hasEarlierLog && gapLength > 0 && availableFreezes >= gapLength) {
          for (let g = 0; g < gapLength; g++) {
            const gds = formatDateYMD(cursorDate)
            availableFreezes--
            frozenDatesSet.add(gds)
            newlyFrozenDates.push(gds)
            freezeUsedThisStreak = true
            cursorDate.setDate(cursorDate.getDate() - 1)
          }
        } else {
          // Stop counting backwards immediately.
          break
        }
      }
    }
  }

  // Add any freeze earned from today's check-in AFTER evaluating past gaps, capped at MAX_FREEZES (5)
  availableFreezes = Math.min(MAX_FREEZES, availableFreezes + earnedToday)

  // Update currentWeekDays if newly frozen dates fall into current week
  for (const day of currentWeekDays) {
    if (frozenDatesSet.has(day.dateStr)) {
      day.isFrozen = true
    }
  }

  const isYesterdayFrozen = frozenDatesSet.has(yesterdayStr) && currentStreak > 0

  // 3. Calculate longest streak historically (counting protected frozen days)
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
      } else {
        // Check if all missed days in between were protected by streak freezes
        let allFrozen = true
        const checkD = new Date(prevDate)
        checkD.setDate(checkD.getDate() + 1)
        while (checkD < curr) {
          const cds = formatDateYMD(checkD)
          if (!frozenDatesSet.has(cds)) {
            allFrozen = false
            break
          }
          checkD.setDate(checkD.getDate() + 1)
        }

        if (allFrozen && diffDays > 1) {
          tempStreak++
        } else {
          tempStreak = 1
        }
      }
    }
    prevDate = curr
    if (tempStreak > longestStreak) longestStreak = tempStreak
  }
  if (currentStreak > longestStreak) longestStreak = currentStreak

  // Compute 15 Milestone Badges
  const computedXp = Math.max(xpTotal, validLogs.reduce((acc, cur) => acc + (cur.xp_earned || 20), 0))
  const badgeStatuses = [
    {
      id: 'first_step',
      titleKey: 'First Check-in',
      descKey: 'Log your very first workout in Axon',
      icon: '🌟',
      bonusXP: 25,
      unlocked: validLogs.length >= 1
    },
    {
      id: '3_day',
      titleKey: '3-Day Starter',
      descKey: 'Reach a 3-day workout streak',
      icon: '⚡',
      bonusXP: 50,
      unlocked: longestStreak >= 3 || currentStreak >= 3
    },
    {
      id: '7_day',
      titleKey: '7-Day Streak',
      descKey: 'Reach a 7-day workout streak',
      icon: '🔥',
      bonusXP: 100,
      unlocked: longestStreak >= 7 || currentStreak >= 7
    },
    {
      id: '14_day',
      titleKey: '14-Day Warrior',
      descKey: 'Reach a 14-day workout streak',
      icon: '💪',
      bonusXP: 150,
      unlocked: longestStreak >= 14 || currentStreak >= 14
    },
    {
      id: '30_day',
      titleKey: '30-Day Streak',
      descKey: 'Reach a 30-day workout streak',
      icon: '🚀',
      bonusXP: 300,
      unlocked: longestStreak >= 30 || currentStreak >= 30
    },
    {
      id: '100_day',
      titleKey: '100-Day Legend',
      descKey: 'Reach a 100-day workout streak',
      icon: '👑',
      bonusXP: 1000,
      unlocked: longestStreak >= 100 || currentStreak >= 100
    },
    {
      id: 'weekly_goal',
      titleKey: 'Weekly Champion',
      descKey: 'Meet your weekly exercise target',
      icon: '🏆',
      bonusXP: 50,
      unlocked: maxWeeklyCountEver >= weeklyGoal
    },
    {
      id: 'xp_500',
      titleKey: 'XP Master (500+ XP)',
      descKey: 'Earn 500 total XP from workouts & habits',
      icon: '💎',
      bonusXP: 100,
      unlocked: computedXp >= 500
    },
    {
      id: '5_workouts',
      titleKey: '5 Workouts Done',
      descKey: 'Complete 5 total workouts',
      icon: '🎯',
      bonusXP: 30,
      unlocked: validLogs.length >= 5
    },
    {
      id: '10_workouts',
      titleKey: '10 Workouts Club',
      descKey: 'Complete 10 total workouts',
      icon: '🔟',
      bonusXP: 50,
      unlocked: validLogs.length >= 10
    },
    {
      id: '25_workouts',
      titleKey: '25 Workouts Veteran',
      descKey: 'Complete 25 total workouts',
      icon: '🎖️',
      bonusXP: 100,
      unlocked: validLogs.length >= 25
    },
    {
      id: '50_workouts',
      titleKey: '50 Workouts Legend',
      descKey: 'Complete 50 total workouts',
      icon: '🏅',
      bonusXP: 250,
      unlocked: validLogs.length >= 50
    },
    {
      id: 'xp_1000',
      titleKey: 'XP Titan (1000+ XP)',
      descKey: 'Earn 1000 total XP from workouts & habits',
      icon: '🔮',
      bonusXP: 200,
      unlocked: computedXp >= 1000
    },
    {
      id: 'xp_2500',
      titleKey: 'XP Overlord (2500+ XP)',
      descKey: 'Earn 2500 total XP from workouts & habits',
      icon: '⚜️',
      bonusXP: 500,
      unlocked: computedXp >= 2500
    },
    {
      id: 'variety_3',
      titleKey: 'Activity Explorer',
      descKey: 'Try 3 different workout types',
      icon: '🌈',
      bonusXP: 50,
      unlocked: new Set(validLogs.map(l => l.activity_type).filter(Boolean)).size >= 3
    }
  ]

  return {
    currentStreak,
    longestStreak,
    weeklyCount,
    maxWeeklyCountEver,
    weeklyGoal,
    isCheckedInToday,
    isYesterdayFrozen,
    yesterdayStr,
    currentWeekDays,
    freezesAvailable: availableFreezes,
    maxFreezes: MAX_FREEZES,
    frozenDates: Array.from(frozenDatesSet),
    newlyFrozenDates,
    freezeProgress,
    earnedMilestoneFreezeToday,
    earnedWeeklyGoalFreezeToday,
    freezeUsedThisStreak,
    badgeStatuses
  }
}

export async function fetchExerciseData(userId) {
  const cacheKey = userId ? `axon_exercise_data_${userId}` : 'axon_exercise_data_global'
  let logs = []
  let weeklyGoal = 4
  let xpTotal = 0
  let freezesAvailable = INITIAL_FREEZES
  let frozenDates = []

  let currentUser = null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
  } catch (e) {}

  const isSelf = Boolean(currentUser && (!userId || currentUser.id === userId))

  // 1. Read from local cache first (only fall back to global if self or no userId specified)
  try {
    const cachedUser = userId ? JSON.parse(localStorage.getItem(cacheKey) || 'null') : null
    const cachedGlobal = isSelf ? JSON.parse(localStorage.getItem('axon_exercise_data_global') || 'null') : null
    const cached = cachedUser || cachedGlobal
    if (cached) {
      if (Array.isArray(cached.logs)) logs = cached.logs.filter(l => l && l.activity_type !== 'Streak Freeze')
      if (typeof cached.weeklyGoal === 'number') weeklyGoal = cached.weeklyGoal
      if (typeof cached.xpTotal === 'number') xpTotal = cached.xpTotal
      if (typeof cached.freezesAvailable === 'number') freezesAvailable = cached.freezesAvailable
      if (Array.isArray(cached.frozenDates)) frozenDates = cached.frozenDates
    }
  } catch (e) {}

  if (!userId) {
    const calculatedStats = calculateStreakAndStats(logs, weeklyGoal, freezesAvailable, getTodayStr(), xpTotal, frozenDates)
    return {
      logs,
      weeklyGoal,
      xpTotal,
      freezesAvailable: calculatedStats.freezesAvailable,
      frozenDates: calculatedStats.frozenDates,
      freezeProgress: calculatedStats.freezeProgress
    }
  }

  // 2. Read from Supabase profile, auth user_metadata, exercise_logs, and activity_log
  try {
    const [profileRes, logsRes, activityRes] = await Promise.all([
      supabase.from('profiles').select('weekly_exercise_goal, xp_total, streak_freezes_available').eq('id', userId).single(),
      supabase.from('exercise_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false }),
      supabase.from('activity_log').select('*').eq('user_id', userId).eq('entity_type', 'exercise').order('created_at', { ascending: false })
    ])

    if (profileRes.data) {
      if (typeof profileRes.data.weekly_exercise_goal === 'number') weeklyGoal = profileRes.data.weekly_exercise_goal
      if (typeof profileRes.data.xp_total === 'number') xpTotal = Math.max(xpTotal, profileRes.data.xp_total)
      if (typeof profileRes.data.streak_freezes_available === 'number') freezesAvailable = profileRes.data.streak_freezes_available
    }

    const meta = isSelf ? (currentUser?.user_metadata || {}) : {}
    const metaLogs = Array.isArray(meta.axon_exercise_logs)
      ? meta.axon_exercise_logs.filter(l => l && l.activity_type !== 'Streak Freeze')
      : []
    const rawTableLogs = (logsRes.data && Array.isArray(logsRes.data)) ? logsRes.data : []
    const tableLogs = rawTableLogs.filter(l => l && l.activity_type !== 'Streak Freeze')

    // Clean up any accidental 'Streak Freeze' rows in exercise_logs table
    const invalidTableLogs = rawTableLogs.filter(l => l && l.activity_type === 'Streak Freeze')
    if (invalidTableLogs.length > 0 && isSelf) {
      for (const badRow of invalidTableLogs) {
        if (badRow.id) {
          supabase.from('exercise_logs').delete().eq('id', badRow.id).then(() => {}).catch(() => {})
        }
      }
    }

    if (Array.isArray(meta.axon_frozen_dates)) {
      frozenDates = Array.from(new Set([...frozenDates, ...meta.axon_frozen_dates]))
    }

    // Recover frozenDates from activity_log and filter out Streak Freeze system events from workout logs
    const rawActivityRows = (activityRes.data && Array.isArray(activityRes.data)) ? activityRes.data : []
    const recoveredFrozenDates = []
    const workoutActivityRows = []

    for (const a of rawActivityRows) {
      const actionStr = String(a.action || '')
      const entityName = String(a.entity_name || '')
      const freezeMatch = actionStr.match(/Streak freeze used for missed day (\d{4}-\d{2}-\d{2})/i)
      if (freezeMatch && freezeMatch[1]) {
        recoveredFrozenDates.push(freezeMatch[1])
        continue
      }
      if (entityName === 'Streak Freeze' || /streak freeze/i.test(actionStr)) {
        continue
      }
      workoutActivityRows.push(a)
    }

    if (recoveredFrozenDates.length > 0) {
      frozenDates = Array.from(new Set([...frozenDates, ...recoveredFrozenDates]))
    }

    const activityLogs = workoutActivityRows.map(a => {
      const d = new Date(a.created_at)
      const ds = formatDateYMD(d)
      let actType = a.entity_name || 'Gym'
      if (a.action && a.action.includes('(') && a.action.includes(')')) {
        const match = a.action.match(/\((.*?)\)/)
        if (match && match[1]) actType = match[1]
      }
      return {
        id: a.id || `act-${ds}`,
        user_id: userId,
        log_date: ds,
        activity_type: actType,
        xp_earned: 20
      }
    })

    // Merge and deduplicate logs by log_date across table + metadata + local cache + activity_log
    const mergedMap = new Map()
    for (const l of [...tableLogs, ...metaLogs, ...logs, ...activityLogs]) {
      if (l && l.log_date && l.activity_type !== 'Streak Freeze') {
        if (!mergedMap.has(l.log_date)) {
          mergedMap.set(l.log_date, l)
        }
      }
    }
    const mergedLogs = Array.from(mergedMap.values()).sort((a, b) => (a.log_date < b.log_date ? 1 : -1))

    if (mergedLogs.length > 0) {
      logs = mergedLogs
    }
    if (isSelf && typeof meta.axon_xp_total === 'number') {
      xpTotal = Math.max(xpTotal, meta.axon_xp_total)
    }
    if (isSelf && typeof meta.axon_weekly_goal === 'number') {
      weeklyGoal = meta.axon_weekly_goal
    }

    const calculatedMinXp = mergedLogs.reduce((acc, cur) => acc + (cur.xp_earned || 20), 0)
    if (calculatedMinXp > xpTotal) {
      xpTotal = calculatedMinXp
    }

    // Auto-sync missing check-ins up to SQL exercise_logs
    if (mergedLogs.length > 0) {
      const tableDates = new Set(tableLogs.map(t => t.log_date))
      const missingLogs = mergedLogs.filter(l => l && l.log_date && !tableDates.has(l.log_date))
      if (missingLogs.length > 0) {
        Promise.all(missingLogs.map(async (missing) => {
          try {
            await supabase.from('exercise_logs').upsert({
              user_id: userId,
              log_date: missing.log_date,
              activity_type: missing.activity_type || 'Gym',
              xp_earned: missing.xp_earned || 20
            }, { onConflict: 'user_id,log_date' })
          } catch {}
        })).catch(() => {})
      }
    }
  } catch (e) {}

  // 3. Evaluate streak and automatic streak freeze protection on missed days
  const currentStats = calculateStreakAndStats(logs, weeklyGoal, freezesAvailable, getTodayStr(), xpTotal, frozenDates)
  freezesAvailable = currentStats.freezesAvailable
  frozenDates = currentStats.frozenDates

  const result = {
    logs,
    weeklyGoal,
    xpTotal,
    freezesAvailable,
    frozenDates,
    freezeProgress: currentStats.freezeProgress
  }

  // Save to localStorage BEFORE async Supabase calls to avoid race conditions
  try {
    if (userId) localStorage.setItem(cacheKey, JSON.stringify(result))
    if (isSelf) localStorage.setItem('axon_exercise_data_global', JSON.stringify(result))
  } catch {}

  // If new missed days were frozen during calculation, persist the consumed freeze in background
  if (currentStats.newlyFrozenDates && currentStats.newlyFrozenDates.length > 0 && isSelf) {
    ;(async () => {
      try {
        await supabase.auth.updateUser({
          data: {
            axon_freezes: freezesAvailable,
            axon_frozen_dates: frozenDates
          }
        })
      } catch {}
      try {
        await supabase.from('profiles').update({
          streak_freezes_available: freezesAvailable
        }).eq('id', userId)
      } catch {}
      for (const fDate of currentStats.newlyFrozenDates) {
        try {
          await logActivity(`Streak freeze used for missed day ${fDate}`, 'exercise', 'Streak Freeze', userId)
        } catch {}
      }
    })()
  }

  return result
}

export async function logExerciseCheckIn({
  userId,
  logDate = getTodayStr(),
  activityType = 'Gym',
  currentWeeklyGoal = 4,
  currentXpTotal = 0,
  currentFreezes = INITIAL_FREEZES,
  currentFrozenDates = [],
  logs = []
}) {
  if (!userId) return { error: 'No user' }

  const cleanLogs = logs.filter(l => l && l.log_date && l.activity_type !== 'Streak Freeze')

  // Check if already checked in today
  if (cleanLogs.some(l => l.log_date === logDate)) {
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

  const updatedLogs = [newLog, ...cleanLogs]

  // Calculate stats before and after to see badges unlocked, weekly chest, and new freezes
  const beforeStats = calculateStreakAndStats(cleanLogs, currentWeeklyGoal, currentFreezes, logDate, currentXpTotal, currentFrozenDates)
  const initialAfterStats = calculateStreakAndStats(updatedLogs, currentWeeklyGoal, beforeStats.freezesAvailable, logDate, currentXpTotal + 20, beforeStats.frozenDates)

  // Check if Weekly Target Chest was achieved on this check-in
  const weeklyChestUnlocked = beforeStats.weeklyCount < currentWeeklyGoal && initialAfterStats.weeklyCount === currentWeeklyGoal

  let bonusXP = 0
  const unlockedBadgesMap = new Map()

  // 1. Check non-XP badges first
  for (const afterBadge of initialAfterStats.badgeStatuses) {
    const beforeBadge = beforeStats.badgeStatuses.find(b => b.id === afterBadge.id)
    if (!beforeBadge?.unlocked && afterBadge.unlocked) {
      unlockedBadgesMap.set(afterBadge.id, {
        id: afterBadge.id,
        titleKey: afterBadge.titleKey,
        descKey: afterBadge.descKey,
        icon: afterBadge.icon,
        bonusXP: afterBadge.bonusXP || 50
      })
      if (afterBadge.id !== 'weekly_goal') {
        bonusXP += (afterBadge.bonusXP || 50)
      }
    }
  }

  // Weekly Goal Chest awards +50 XP every week the target is met (including the first time Weekly Champion unlocks)
  if (weeklyChestUnlocked) {
    bonusXP += 50
  }

  // 2. Re-evaluate with updated XP total in case bonusXP pushed user over 500 / 1000 / 2500 XP threshold
  const tentativeXpTotal = currentXpTotal + 20 + bonusXP
  const finalAfterStats = calculateStreakAndStats(updatedLogs, currentWeeklyGoal, beforeStats.freezesAvailable, logDate, tentativeXpTotal, beforeStats.frozenDates)

  for (const afterBadge of finalAfterStats.badgeStatuses) {
    const beforeBadge = beforeStats.badgeStatuses.find(b => b.id === afterBadge.id)
    if (!beforeBadge?.unlocked && afterBadge.unlocked && !unlockedBadgesMap.has(afterBadge.id)) {
      const extraBonus = afterBadge.bonusXP || 100
      unlockedBadgesMap.set(afterBadge.id, {
        id: afterBadge.id,
        titleKey: afterBadge.titleKey,
        descKey: afterBadge.descKey,
        icon: afterBadge.icon,
        bonusXP: extraBonus
      })
      bonusXP += extraBonus
    }
  }

  const unlockedNow = Array.from(unlockedBadgesMap.values())
  const xpEarned = 20 + bonusXP
  newLog.xp_earned = xpEarned
  const newXpTotal = currentXpTotal + xpEarned
  const newFreezes = finalAfterStats.freezesAvailable
  const newFrozenDates = finalAfterStats.frozenDates
  const earnedFreeze = finalAfterStats.earnedMilestoneFreezeToday || finalAfterStats.earnedWeeklyGoalFreezeToday

  // 1. Update local cache immediately
  const resultData = {
    logs: updatedLogs,
    weeklyGoal: currentWeeklyGoal,
    xpTotal: newXpTotal,
    freezesAvailable: newFreezes,
    frozenDates: newFrozenDates,
    freezeProgress: finalAfterStats.freezeProgress
  }
  try {
    localStorage.setItem(`axon_exercise_data_${userId}`, JSON.stringify(resultData))
    localStorage.setItem('axon_exercise_data_global', JSON.stringify(resultData))
  } catch {}

  // 2. Persist to Supabase user_metadata + SQL tables
  try {
    await supabase.auth.updateUser({
      data: {
        axon_exercise_logs: updatedLogs.map(l => ({
          log_date: l.log_date,
          activity_type: l.activity_type || 'Gym',
          xp_earned: l.xp_earned || 20
        })),
        axon_xp_total: newXpTotal,
        axon_freezes: newFreezes,
        axon_frozen_dates: newFrozenDates
      }
    })
  } catch {}

  try {
    await supabase.from('exercise_logs').upsert({
      user_id: userId,
      log_date: logDate,
      activity_type: activityType,
      xp_earned: xpEarned
    }, { onConflict: 'user_id,log_date' })
    await supabase.from('profiles').update({
      xp_total: newXpTotal,
      streak_freezes_available: newFreezes
    }).eq('id', userId)
  } catch {}

  try {
    await logActivity(`Exercise check-in (${activityType})`, 'exercise', activityType, userId)
    if (finalAfterStats.earnedMilestoneFreezeToday) {
      await logActivity('Earned +1 Streak Freeze (5 workouts milestone)', 'exercise', 'Streak Freeze', userId)
    }
    if (finalAfterStats.earnedWeeklyGoalFreezeToday) {
      await logActivity('Earned +1 Streak Freeze (Weekly Goal Chest)', 'exercise', 'Streak Freeze', userId)
    }
  } catch {}

  return {
    success: true,
    newLog,
    xpEarned,
    newXpTotal,
    newFreezes,
    newFrozenDates,
    earnedFreeze,
    earnedMilestoneFreeze: finalAfterStats.earnedMilestoneFreezeToday,
    earnedWeeklyGoalFreeze: finalAfterStats.earnedWeeklyGoalFreezeToday,
    weeklyChestUnlocked,
    unlockedBadges: unlockedNow,
    updatedLogs
  }
}
