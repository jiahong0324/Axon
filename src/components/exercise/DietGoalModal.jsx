import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { Target, Sparkles, Check, Flame, Dumbbell, ShieldCheck } from 'lucide-react'
import { DEFAULT_NUTRITION_GOALS } from '../../lib/nutritionUtils'

const PRESETS = [
  {
    id: 'balanced',
    name: 'Balanced Wellness',
    desc: 'Everyday healthy nutrition balance',
    icon: '🥗',
    goals: { calories: 2000, protein: 120, carbs: 250, fats: 65 }
  },
  {
    id: 'fitness',
    name: 'Muscle & Strength',
    desc: 'Higher protein for workout recovery',
    icon: '💪',
    goals: { calories: 2200, protein: 150, carbs: 240, fats: 60 }
  },
  {
    id: 'cutting',
    name: 'Fat Loss & Lean',
    desc: 'Calorie deficit with high protein',
    icon: '🔥',
    goals: { calories: 1700, protein: 135, carbs: 160, fats: 50 }
  }
]

export default function DietGoalModal({ isOpen, onClose, currentGoals, onSave }) {
  const [goals, setGoals] = useState({ ...DEFAULT_NUTRITION_GOALS })
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (currentGoals && typeof currentGoals.calories === 'number') {
        setGoals({ ...currentGoals })
      } else {
        setGoals({ ...DEFAULT_NUTRITION_GOALS })
      }
      setSelectedPreset(null)
    }
  }, [isOpen, currentGoals])

  function handlePresetSelect(preset) {
    setSelectedPreset(preset.id)
    setGoals({ ...preset.goals })
  }

  function handleInputChange(field, val) {
    setSelectedPreset(null)
    const num = Math.max(0, Number(val) || 0)
    setGoals(prev => ({ ...prev, [field]: num }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(goals)
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
        {/* Quick Presets Strip */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">
            Quick Recommendation Presets
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PRESETS.map(p => {
              const active = selectedPreset === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetSelect(p)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    active
                      ? 'bg-blue-500/15 border-blue-500 text-white shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-lg">{p.icon}</span>
                    {active && <Check className="h-4 w-4 text-blue-400" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{p.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{p.goals.calories} kcal</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

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
              min="500"
              max="10000"
              step="50"
              value={goals.calories || ''}
              onChange={e => handleInputChange('calories', e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3.5 py-2 text-white font-bold text-lg focus:outline-none focus:border-orange-500"
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
                max="1000"
                step="5"
                value={goals.protein || ''}
                onChange={e => handleInputChange('protein', e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-base focus:outline-none focus:border-emerald-500"
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
                max="1500"
                step="5"
                value={goals.carbs || ''}
                onChange={e => handleInputChange('carbs', e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-base focus:outline-none focus:border-amber-500"
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
                max="500"
                step="5"
                value={goals.fats || ''}
                onChange={e => handleInputChange('fats', e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-bold text-base focus:outline-none focus:border-rose-500"
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
