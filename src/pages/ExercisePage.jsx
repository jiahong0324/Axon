import { Award, Bot, Calendar, Check, Dumbbell, Flame, Info, Pencil, RefreshCw, Shield, Trash2, Trophy, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useConfirmDialog } from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import { useLanguage } from '../components/LanguageProvider'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { buildUserContext } from '../lib/buildUserContext'
import {
  ACTIVITY_ICONS,
  ACTIVITY_TYPES,
  calculateStreakAndStats,
  fetchExerciseData,
  getDailyMessage,
  getLevelInfo,
  getTodayStr,
  logExerciseCheckIn
} from '../lib/exerciseUtils'
import { askGroq } from '../lib/groq'
import { supabase } from '../lib/supabase'
import { markdownToHtml } from '../lib/utils'

export default function ExercisePage() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [weeklyGoal, setWeeklyGoal] = useState(4)
  const [xpTotal, setXpTotal] = useState(0)
  const [freezesAvailable, setFreezesAvailable] = useState(1)

  // Check-in state
  const [selectedTag, setSelectedTag] = useState('Gym')
  const [checkingIn, setCheckingIn] = useState(false)

  // Celebration modal state
  const [celebrationModal, setCelebrationModal] = useState(null)

  // Goal edit bottom sheet state
  const [showGoalSheet, setShowGoalSheet] = useState(false)
  const [tempGoal, setTempGoal] = useState(4)

  // Badge detail bottom sheet state
  const [selectedBadge, setSelectedBadge] = useState(null)

  // AI workout suggestion card state
  const [aiPlan, setAiPlan] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const todayStr = getTodayStr()

  useEffect(() => {
    loadInitialData(true)
    const savedPlan = localStorage.getItem('axon_exercise_ai_plan_content')
    const savedDate = localStorage.getItem('axon_exercise_ai_plan_date')
    if (savedPlan && savedDate === todayStr) {
      setAiPlan(savedPlan)
    }

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      loadInitialData(false)
    })

    function handleAutoRefresh() {
      if (document.visibilityState === 'visible') {
        loadInitialData(false)
      }
    }

    window.addEventListener('visibilitychange', handleAutoRefresh)
    window.addEventListener('focus', handleAutoRefresh)

    return () => {
      authSub?.subscription?.unsubscribe()
      window.removeEventListener('visibilitychange', handleAutoRefresh)
      window.removeEventListener('focus', handleAutoRefresh)
    }
  }, [todayStr])

  async function loadInitialData(showLoading = true) {
    if (showLoading) setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id || null
    setUserId(currentUserId)

    const data = await fetchExerciseData(currentUserId)
    setLogs(data.logs || [])
    setWeeklyGoal(data.weeklyGoal || 4)
    setXpTotal(data.xpTotal || 0)
    setFreezesAvailable(data.freezesAvailable || 1)
    if (showLoading) setLoading(false)
  }

  const stats = useMemo(
    () => calculateStreakAndStats(logs, weeklyGoal, freezesAvailable, todayStr),
    [logs, weeklyGoal, freezesAvailable, todayStr]
  )

  const levelInfo = useMemo(
    () => getLevelInfo(xpTotal, t),
    [xpTotal, t]
  )

  const messagesPool = t('exercise.dailyMessages')
  const dailyMsg = useMemo(() => getDailyMessage(messagesPool, todayStr), [messagesPool, todayStr])

  async function handleCheckIn() {
    if (stats.isCheckedInToday || checkingIn) return
    setCheckingIn(true)
    try {
      const result = await logExerciseCheckIn({
        userId,
        logDate: todayStr,
        activityType: selectedTag,
        currentWeeklyGoal: weeklyGoal,
        currentXpTotal: xpTotal,
        currentFreezes: freezesAvailable,
        logs
      })

      if (result.error) {
        showToast(result.error, 'error')
        return
      }

      setLogs(result.updatedLogs)
      setXpTotal(result.newXpTotal)
      setFreezesAvailable(result.newFreezes)

      showToast(t('exercise.checkedInToday'), 'success')

      setCelebrationModal({
        xpEarned: result.xpEarned,
        message: dailyMsg,
        unlockedBadges: result.unlockedBadges || []
      })
    } catch {
      showToast('Could not record check-in.', 'error')
    } finally {
      setCheckingIn(false)
    }
  }

  async function saveWeeklyGoal(e) {
    e.preventDefault()
    setWeeklyGoal(tempGoal)
    setShowGoalSheet(false)

    // Save immediately to localStorage so modification never disappears on refresh
    const cacheKey = userId ? `axon_exercise_data_${userId}` : 'axon_exercise_data_global'
    const updatedData = {
      logs,
      weeklyGoal: tempGoal,
      xpTotal,
      freezesAvailable
    }
    try {
      localStorage.setItem(cacheKey, JSON.stringify(updatedData))
      localStorage.setItem('axon_exercise_data_global', JSON.stringify(updatedData))
    } catch {}

    showToast(t('exercise.saveGoal'), 'success')

    try {
      await supabase.auth.updateUser({
        data: { axon_weekly_goal: tempGoal }
      })
    } catch {}

    if (userId) {
      try {
        await supabase.from('profiles').update({ weekly_exercise_goal: tempGoal }).eq('id', userId)
      } catch {
        // ignore offline
      }
    }
  }

  async function generateAiSuggestion() {
    setAiLoading(true)
    try {
      const context = await buildUserContext()
      const prompt = `You are a motivating fitness coach. Based on this student's schedule, current workout streak of ${stats.currentStreak} days, and weekly goal of ${weeklyGoal} days/week, generate a concise, practical 3-part workout suggestion for today that fits a student routine. Format in clear Markdown with bullet points.`
      const plan = await askGroq(prompt, context)
      setAiPlan(plan)
      localStorage.setItem('axon_exercise_ai_plan_content', plan)
      localStorage.setItem('axon_exercise_ai_plan_date', todayStr)
    } catch {
      setAiPlan('### Quick Campus Workout\n- **Warmup**: 5 mins dynamic stretches\n- **Cardio/Strength**: 20 mins brisk walk or bodyweight circuits (push-ups, squats, planks)\n- **Cooldown**: 5 mins deep breathing and hamstring stretches')
    } finally {
      setAiLoading(false)
    }
  }

  function deleteAiSuggestion() {
    setAiPlan('')
    localStorage.removeItem('axon_exercise_ai_plan_content')
    localStorage.removeItem('axon_exercise_ai_plan_date')
  }

  const heatmapDays = useMemo(() => {
    const daysArr = []
    const loggedSet = new Set(logs.map(l => l.log_date))
    const now = new Date()
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const ds = `${y}-${m}-${day}`
      const log = logs.find(l => l.log_date === ds)
      daysArr.push({
        dateStr: ds,
        label: `${m}/${day}`,
        logged: loggedSet.has(ds),
        activity: log?.activity_type || null
      })
    }
    return daysArr
  }, [logs])

  if (loading) {
    return (
      <main className="main-content">
        <header className="mb-6">
          <h1 className="page-title mb-1">{t('exercise.title')}</h1>
        </header>
        <div className="skeleton h-48 rounded-2xl mb-6" />
        <div className="skeleton h-36 rounded-2xl" />
      </main>
    )
  }

  return (
    <main className="main-content pb-36">
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title mb-1 flex items-center gap-2.5">
            <Dumbbell className="h-6 w-6 text-blue-400 stroke-[1.5]" />
            {t('exercise.title')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('exercise.subtitle')}
          </p>
        </div>
      </div>

      {/* TOP 2 HERO CARDS (Previous Layout + Result Page Design + Left Colored Accent Bars) */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* HERO CARD 1: Habit Tracker & Streak (LEFT ACCENT: ORANGE) */}
        <section className="rounded-2xl bg-[#131b2e] p-6 sm:p-8 shadow-xl border border-white/5 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                {t('exercise.currentStreak')}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tight">
                  {stats.currentStreak}
                </span>
                <span className="text-sm font-bold text-orange-400">
                  {t('common.days')} 🔥
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 mb-1">Weekly Target</p>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3.5 py-1 text-xs font-bold text-blue-400">
                <span>{stats.weeklyCount} / {weeklyGoal} Days</span>
                <button
                  onClick={() => { setTempGoal(weeklyGoal); setShowGoalSheet(true) }}
                  className="hover:text-white transition-colors"
                  title={t('exercise.editGoal')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#0e1626] p-4 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-300">Streak Protection</span>
            </div>
            <span className="text-xs font-bold text-cyan-400">
              {stats.freezesAvailable} Freezes Available
            </span>
          </div>
        </section>

        {/* HERO CARD 2: Novice Mover Level / XP (LEFT ACCENT: PURPLE) */}
        <section className="rounded-2xl bg-[#131b2e] p-6 sm:p-8 shadow-xl border border-white/5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Level & Rank Status
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tight">
                  {levelInfo.title}
                </span>
              </div>
              <p className="text-xs font-bold text-purple-400 mt-0.5">
                {t('exercise.level', { level: levelInfo.level })}
              </p>
            </div>

            <div className="text-right">
              <span className="text-3xl font-black text-white">{xpTotal}</span>
              <p className="text-xs font-bold text-slate-400">Total XP</p>
            </div>
          </div>

          <div className="rounded-xl bg-[#0e1626] p-4 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Level Progress</span>
              <span className="text-purple-300">{levelInfo.xpNeeded} XP to next rank</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>
        </section>
      </div>

      {/* STACKED SECTIONS BELOW HERO CARDS (Previous Layout + Result Page Design System) */}
      <div className="space-y-7">
        {/* 1. THIS WEEK DAY SELECTOR STRIP CARD */}
        <section className="rounded-2xl bg-[#131b2e] p-6 sm:p-8 shadow-xl border border-white/5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                {t('exercise.thisWeekStrip')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Track your consistency across current week
              </p>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex items-center justify-between gap-3 min-w-[340px]">
              {stats.currentWeekDays.map(day => {
                const isToday = day.dateStr === todayStr
                return (
                  <div
                    key={day.dateStr}
                    className={`flex-1 flex flex-col items-center justify-center rounded-xl p-3.5 transition-all min-h-[72px] border ${
                      day.logged
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold'
                        : isToday
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 font-bold'
                        : 'bg-[#0e1626] border-white/5 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider">{day.dayName}</span>
                    {day.logged ? (
                      <span className="mt-1.5 text-lg">{ACTIVITY_ICONS[day.activityType] || '✅'}</span>
                    ) : (
                      <span className="mt-2.5 h-3 w-3 rounded-full border border-current opacity-30" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* 2. MONTHLY CHECK-IN HEATMAP CARD */}
        <section className="rounded-2xl bg-[#131b2e] p-6 sm:p-8 shadow-xl border border-white/5">
          <div className="mb-5">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              {t('exercise.monthlyHeatmap')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Your 30-day activity matrix
            </p>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <div className="grid grid-cols-7 gap-2 min-w-[340px]">
              {heatmapDays.map(day => (
                <div
                  key={day.dateStr}
                  title={`${day.dateStr} (${day.activity || 'No workout'})`}
                  className={`flex flex-col items-center justify-center rounded-xl p-2 min-h-[48px] border transition-colors ${
                    day.logged
                      ? 'bg-emerald-500/20 border-emerald-500/35 text-emerald-400 font-bold'
                      : 'bg-[#0e1626] border-white/5 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-mono">{day.label}</span>
                  {day.logged && <span className="text-xs mt-0.5">{ACTIVITY_ICONS[day.activity] || '⚡'}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-400">
            <span>{t('exercise.less')}</span>
            <span className="h-3 w-3 rounded bg-[#0e1626] border border-white/10" />
            <span className="h-3 w-3 rounded bg-emerald-500/30" />
            <span className="h-3 w-3 rounded bg-emerald-500" />
            <span>{t('exercise.more')}</span>
          </div>
        </section>

        {/* 3. MILESTONE BADGES CARD */}
        <section className="rounded-2xl bg-[#131b2e] p-6 sm:p-8 shadow-xl border border-white/5">
          <div className="mb-5">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              {t('exercise.badgesTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Earn badges by building streaks & XP
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {stats.badgeStatuses.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBadge(b)}
                className="w-full flex items-center justify-between rounded-xl bg-[#0e1626] px-4 py-3 text-left transition-all hover:bg-white/[0.04] border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/15 text-lg">
                    {b.icon}
                  </span>
                  <div>
                    <p className="font-bold text-sm text-slate-200">{t(b.titleKey)}</p>
                    <p className={`text-[11px] ${b.unlocked ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                      {b.unlocked ? t('exercise.badgeUnlocked') : t('exercise.badgeLocked')}
                    </p>
                  </div>
                </div>
                <Info className="h-4 w-4 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* 4. AI WORKOUT SUGGESTION CARD */}
        <section className="rounded-2xl bg-[#131b2e] p-6 sm:p-8 shadow-xl border border-white/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-400" />
                {t('exercise.aiTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Personalized AI workout routines tailored for students
              </p>
            </div>
            {!aiPlan && !aiLoading && (
              <button
                className="rounded-xl bg-blue-500 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-blue-600 transition-colors shadow-md"
                onClick={generateAiSuggestion}
              >
                {t('exercise.generatePlan')}
              </button>
            )}
          </div>

          {aiLoading ? (
            <div className="skeleton h-32 rounded-xl" />
          ) : aiPlan ? (
            <div className="rounded-xl bg-[#0e1626] p-5 border border-white/5">
              <div
                className="text-xs sm:text-sm leading-relaxed text-slate-300"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(aiPlan) }}
              />
              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-white/5">
                <button
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  onClick={deleteAiSuggestion}
                  title={t('exercise.deletePlan')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg bg-blue-500/15 px-3.5 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/25 transition-colors"
                  onClick={generateAiSuggestion}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{t('exercise.regeneratePlan')}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-400">{t('exercise.aiDesc')}</p>
          )}
        </section>

        {/* 5. RECENT ACTIVITY / HISTORY CARD */}
        <section className="rounded-2xl bg-[#131b2e] p-6 sm:p-8 shadow-xl border border-white/5 mb-12">
          <div className="mb-5">
            <h3 className="text-xl font-extrabold text-white">
              {t('exercise.history')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Recent workouts and activity logs
            </p>
          </div>

          {logs.length === 0 ? (
            <EmptyState emoji="🏃" message={t('exercise.noHistory')} />
          ) : (
            <div className="divide-y divide-white/[0.06] rounded-xl bg-[#0e1626] overflow-hidden border border-white/5">
              {logs.slice(0, 10).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-xl">
                      {ACTIVITY_ICONS[item.activity_type] || '⚡'}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-white">{item.activity_type || 'Workout'}</p>
                      <p className="text-xs text-slate-400">{item.log_date}</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-blue-500/15 px-3 py-1 font-mono text-xs font-bold text-blue-400">
                    +{item.xp_earned || 20} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* STICKY BOTTOM CHECK-IN BAR */}
      <div className="fixed inset-x-0 bottom-16 md:bottom-6 z-30 px-4 pointer-events-none flex justify-center">
        <div className="w-full max-w-2xl pointer-events-auto rounded-[20px] border border-white/[0.08] bg-[#131826]/95 p-4 shadow-2xl backdrop-blur-xl">
          {/* Activity Tag Selector */}
          <div className="mb-3 flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide pb-1">
            <span className="text-xs font-medium text-[#8E9BAE] shrink-0">{t('exercise.activityTag')}:</span>
            <div className="flex items-center gap-1.5">
              {ACTIVITY_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedTag(type)}
                  disabled={stats.isCheckedInToday}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all shrink-0 ${
                    selectedTag === type
                      ? 'bg-[#3B82F6]/20 text-[#38BDF8] border border-[#3B82F6]/40'
                      : 'bg-[#192032] text-[#8E9BAE] border border-white/[0.04] hover:text-white'
                  }`}
                >
                  <span>{ACTIVITY_ICONS[type]}</span>
                  <span>{t(`exercise.activity.${type}`) || type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mark Today Done button */}
          <button
            onClick={handleCheckIn}
            disabled={stats.isCheckedInToday || checkingIn}
            className={`w-full min-h-[48px] rounded-full font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 ${
              stats.isCheckedInToday
                ? 'bg-[#10B981] text-white cursor-default'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg shadow-blue-600/20'
            }`}
          >
            {stats.isCheckedInToday ? (
              <>
                <Check className="h-5 w-5 stroke-[1.5]" />
                {t('exercise.checkedInToday')}
              </>
            ) : (
              <>
                <Flame className="h-5 w-5 stroke-[1.5]" />
                {t('exercise.markTodayDone')} (+20 XP)
              </>
            )}
          </button>
        </div>
      </div>

      {/* CELEBRATION MODAL */}
      <Modal isOpen={Boolean(celebrationModal)} onClose={() => setCelebrationModal(null)} title="Check-in Complete!">
        {celebrationModal && (
          <div className="text-center py-4 space-y-4">
            <div className="relative inline-block">
              <span className="text-6xl inline-block">🎉</span>
            </div>
            <h3 className="text-xl font-bold">{t('exercise.congratsTitle')}</h3>
            <div className="rounded-[16px] bg-purple-500/10 border border-purple-500/20 p-4 text-left">
              <p className="text-sm leading-relaxed text-purple-200 font-medium">
                "{celebrationModal.message}"
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-400">
              <Zap className="h-5 w-5 stroke-[1.5]" />
              <span>+{celebrationModal.xpEarned} XP earned today!</span>
            </div>
            {celebrationModal.unlockedBadges.length > 0 && (
              <div className="rounded-[16px] bg-amber-500/10 border border-amber-500/25 p-3 text-center">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Milestone Unlocked!</p>
                <p className="text-sm font-medium mt-1">
                  You unlocked a new badge! Check your Milestone Badges section.
                </p>
              </div>
            )}
            <button
              className="w-full mt-4 min-h-[48px] rounded-full bg-blue-600 hover:bg-blue-700 font-semibold text-white transition-colors"
              onClick={() => setCelebrationModal(null)}
            >
              Continue
            </button>
          </div>
        )}
      </Modal>

      {/* EDIT WEEKLY GOAL MODAL */}
      <Modal isOpen={showGoalSheet} onClose={() => setShowGoalSheet(false)} title={t('exercise.editGoal')}>
        <form onSubmit={saveWeeklyGoal} className="space-y-5 py-2">
          <label className="block">
            <span className="text-xs font-medium muted block mb-2">{t('exercise.weeklyGoalLabel')}</span>
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTempGoal(num)}
                  className={`h-11 rounded-full font-bold text-sm transition-all border ${
                    tempGoal === num
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-[#0e1626] text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </label>
          <button
            type="submit"
            className="w-full min-h-[48px] rounded-xl bg-blue-500 hover:bg-blue-600 font-bold text-white transition-colors shadow-md"
          >
            {t('exercise.saveGoal')}
          </button>
        </form>
      </Modal>

      {/* BADGE DETAIL MODAL */}
      <Modal isOpen={Boolean(selectedBadge)} onClose={() => setSelectedBadge(null)} title="Milestone Badge Details">
        {selectedBadge && (
          <div className="text-center py-4 space-y-4">
            <span className="text-6xl inline-block">{selectedBadge.icon}</span>
            <div>
              <h3 className="text-xl font-bold">{t(selectedBadge.titleKey)}</h3>
              <p className="text-sm text-slate-400 mt-1">{t(selectedBadge.descKey)}</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold border ${
              selectedBadge.unlocked
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-[#0e1626] text-slate-400 border-white/5'
            }`}>
              {selectedBadge.unlocked ? (
                <>
                  <Check className="h-4 w-4 stroke-[1.5]" />
                  <span>{t('exercise.badgeUnlocked')}</span>
                </>
              ) : (
                <span>{t('exercise.badgeLocked')}</span>
              )}
            </div>
            <button
              className="w-full mt-4 min-h-[48px] rounded-xl bg-[#0e1626] hover:bg-white/[0.08] font-bold text-slate-300 border border-white/5 transition-colors"
              onClick={() => setSelectedBadge(null)}
            >
              Close
            </button>
          </div>
        )}
      </Modal>
      {ConfirmDialog}
    </main>
  )
}
