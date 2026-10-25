import { supabase } from './supabase'

export const DEFAULT_NUTRITION_GOALS = {
  calories: 2000,
  protein: 120,
  carbs: 250,
  fats: 65
}

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

export const MEAL_TYPE_ICONS = {
  Breakfast: '🍳',
  Lunch: '🍱',
  Dinner: '🍲',
  Snack: '🍎'
}

export function getTodayDateStr() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatNutritionDate(dateStr) {
  if (!dateStr) return ''
  const today = getTodayDateStr()
  const d = new Date(dateStr + 'T00:00:00')

  const currentYear = new Date().getFullYear()
  const isDiffYear = d.getFullYear() !== currentYear

  const dayOfWeek = d.toLocaleDateString(undefined, { weekday: 'short' })
  const monthDay = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(isDiffYear ? { year: "numeric" } : {})
  })

  if (dateStr === today) return `Today, ${monthDay}`
  return `${dayOfWeek}, ${monthDay}`
}


export function getCurrentTimeStr() {
  const d = new Date()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function getMealTypeFromTime(timeStr = '') {
  let h
  if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
    h = parseInt(timeStr.split(':')[0], 10)
  } else {
    h = new Date().getHours()
  }
  // Breakfast: 05:00 - 10:59
  // Lunch: 11:00 - 15:59
  // Dinner: 16:00 - 21:59
  // Snack: 22:00 - 04:59
  if (h >= 5 && h < 11) return 'Breakfast'
  if (h >= 11 && h < 16) return 'Lunch'
  if (h >= 16 && h < 22) return 'Dinner'
  return 'Snack'
}

