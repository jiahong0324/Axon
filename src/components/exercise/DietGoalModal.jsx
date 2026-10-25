import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { Check, Flame } from 'lucide-react'
import { DEFAULT_NUTRITION_GOALS } from '../../lib/nutritionUtils'

export default function DietGoalModal({ isOpen, onClose, currentGoals, onSave }) {
  const [goals, setGoals] = useState({ ...DEFAULT_NUTRITION_GOALS })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (currentGoals && typeof currentGoals.calories === 'number') {
        setGoals({ ...currentGoals })
      } else {
        setGoals({ ...DEFAULT_NUTRITION_GOALS })
      }
    }
  }, [isOpen, currentGoals])

  function handleInputChange(field, val) {
    setGoals(prev => ({ ...prev, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const sanitized = {
        calories: Math.max(0, Math.round(Number(goals.calories) || DEFAULT_NUTRITION_GOALS.calories)),
        protein: Math.max(0, Math.round((Number(goals.protein) || 0) * 10) / 10),
        carbs: Math.max(0, Math.round((Number(goals.carbs) || 0) * 10) / 10),
        fats: Math.max(0, Math.round((Number(goals.fats) || 0) * 10) / 10)
      }
      await onSave(sanitized)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Daily Nutrition Goals" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-6 p-1">
        {/* 4 Nutrition Metric Fields */}
        <div className="space-y-3.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Target Values
          </label>

          {/* Calories */}
          <div className="rounded-xl bg-slate-900/80 p-3.5 border border-slate-800 focus-within:border-orange-500/60 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                <Flame className="h-4 w-4" /> Daily Calories Goal
              </span>
              <span className="text-xs text-slate-400 font-medium">kcal</span>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={goals.calories ?? ''}
              onChange={e => handleInputChange('calories', e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3.5 py-2 text-white font-bold text-lg focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="e.g. 2000"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Protein */}
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 focus-within:border-emerald-500/60 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-400">Protein</span>
                <span className="text-[11px] text-slate-400">g</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={goals.protein ?? ''}
                onChange={e => handleInputChange('protein', e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-base focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="120"
                required
              />
            </div>

            {/* Carbs */}
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 focus-within:border-amber-500/60 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-400">Carbs</span>
                <span className="text-[11px] text-slate-400">g</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={goals.carbs ?? ''}
                onChange={e => handleInputChange('carbs', e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-base focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="250"
                required
              />
            </div>

            {/* Fats */}
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 focus-within:border-rose-500/60 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-400">Fats</span>
                <span className="text-[11px] text-slate-400">g</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={goals.fats ?? ''}
                onChange={e => handleInputChange('fats', e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-base focus:outline-none focus:border-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="65"
                required
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            {saving ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Daily Goals
          </button>
        </div>
      </form>
    </Modal>
  )
}
