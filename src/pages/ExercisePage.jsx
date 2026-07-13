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
    loadInitialData()
    // Load AI workout suggestion if cached for today
    const savedPlan = localStorage.getItem('axon_exercise_ai_plan_content')
    const savedDate = localStorage.getItem('axon_exercise_ai_plan_date')
    if (savedPlan && savedDate === todayStr) {
      setAiPlan(savedPlan)
    }
  }, [todayStr])

  async function loadInitialData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUserId(user.id)

    const data = await fetchExerciseData(user.id)
    setLogs(data.logs || [])
    setWeeklyGoal(data.weeklyGoal || 4)
    setXpTotal(data.xpTotal || 0)
    setFreezesAvailable(data.freezesAvailable || 1)
    setLoading(false)
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

      // Open celebration modal
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
    showToast(t('exercise.saveGoal'), 'success')
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

  // Build 30-day heatmap grid
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
          <h1 className="page-title flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-slate-400 stroke-[1.5]" />
            {t('exercise.title')}
          </h1>
        </header>
        <div className="skeleton h-48 rounded-2xl mb-6" />
        <div className="skeleton h-36 rounded-2xl" />
      </main>
    )
  }

  return (
    <main className="main-content pb-36">
      {/* Calm minimal page header matching other pages */}
      <header className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Dumbbell className="h-6 w-6 text-theme-500 stroke-[1.5]" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t('exercise.title')}
          </h1>
        </div>
        <p className="muted">{t('exercise.subtitle')}</p>
      </header>

      {/* Top Hero Cards: Habit Tracker / Streak + Level & XP */}
      <section className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Habit Tracker & Streak Card (MAINTAIN 4px left accent bar) */}
        <div className="card border-l-4 border-l-orange-500 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-orange-400 stroke-[1.5]" />
                <span className="text-xs uppercase tracking-wider font-semibold text-orange-400">
                  {t('exercise.currentStreak')}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl md:text-4xl font-bold tracking-tight">
                  {stats.currentStreak}
                </span>
                <span className="text-sm muted">{t('common.days')}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium muted mb-0.5">{t('exercise.longestStreak')}</p>
              <p className="text-lg font-semibold">
                {stats.longestStreak} <span className="text-xs font-normal muted">{t('common.days')}</span>
              </p>
            </div>
          </div>

          {/* Weekly Goal Progress Bar */}
          <div className="space-y-2 pt-4 border-t border-white/10 dark:border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium muted">{t('exercise.weeklyProgress')}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {stats.weeklyCount} / {weeklyGoal} {t('common.days')}
                </span>
                <button
                  onClick={() => { setTempGoal(weeklyGoal); setShowGoalSheet(true) }}
                  className="rounded-full p-1 muted hover:bg-white/5 hover:text-white transition-colors"
                  title={t('exercise.editGoal')}
                >
                  <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
                </button>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((stats.weeklyCount / weeklyGoal) * 100))}%` }}
              />
            </div>
          </div>

          {/* Streak Freezes indicator */}
          <div className="mt-4 flex items-center justify-between text-xs muted">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400 stroke-[1.5]" />
              <span>
                {t('exercise.streakFreezes')}: {stats.freezesAvailable}
              </span>
            </div>
            {stats.freezeUsedThisStreak && (
              <span className="text-amber-400 font-medium">
                {t('exercise.freezeUsedNotice', { count: stats.freezesAvailable })}
              </span>
            )}
          </div>
        </div>

        {/* Level / XP Card (MAINTAIN 4px left accent bar for Novice Mover) */}
        <div className="card border-l-4 border-l-purple-500 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-purple-400 stroke-[1.5]" />
                <span className="text-xs uppercase tracking-wider font-semibold text-purple-400">
                  {t('exercise.level', { level: levelInfo.level })}
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-bold tracking-tight">{levelInfo.title}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium muted mb-0.5">{t('exercise.xpTotal')}</p>
              <p className="text-xl font-bold">
                {xpTotal} <span className="text-xs font-normal muted">XP</span>
              </p>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="space-y-2 pt-4 border-t border-white/10 dark:border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium muted">Level Progress</span>
              <span className="font-medium muted">{levelInfo.xpNeeded} XP to next level</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* This Week Day Selector Strip Card (No left accent bar) */}
      <section className="card mb-6">
        <h2 className="section-header">
          <Calendar className="h-4 w-4 text-theme-400 stroke-[1.5]" />
          {t('exercise.thisWeekStrip')}
        </h2>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center justify-between gap-2.5 min-w-[340px]">
            {stats.currentWeekDays.map(day => {
              const isToday = day.dateStr === todayStr
              return (
                <div
                  key={day.dateStr}
                  className={`flex-1 flex flex-col items-center justify-center rounded-xl p-3 transition-all min-h-[64px] border ${
                    day.logged
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : isToday
                      ? 'bg-theme-500/15 border-theme-500/30 text-theme-400'
                      : 'bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/10 muted'
                  }`}
                >
                  <span className="text-xs font-medium">{day.dayName}</span>
                  {day.logged ? (
                    <span className="mt-1.5 text-base">{ACTIVITY_ICONS[day.activityType] || '✅'}</span>
                  ) : (
                    <span className="mt-2 h-3 w-3 rounded-full border border-current opacity-30" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Check-in Heatmap Card (No left accent bar) */}
      <section className="card mb-6">
        <h2 className="section-header">
          <Calendar className="h-4 w-4 text-emerald-400 stroke-[1.5]" />
          {t('exercise.monthlyHeatmap')}
        </h2>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="grid grid-cols-7 gap-2 min-w-[340px]">
            {heatmapDays.map(day => (
              <div
                key={day.dateStr}
                title={`${day.dateStr} (${day.activity || 'No workout'})`}
                className={`flex flex-col items-center justify-center rounded-lg p-2 min-h-[44px] border transition-colors ${
                  day.logged
                    ? 'bg-emerald-500/20 border-emerald-500/35 text-emerald-400 font-medium'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 muted'
                }`}
              >
                <span className="text-[10px]">{day.label}</span>
                {day.logged && <span className="text-xs mt-0.5">{ACTIVITY_ICONS[day.activity] || '⚡'}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs muted">
          <span>{t('exercise.less')}</span>
          <span className="h-3 w-3 rounded bg-slate-200 dark:bg-white/10" />
          <span className="h-3 w-3 rounded bg-emerald-500/30" />
          <span className="h-3 w-3 rounded bg-emerald-500" />
          <span>{t('exercise.more')}</span>
        </div>
      </section>

      {/* Milestone Badges Card (No left accent bar) */}
      <section className="card mb-6">
        <h2 className="section-header">
          <Award className="h-4 w-4 text-amber-400 stroke-[1.5]" />
          {t('exercise.badgesTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.badgeStatuses.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBadge(b)}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all min-h-[64px] ${
                b.unlocked
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 opacity-75'
              }`}
            >
              <span className="text-2xl shrink-0">{b.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{t(b.titleKey)}</p>
                <p className={`text-xs ${b.unlocked ? 'text-amber-400 font-medium' : 'muted'}`}>
                  {b.unlocked ? t('exercise.badgeUnlocked') : t('exercise.badgeLocked')}
                </p>
              </div>
              <Info className="h-4 w-4 shrink-0 opacity-40 muted" />
            </button>
          ))}
        </div>
      </section>

      {/* AI Workout Suggestion Card (No left accent bar) */}
      <section className="card mb-6">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h2 className="section-header mb-0">
            <Bot className="h-4 w-4 text-purple-400 stroke-[1.5]" />
            {t('exercise.aiTitle')}
          </h2>
          {!aiPlan && !aiLoading && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 text-sm font-medium transition-colors"
              onClick={generateAiSuggestion}
            >
              {t('exercise.generatePlan')}
            </button>
          )}
        </div>
        {aiLoading ? (
          <div className="skeleton h-36 rounded-xl" />
        ) : aiPlan ? (
          <div>
            <div
              className="scrollbar-hide max-h-96 overflow-y-auto text-sm leading-6 mb-4"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(aiPlan) }}
            />
            <div className="flex gap-2.5 justify-end mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-full transition-colors flex items-center gap-2"
                onClick={deleteAiSuggestion}
              >
                <Trash2 className="h-4 w-4 stroke-[1.5]" />
                {t('exercise.deletePlan')}
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
                onClick={generateAiSuggestion}
              >
                <RefreshCw className="h-4 w-4 stroke-[1.5]" />
                {t('exercise.regeneratePlan')}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm muted">{t('exercise.aiDesc')}</p>
        )}
      </section>

      {/* Recent Activity / History Card (No left accent bar) */}
      <section className="card mb-12">
        <h2 className="section-header">{t('exercise.history')}</h2>
        {logs.length === 0 ? (
          <EmptyState emoji="🏃" message={t('exercise.noHistory')} />
        ) : (
          <div className="space-y-2.5">
            {logs.slice(0, 10).map((item, idx) => (
              <article
                key={item.id || idx}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 p-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ACTIVITY_ICONS[item.activity_type] || '⚡'}</span>
                  <div>
                    <p className="font-semibold text-sm">{item.activity_type || 'Workout'}</p>
                    <p className="text-xs muted">{item.log_date}</p>
                  </div>
                </div>
                <span className="rounded-full bg-purple-500/15 border border-purple-500/25 px-3 py-1 text-xs font-medium text-purple-400">
                  +{item.xp_earned || 20} XP
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

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
                      ? 'bg-theme-500/20 text-theme-400 border-theme-500/40'
                      : 'bg-slate-100 dark:bg-white/5 muted border-slate-200 dark:border-white/10 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </label>
          <button
            type="submit"
            className="w-full min-h-[48px] rounded-full bg-blue-600 hover:bg-blue-700 font-semibold text-white transition-colors"
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
              <p className="text-sm muted mt-1">{t(selectedBadge.descKey)}</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium border ${
              selectedBadge.unlocked
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-100 dark:bg-white/5 muted border-slate-200 dark:border-white/10'
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
              className="w-full mt-4 min-h-[48px] rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 font-semibold border border-slate-200 dark:border-white/10 transition-colors"
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