export function formatMealTime(timeStr, isoDate) {
  if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
    const [hStr, mStr] = timeStr.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    const isPM = h >= 12;
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return displayHour + ':' + String(m).padStart(2, '0') + ' ' + (isPM ? 'pm' : 'am');
  }
  if (isoDate) {
    try {
      const d = new Date(isoDate);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        const m = d.getMinutes();
        const isPM = h >= 12;
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        return displayHour + ':' + String(m).padStart(2, '0') + ' ' + (isPM ? 'pm' : 'am');
      }
    } catch (e) {}
  }
  return '';
}
export async function fetchNutritionData(userId) {
  const goalsKey = userId ? `axon_nutrition_goals_${userId}` : 'axon_nutrition_goals_global'
  const logsKey = userId ? `axon_nutrition_logs_${userId}` : 'axon_nutrition_logs_global'

  let goals = { ...DEFAULT_NUTRITION_GOALS }
  let logs = []
  let hasSetGoals = false

  // 1. Read from localStorage cache first (0ms latency)
  try {
    const cachedGoals = localStorage.getItem(goalsKey)
    if (cachedGoals) {
      const parsed = JSON.parse(cachedGoals)
      if (parsed && typeof parsed.calories === 'number') {
        goals = { ...goals, ...parsed }
        hasSetGoals = true
      }
    }
    const cachedLogs = localStorage.getItem(logsKey)
    if (cachedLogs) {
      const parsed = JSON.parse(cachedLogs)
      if (Array.isArray(parsed)) {
        logs = parsed
      }
    }
  } catch (e) {
    console.warn('Failed to parse local nutrition cache:', e)
  }

  if (!userId) {
    return { goals, logs, hasSetGoals }
  }

  // 2. Fetch from Supabase cloud (both table and auth user_metadata fallback)
  try {
    const authRes = await supabase.auth.getUser()
    const metadata = authRes?.data?.user?.user_metadata || {}

    // Check user_metadata first for offline-first sync
    if (metadata.axon_nutrition_goals && typeof metadata.axon_nutrition_goals.calories === 'number') {
      goals = { ...goals, ...metadata.axon_nutrition_goals }
      hasSetGoals = true
    }
    if (Array.isArray(metadata.axon_nutrition_logs) && metadata.axon_nutrition_logs.length > 0) {
      const localMap = new Map(logs.map(l => [l.id, l]))
      for (const item of metadata.axon_nutrition_logs) {
        if (item && item.id && !localMap.has(item.id)) {
          localMap.set(item.id, item)
        }
      }
      logs = Array.from(localMap.values())
    }

    // Try fetching from dedicated Supabase tables if they exist
    try {
      const [goalsRes, logsRes] = await Promise.all([
        supabase.from('nutrition_goals').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('nutrition_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ])

      if (goalsRes?.data && typeof goalsRes.data.calories === 'number') {
        goals = {
          calories: Number(goalsRes.data.calories) || DEFAULT_NUTRITION_GOALS.calories,
          protein: Number(goalsRes.data.protein) || DEFAULT_NUTRITION_GOALS.protein,
          carbs: Number(goalsRes.data.carbs) || DEFAULT_NUTRITION_GOALS.carbs,
          fats: Number(goalsRes.data.fats) || DEFAULT_NUTRITION_GOALS.fats
        }
        hasSetGoals = true
      }

      if (logsRes?.data && Array.isArray(logsRes.data)) {
        const tableLogs = logsRes.data.map(row => ({
          id: row.id,
          user_id: row.user_id,
          date: row.log_date,
          meal_type: row.meal_type || 'Lunch',
          meal_time: row.meal_time || '',
          name: row.name,
          calories: Number(row.calories) || 0,
          protein: Number(row.protein) || 0,
          carbs: Number(row.carbs) || 0,
          fats: Number(row.fats) || 0,
          notes: row.notes || '',
          image_url: row.image_url || '',
          created_at: row.created_at
        }))
        if (tableLogs.length > 0) {
          logs = tableLogs
        }
      }
    } catch (tblErr) {
      // Table doesn't exist yet, fallback already handled smoothly by user_metadata
      console.info('Supabase table nutrition query fallback to metadata:', tblErr.message)
    }

    // Update local cache with latest reconciled data
    try {
      localStorage.setItem(goalsKey, JSON.stringify(goals))
      localStorage.setItem(logsKey, JSON.stringify(logs))
    } catch (e) {}

  } catch (err) {
    console.warn('Error fetching cloud nutrition data:', err)
  }

  return { goals, logs, hasSetGoals }
}

export async function saveNutritionGoals(userId, newGoals) {
  const goalsKey = userId ? `axon_nutrition_goals_${userId}` : 'axon_nutrition_goals_global'
  const sanitizedGoals = {
    calories: Math.max(100, Math.round(Number(newGoals.calories) || DEFAULT_NUTRITION_GOALS.calories)),
    protein: Math.max(0, Math.round(Number(newGoals.protein) || DEFAULT_NUTRITION_GOALS.protein)),
    carbs: Math.max(0, Math.round(Number(newGoals.carbs) || DEFAULT_NUTRITION_GOALS.carbs)),
    fats: Math.max(0, Math.round(Number(newGoals.fats) || DEFAULT_NUTRITION_GOALS.fats))
  }

  // 1. Instant local persistence
  try {
    localStorage.setItem(goalsKey, JSON.stringify(sanitizedGoals))
  } catch (e) {}

  if (!userId) return sanitizedGoals

  // 2. Sync to Supabase auth user_metadata
  try {
    await supabase.auth.updateUser({
      data: { axon_nutrition_goals: sanitizedGoals }
    })
  } catch (err) {
    console.warn('Failed to sync nutrition goals to user_metadata:', err)
  }

  // 3. Sync to Supabase nutrition_goals table
  try {
    await supabase.from('nutrition_goals').upsert({
      user_id: userId,
      calories: sanitizedGoals.calories,
      protein: sanitizedGoals.protein,
      carbs: sanitizedGoals.carbs,
      fats: sanitizedGoals.fats,
      updated_at: new Date().toISOString()
    })
  } catch (tableErr) {
    // Graceful if table not created
  }

  return sanitizedGoals
}

export async function syncNutritionLogsToCloud(userId, logs) {
  const logsKey = userId ? `axon_nutrition_logs_${userId}` : 'axon_nutrition_logs_global'
  try {
    localStorage.setItem(logsKey, JSON.stringify(logs))
  } catch (e) {}

  if (!userId) return

  // Sync latest 100 items to auth user_metadata
  try {
    const compactLogs = logs.slice(0, 100).map(l => ({
      id: l.id,
      date: l.date,
      meal_type: l.meal_type,
      meal_time: l.meal_time || '',
      name: l.name,
      calories: l.calories,
      protein: l.protein,
      carbs: l.carbs,
      fats: l.fats,
      notes: l.notes || '',
      created_at: l.created_at
    }))
    await supabase.auth.updateUser({
      data: { axon_nutrition_logs: compactLogs }
    })
  } catch (err) {
    console.warn('Failed to sync logs to user_metadata:', err)
  }
}

export async function saveFoodLogItem(userId, foodItem, currentLogs) {
  const itemDate = foodItem.date || getTodayDateStr()
  const itemTime = foodItem.meal_time || ''
  let itemCreatedAt = foodItem.created_at
  if (!itemCreatedAt) {
    if (itemTime && itemDate) {
      try {
        itemCreatedAt = new Date(`${itemDate}T${itemTime}:00`).toISOString()
      } catch (e) {
        itemCreatedAt = new Date().toISOString()
      }
    } else {
      itemCreatedAt = new Date().toISOString()
    }
  }

  const itemToSave = {
    id: foodItem.id || `food-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId || null,
    date: itemDate,
    meal_type: foodItem.meal_type || 'Lunch',
    meal_time: itemTime,
    name: foodItem.name || 'Meal',
    calories: Math.max(0, Math.round(Number(foodItem.calories) || 0)),
    protein: Math.max(0, Math.round((Number(foodItem.protein) || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((Number(foodItem.carbs) || 0) * 10) / 10),
    fats: Math.max(0, Math.round((Number(foodItem.fats) || 0) * 10) / 10),
    notes: foodItem.notes || '',
    image_url: foodItem.image_url || '',
    created_at: itemCreatedAt
  }

  // Check if updating existing or inserting new
  const index = currentLogs.findIndex(l => l.id === itemToSave.id)
  let updatedLogs = []
  if (index >= 0) {
    updatedLogs = [...currentLogs]
    updatedLogs[index] = itemToSave
  } else {
    updatedLogs = [itemToSave, ...currentLogs]
  }

  // 1. Local & metadata sync
  syncNutritionLogsToCloud(userId, updatedLogs).catch(() => {})

  // 2. Direct table upsert
  if (userId) {
    try {
      await supabase.from('nutrition_logs').upsert({
        id: itemToSave.id.startsWith('food-') ? undefined : itemToSave.id,
        user_id: userId,
        log_date: itemToSave.date,
        meal_type: itemToSave.meal_type,
        name: itemToSave.name,
        calories: itemToSave.calories,
        protein: itemToSave.protein,
        carbs: itemToSave.carbs,
        fats: itemToSave.fats,
        notes: itemToSave.notes,
        created_at: itemToSave.created_at
      })
    } catch (e) {
      // Handled by user_metadata fallback
    }
  }

  return { item: itemToSave, logs: updatedLogs }
}

export async function deleteFoodLogItem(userId, itemId, currentLogs) {
  const updatedLogs = currentLogs.filter(l => l.id !== itemId)
  syncNutritionLogsToCloud(userId, updatedLogs).catch(() => {})

  if (userId && !itemId.startsWith('food-')) {
    try {
      await supabase.from('nutrition_logs').delete().eq('id', itemId).eq('user_id', userId)
    } catch (e) {}
  }

  return updatedLogs
}

export function calculateDayNutrition(logs, dateStr, goals = DEFAULT_NUTRITION_GOALS) {
  const dayLogs = (logs || []).filter(l => l && l.date === dateStr)

  let consumedCalories = 0
  let consumedProtein = 0
  let consumedCarbs = 0
  let consumedFats = 0

  for (const item of dayLogs) {
    consumedCalories += Number(item.calories) || 0
    consumedProtein += Number(item.protein) || 0
    consumedCarbs += Number(item.carbs) || 0
    consumedFats += Number(item.fats) || 0
  }

  consumedCalories = Math.round(consumedCalories)
  consumedProtein = Math.round(consumedProtein * 10) / 10
  consumedCarbs = Math.round(consumedCarbs * 10) / 10
  consumedFats = Math.round(consumedFats * 10) / 10

  const targetCalories = goals.calories || DEFAULT_NUTRITION_GOALS.calories
  const targetProtein = goals.protein || DEFAULT_NUTRITION_GOALS.protein
  const targetCarbs = goals.carbs || DEFAULT_NUTRITION_GOALS.carbs
  const targetFats = goals.fats || DEFAULT_NUTRITION_GOALS.fats

  // Remaining values (can be positive for remaining, or negative/zero if surpassed)
  const remainingCalories = targetCalories - consumedCalories
  const remainingProtein = Math.round((targetProtein - consumedProtein) * 10) / 10
  const remainingCarbs = Math.round((targetCarbs - consumedCarbs) * 10) / 10
  const remainingFats = Math.round((targetFats - consumedFats) * 10) / 10

  // Progress percentages (capped at 100 for clean bar representation or visual bar width)
  const calPercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100))
  const proteinPercent = Math.min(100, Math.round((consumedProtein / targetProtein) * 100))
  const carbsPercent = Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100))
  const fatsPercent = Math.min(100, Math.round((consumedFats / targetFats) * 100))

  // Group by meal types
  const groupedMeals = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snack: []
  }

  for (const item of dayLogs) {
    const mt = item.meal_type || 'Lunch'
    if (groupedMeals[mt]) {
      groupedMeals[mt].push(item)
    } else {
      groupedMeals.Lunch.push(item)
    }
  }

  // Sort items within each meal chronologically by time of day
  function getItemMinutes(item) {
    if (item.meal_time && /^\d{1,2}:\d{2}/.test(item.meal_time)) {
      const [h, m] = item.meal_time.split(':').map(Number)
      return h * 60 + m
    }
    if (item.created_at) {
      const d = new Date(item.created_at)
      if (!isNaN(d.getTime())) {
        return d.getHours() * 60 + d.getMinutes()
      }
    }
    return 0
  }

  for (const mt of Object.keys(groupedMeals)) {
    groupedMeals[mt].sort((a, b) => getItemMinutes(a) - getItemMinutes(b))
  }

  return {
    dayLogs,
    consumedCalories,
    consumedProtein,
    consumedCarbs,
    consumedFats,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFats,
    remainingCalories,
    remainingProtein,
    remainingCarbs,
    remainingFats,
    calPercent,
    proteinPercent,
    carbsPercent,
    fatsPercent,
    groupedMeals
  }
}
