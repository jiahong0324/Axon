import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { Plus, Check, Utensils, Flame, Clock } from 'lucide-react'
import { MEAL_TYPES, MEAL_TYPE_ICONS, getTodayDateStr, getCurrentTimeStr } from '../../lib/nutritionUtils'

export default function ManualFoodModal({ isOpen, onClose, initialData, defaultDate, onSave }) {
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState('')
  const [mealTime, setMealTime] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [categoryError, setCategoryError] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '')
        setMealType(initialData.meal_type || '')
        let t = initialData.meal_time || ''
        if (!t && initialData.created_at) {
          const d = new Date(initialData.created_at)
          if (!isNaN(d.getTime())) {
            t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          }
        }
        setMealTime(t || getCurrentTimeStr())
        setCalories(initialData.calories ?? '')
        setProtein(initialData.protein ?? '')
        setCarbs(initialData.carbs ?? '')
        setFats(initialData.fats ?? '')
        setNotes(initialData.notes || '')
      } else {
        setName('')
        setMealType('')
        setMealTime(getCurrentTimeStr())
        setCalories('')
        setProtein('')
        setCarbs('')
        setFats('')
        setNotes('')
      }
      setCategoryError(false)
    }
  }, [isOpen, initialData])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (!mealType) {
      setCategoryError(true)
      return
    }

    setSaving(true)
    try {
      const logDate = initialData?.date || defaultDate || getTodayDateStr()
      let createdAt = initialData?.created_at
      if (mealTime && logDate) {
        try {
          createdAt = new Date(`${logDate}T${mealTime}:00`).toISOString()
        } catch (e) {}
      }

      const foodPayload = {
        id: initialData?.id,
        date: logDate,
        meal_type: mealType,
        meal_time: mealTime,
        name: name.trim(),
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fats: Number(fats) || 0,
        notes: notes.trim(),
        image_url: initialData?.image_url || '',
        created_at: createdAt
      }
      await onSave(foodPayload)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Food Entry' : 'Log Food Manually'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        {/* Meal Type Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Meal Category <span className="text-rose-400">*</span>
              {!categoryError && !mealType && (
                <span className="text-slate-500 text-[10px] lowercase font-normal ml-1">(choose one)</span>
              )}
            </label>
            {categoryError && !mealType && (
              <span className="text-[11px] text-rose-400 font-medium animate-pulse">
                Please select a category
              </span>
            )}
          </div>
          <div className={`grid grid-cols-4 gap-1.5 p-1 bg-slate-900/80 rounded-xl border transition-colors ${
            categoryError && !mealType ? 'border-rose-500/60 ring-1 ring-rose-500/40' : 'border-slate-800'
          }`}>
            {MEAL_TYPES.map(mt => {
              const active = mealType === mt
              return (
                <button
                  key={mt}
                  type="button"
                  onClick={() => {
                    setMealType(mt)
                    setCategoryError(false)
                  }}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                    active
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-sm">{MEAL_TYPE_ICONS[mt]}</span>
                  <span className="truncate">{mt}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Meal Time Picker */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-400" /> Meal Time
          </label>
          <input
            type="time"
            value={mealTime}
            onChange={e => setMealTime(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium text-sm focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
            required
          />
        </div>

        {/* Food Name */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Food / Dish Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Chicken Rice, Oatmeal & Milk"
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-blue-500 transition-colors"
            required
            autoFocus
          />
        </div>

        {/* Calories Input */}
        <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 focus-within:border-orange-500 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" /> Calories *
            </span>
            <span className="text-xs text-orange-300 font-medium">kcal</span>
          </div>
          <input
            type="number"
            min="0"
            step="any"
            value={calories}
            onChange={e => setCalories(e.target.value)}
            placeholder="e.g. 450"
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-lg focus:outline-none focus:border-orange-500"
            required
          />
        </div>

        {/* 3 Macro Inputs: Protein, Carbs, Fats */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Macronutrients (Optional)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Protein */}
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-2.5 focus-within:border-emerald-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-400">Protein</span>
                <span className="text-[10px] text-slate-400">g</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={protein}
                onChange={e => setProtein(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Carbs */}
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-2.5 focus-within:border-amber-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-amber-400">Carbs</span>
                <span className="text-[10px] text-slate-400">g</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={carbs}
                onChange={e => setCarbs(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Fats */}
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-2.5 focus-within:border-rose-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-rose-400">Fats</span>
                <span className="text-[10px] text-slate-400">g</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={fats}
                onChange={e => setFats(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-white font-bold text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Portion / Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. 1 bowl, roughly 300g, less oil"
            className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || calories === ''}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            {saving ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {initialData ? 'Update Food' : 'Save Food'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
