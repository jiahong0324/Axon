import { useState, useMemo, useRef } from 'react'
import {
  Sparkles,
  Plus,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flame,
  Trash2,
  Pencil,
  Calendar,
  UtensilsCrossed,
  Info
} from 'lucide-react'
import {
  calculateDayNutrition,
  formatNutritionDate,
  formatMealTime,
  getTodayDateStr,
  MEAL_TYPES,
  MEAL_TYPE_ICONS
} from '../../lib/nutritionUtils'
import { useToast } from '../Toast'
import { useConfirmDialog } from '../ConfirmModal'
import DietGoalModal from './DietGoalModal'
import ManualFoodModal from './ManualFoodModal'
import AIFoodScannerModal from './AIFoodScannerModal'

export default function DietNutritionTab({
  userId,
  goals,
  logs,
  hasSetGoals,
  onSaveGoals,
  onSaveFood,
  onDeleteFood
}) {
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const [activeDate, setActiveDate] = useState(() => getTodayDateStr())
  const todayStr = useMemo(() => getTodayDateStr(), [])
  const datePickerRef = useRef(null)

  // Modals state
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Calculate day nutrition data
  const dayStats = useMemo(
    () => calculateDayNutrition(logs, activeDate, goals),
    [logs, activeDate, goals]
  )

  // Date switching handlers
  function handlePrevDay() {
    const d = new Date(activeDate + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setActiveDate(`${y}-${m}-${day}`)
  }

  function handleNextDay() {
    const d = new Date(activeDate + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setActiveDate(`${y}-${m}-${day}`)
  }

  function handleToday() {
    setActiveDate(todayStr)
  }

  async function handleDelete(item) {
    const ok = await confirm({
      title: 'Remove Food Item?',
      message: `Are you sure you want to delete "${item.name}" (${item.calories} kcal)? This will update your daily intake immediately.`,
      confirmText: 'Delete',
      confirmVariant: 'danger'
    })
    if (ok) {
      await onDeleteFood(item.id)
      showToast('Food log deleted', 'info')
    }
  }

  function handleEdit(item) {
    setEditingItem(item)
    setManualModalOpen(true)
  }

  return (
    <div className="space-y-6 w-full">
      {ConfirmDialog}

      {/* Top Welcome / Initial Setup Banner if goals haven't been set */}
      {!hasSetGoals && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-slate-900/40 p-4 sm:p-5 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/20 text-blue-400">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Customize Your Daily Nutrition Goals</h4>
              <p className="text-xs text-slate-300">Set your personal daily targets for Calories, Protein, Carbs, and Fats.</p>
            </div>
          </div>
          <button
            onClick={() => setGoalModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0 transition-all"
          >
            Set Goals Now
          </button>
        </div>
      )}

      {/* Date Switcher & Action Buttons Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Date Selector */}
        <div className="flex items-center justify-between sm:justify-start gap-2 bg-[#111827] p-1.5 rounded-xl border border-white/5 shadow-md">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
            title="Previous Day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {/* Interactive Calendar Date Picker */}
          <div className="relative flex items-center group cursor-pointer">
            <div className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-white group-hover:bg-slate-800/80 group-hover:text-blue-300 transition-all flex items-center gap-1.5 select-none min-w-[130px] sm:min-w-[150px] justify-center pointer-events-none">
              <Calendar className="h-3.5 w-3.5 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
              <span>{formatNutritionDate(activeDate)}</span>
              <ChevronDown className="h-3 w-3 text-slate-500 group-hover:text-blue-300 transition-colors shrink-0" />
            </div>
            <input
              ref={datePickerRef}
              type="date"
              value={activeDate}
              onClick={(e) => {
                try {
                  if (typeof e.target.showPicker === 'function') {
                    e.target.showPicker()
                  }
                } catch (err) {}
              }}
              onChange={(e) => {
                if (e.target.value) {
                  setActiveDate(e.target.value)
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Click to choose any date from calendar"
            />
          </div>
          <button
            onClick={handleNextDay}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
            title="Next Day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {activeDate !== todayStr && (
            <button
              onClick={handleToday}
              className="ml-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-400 hover:bg-blue-500/10 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Action Buttons: AI Scan, Manual Add, Edit Goals */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-amber-200" />
            <span>AI Food Scan</span>
          </button>
          <button
            onClick={() => { setEditingItem(null); setManualModalOpen(true) }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold bg-[#131b2e] hover:bg-slate-800 border border-white/10 text-slate-200 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 shrink-0 text-blue-400" />
            <span>Log Manually</span>
          </button>
          <button
            onClick={() => setGoalModalOpen(true)}
            className="h-10 w-10 sm:h-[42px] sm:w-[42px] inline-flex items-center justify-center rounded-xl bg-[#131b2e] hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95 shrink-0"
            title="Edit Daily Nutrition Goals"
          >
            <Settings2 className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* HERO DASHBOARD: 4 CLEAN COLORED PROGRESS BARS (CALORIES, PROTEIN, CARBS, FATS) */}
      <section className="rounded-2xl bg-[#131b2e] p-6 sm:p-7 shadow-xl border border-white/5 space-y-6">
        {/* Header / Title */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/15 text-orange-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Daily Nutrition Progress
              </h3>
              <p className="text-xs text-slate-400">
                Track your calorie intake and macronutrients for {formatNutritionDate(activeDate)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setGoalModalOpen(true)}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            <span>Goal: {goals.calories} kcal</span>
            <Pencil className="h-3 w-3" />
          </button>
        </div>

        {/* 4 Colored Progress Bars Grid */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* 1. CALORIES PROGRESS BAR (Orange Theme) */}
          <div className="rounded-xl bg-slate-900/60 p-4 border border-white/5 space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" /> Calories
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-white">
                    {dayStats.consumedCalories.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    / {dayStats.targetCalories.toLocaleString()} kcal
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-400 block">Remaining</span>
                <span className="text-sm font-bold text-orange-300">
                  {Math.max(0, dayStats.remainingCalories).toLocaleString()} kcal
                </span>
              </div>
            </div>

            {/* Colored Progress Bar */}
            <div className="h-3 w-full rounded-full bg-slate-800/90 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500 shadow-sm"
                style={{ width: `${dayStats.calPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>0 kcal</span>
              <span className="font-semibold text-slate-300">{dayStats.calPercent}%</span>
              <span>{dayStats.targetCalories.toLocaleString()} kcal</span>
            </div>
          </div>

          {/* 2. PROTEIN PROGRESS BAR (Emerald Green Theme) */}
          <div className="rounded-xl bg-slate-900/60 p-4 border border-white/5 space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  🥩 Protein
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-white">
                    {dayStats.consumedProtein}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    / {dayStats.targetProtein} g
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-400 block">Remaining</span>
                <span className="text-sm font-bold text-emerald-300">
                  {Math.max(0, dayStats.remainingProtein)} g
                </span>
              </div>
            </div>

            {/* Colored Progress Bar */}
            <div className="h-3 w-full rounded-full bg-slate-800/90 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-sm"
                style={{ width: `${dayStats.proteinPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>0 g</span>
              <span className="font-semibold text-slate-300">{dayStats.proteinPercent}%</span>
              <span>{dayStats.targetProtein} g</span>
            </div>
          </div>

          {/* 3. CARBS PROGRESS BAR (Amber / Gold Theme) */}
          <div className="rounded-xl bg-slate-900/60 p-4 border border-white/5 space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  🍞 Carbs
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-white">
                    {dayStats.consumedCarbs}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    / {dayStats.targetCarbs} g
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-400 block">Remaining</span>
                <span className="text-sm font-bold text-amber-300">
                  {Math.max(0, dayStats.remainingCarbs)} g
                </span>
              </div>
            </div>

            {/* Colored Progress Bar */}
            <div className="h-3 w-full rounded-full bg-slate-800/90 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500 shadow-sm"
                style={{ width: `${dayStats.carbsPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>0 g</span>
              <span className="font-semibold text-slate-300">{dayStats.carbsPercent}%</span>
              <span>{dayStats.targetCarbs} g</span>
            </div>
          </div>

          {/* 4. FATS PROGRESS BAR (Rose / Pink Theme) */}
          <div className="rounded-xl bg-slate-900/60 p-4 border border-white/5 space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  🥑 Fats
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-white">
                    {dayStats.consumedFats}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    / {dayStats.targetFats} g
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-400 block">Remaining</span>
                <span className="text-sm font-bold text-rose-300">
                  {Math.max(0, dayStats.remainingFats)} g
                </span>
              </div>
            </div>

            {/* Colored Progress Bar */}
            <div className="h-3 w-full rounded-full bg-slate-800/90 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500 shadow-sm"
                style={{ width: `${dayStats.fatsPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>0 g</span>
              <span className="font-semibold text-slate-300">{dayStats.fatsPercent}%</span>
              <span>{dayStats.targetFats} g</span>
            </div>
          </div>
        </div>
      </section>

      {/* TODAY'S MEAL LOGS LIST (GROUPED BY MEAL CATEGORY) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            <span>Meals for {formatNutritionDate(activeDate)}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {dayStats.dayLogs.length} logged
            </span>
          </h3>
        </div>

        {dayStats.dayLogs.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#131b2e]/60 p-8 sm:p-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/10 text-blue-400 mx-auto mb-3">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">No meals logged for this day</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
              Snap a quick photo with AI or log your meal manually to track your calories and macros!
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setScannerOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
              >
                <Sparkles className="h-4 w-4 text-amber-200" />
                <span>AI Scan Meal</span>
              </button>
              <button
                onClick={() => { setEditingItem(null); setManualModalOpen(true) }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 transition-all"
              >
                <span>Add Manually</span>
              </button>
            </div>
          </div>
        ) : (
          /* Grouped by Meal Categories */
          <div className="space-y-4">
            {MEAL_TYPES.map(category => {
              const items = dayStats.groupedMeals[category] || []
              if (items.length === 0) return null

              const catCalories = items.reduce((acc, cur) => acc + (Number(cur.calories) || 0), 0)
              const categoryTime = items.length > 0 ? formatMealTime(items[0].meal_time, items[0].created_at) : null

              return (
                <div
                  key={category}
                  className="rounded-2xl bg-[#131b2e] p-4 sm:p-5 border border-white/5 shadow-md space-y-3"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{MEAL_TYPE_ICONS[category]}</span>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        {category}
                      </h4>
                      {categoryTime && (
                        <span className="text-xs text-slate-400 font-normal">
                          {categoryTime}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-orange-400">
                      {catCalories.toLocaleString()} kcal
                    </span>
                  </div>

                  {/* Category Items */}
                  <div className="divide-y divide-white/5">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-12 w-12 rounded-xl object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-xl bg-slate-800/80 text-lg shrink-0">
                              {MEAL_TYPE_ICONS[category]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h5 className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                              {item.name}
                            </h5>
                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 mt-0.5">
                              {item.notes && <span className="text-slate-300">{item.notes} ·</span>}
                              <span className="text-emerald-400 font-medium">P: {item.protein}g</span>
                              <span className="text-amber-400 font-medium">C: {item.carbs}g</span>
                              <span className="text-rose-400 font-medium">F: {item.fats}g</span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: Calories & actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t border-white/5 sm:border-none">
                          <span className="text-sm font-bold text-white">
                            {item.calories} <span className="text-xs text-slate-400 font-normal">kcal</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
                              title="Edit item"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors inline-flex items-center justify-center"
                              title="Delete item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* MODALS */}
      <DietGoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        currentGoals={goals}
        onSave={async (newGoals) => {
          await onSaveGoals(newGoals)
          showToast('Daily nutrition goals updated!', 'success')
        }}
      />

      <ManualFoodModal
        isOpen={manualModalOpen}
        onClose={() => { setManualModalOpen(false); setEditingItem(null) }}
        initialData={editingItem}
        defaultDate={activeDate}
        onSave={async (item) => {
          await onSaveFood(item)
          showToast(editingItem ? 'Food updated!' : 'Food logged successfully!', 'success')
        }}
      />

      <AIFoodScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        defaultDate={activeDate}
        onSave={async (item) => {
          await onSaveFood(item)
          showToast(`Added "${item.name}" to today's log!`, 'success')
        }}
      />
    </div>
  )
}
