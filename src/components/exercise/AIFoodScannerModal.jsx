import { useState, useRef, useEffect } from 'react'
import Modal from '../Modal'
import { Camera, Upload, Sparkles, AlertCircle, Check, RotateCcw, Flame } from 'lucide-react'
import { analyzeImageWithGroq } from '../../lib/groq'
import { MEAL_TYPES, MEAL_TYPE_ICONS, getTodayDateStr } from '../../lib/nutritionUtils'

const FOOD_SCAN_PROMPT = `Analyze this food image. Identify the dish/food, estimate the portion shown, and calculate its nutritional content.
CRITICAL INSTRUCTIONS:
1. Estimate:
   - name: Clear, concise food or dish name (e.g. "Hainanese Chicken Rice", "Grilled Salmon with Veggies", "Protein Oatmeal")
   - portion: Estimated portion or serving description (e.g. "1 bowl (~350g)", "1 slice (~120g)")
   - calories: Estimated calories in kcal (integer)
   - protein: Estimated protein in grams (number)
   - carbs: Estimated carbohydrates in grams (number)
   - fats: Estimated fats in grams (number)
2. DO NOT include any health, dietary, or fitness advice.
3. DO NOT include conversational fluff or markdown formatting outside the JSON.
4. Return ONLY a single valid JSON object in this exact format:
{
  "name": "Food Name",
  "portion": "Portion description",
  "calories": 450,
  "protein": 30,
  "carbs": 45,
  "fats": 12
}`

function resizeImageFile(file, maxDimension = 1280) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        resolve(compressedBase64)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AIFoodScannerModal({ isOpen, onClose, defaultDate, onSave }) {
  const [step, setStep] = useState('upload') // 'upload' | 'analyzing' | 'review'
  const [imagePreview, setImagePreview] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Review Form States
  const [foodName, setFoodName] = useState('')
  const [mealType, setMealType] = useState('Lunch')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [portionNotes, setPortionNotes] = useState('')

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setStep('upload')
      setImagePreview(null)
      setErrorMsg('')
      setFoodName('')
      setMealType('Lunch')
      setCalories('')
      setProtein('')
      setCarbs('')
      setFats('')
      setPortionNotes('')
    }
  }, [isOpen])

  async function handleFileSelect(file) {
    if (!file) return
    setErrorMsg('')
    setStep('analyzing')

    try {
      const base64Image = await resizeImageFile(file, 1280)
      setImagePreview(base64Image)

      // Call AI Vision endpoint
      const rawResponse = await analyzeImageWithGroq(
        base64Image,
        'image/jpeg',
        FOOD_SCAN_PROMPT
      )

      // Parse JSON from response
      let parsed = null
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          parsed = JSON.parse(rawResponse)
        }
      } catch (parseErr) {
        console.warn('Failed to parse AI food JSON, falling back:', rawResponse)
      }

      if (parsed && (parsed.name || parsed.calories !== undefined)) {
        setFoodName(parsed.name || 'Recognized Food')
        setPortionNotes(parsed.portion || '')
        setCalories(parsed.calories ? Math.round(Number(parsed.calories)) : '')
        setProtein(parsed.protein ? Math.round(Number(parsed.protein) * 10) / 10 : '0')
        setCarbs(parsed.carbs ? Math.round(Number(parsed.carbs) * 10) / 10 : '0')
        setFats(parsed.fats ? Math.round(Number(parsed.fats) * 10) / 10 : '0')
        setStep('review')
      } else {
        throw new Error('AI could not clearly identify the food in this photo. Please try a clearer picture or enter details manually.')
      }
    } catch (err) {
      console.error('Food scanning error:', err)
      setErrorMsg(err.message || 'Failed to analyze food image. Please try again.')
      setStep('upload')
    }
  }

  async function handleConfirmAdd() {
    if (!foodName.trim() || calories === '') return
    setSaving(true)
    try {
      await onSave({
        date: defaultDate || getTodayDateStr(),
        meal_type: mealType,
        name: foodName.trim(),
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fats: Number(fats) || 0,
        notes: portionNotes.trim(),
        image_url: imagePreview || ''
      })
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
      title="AI Food Scanner"
      maxWidth="max-w-lg"
    >
      <div className="p-1 space-y-4">
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
            e.target.value = ''
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
            e.target.value = ''
          }}
        />

        {/* STEP 1: Upload or Take Photo */}
        {step === 'upload' && (
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="text-center py-6 px-4 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-900/80 transition-colors">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-500/15 text-blue-400 mx-auto mb-3 shadow-lg shadow-blue-500/10">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Scan Your Meal with AI
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                Snap a photo or upload a picture of your dish. AI will estimate its Calories, Protein, Carbs, and Fats automatically.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Take Photo button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  <Camera className="h-4 w-4" />
                  <span>Take Photo</span>
                </button>

                {/* Upload from Gallery button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
                >
                  <Upload className="h-4 w-4" />
                  <span>Choose from Gallery</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Analyzing State */}
        {step === 'analyzing' && (
          <div className="py-12 px-4 text-center space-y-4">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <div className="grid h-full w-full place-items-center text-blue-400">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1">
                Analyzing Food & Calories...
              </h4>
              <p className="text-xs text-slate-400">
                Detecting food items, estimating portion sizes, and calculating macros...
              </p>
            </div>
            {imagePreview && (
              <div className="mx-auto max-w-xs overflow-hidden rounded-xl border border-slate-800 shadow-md">
                <img
                  src={imagePreview}
                  alt="Analyzing preview"
                  className="h-36 w-full object-cover opacity-75"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Review & Edit State */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Image Preview & Retake Header */}
            <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="h-16 w-16 rounded-lg object-cover border border-slate-700 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 font-medium">AI Recognized Food</p>
                <h4 className="text-sm font-bold text-white truncate">{foodName}</h4>
                {portionNotes && (
                  <p className="text-[11px] text-blue-400 truncate">Est. {portionNotes}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Retake / Re-upload"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Meal Category */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Meal Category
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
                {MEAL_TYPES.map(mt => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setMealType(mt)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      mealType === mt
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs">{MEAL_TYPE_ICONS[mt]}</span>
                    <span className="truncate">{mt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Food Name Editable */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Food Name (Editable)
              </label>
              <input
                type="text"
                value={foodName}
                onChange={e => setFoodName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* 4 Nutrition Metrics (Editable) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Estimated Macros (Review & Adjust)
              </label>

              {/* Calories */}
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/25 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5" /> Calories
                  </span>
                  <span className="text-xs text-orange-300 font-medium">kcal</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={calories}
                  onChange={e => setCalories(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-bold text-base focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              {/* Protein, Carbs, Fats in 3 columns */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold text-emerald-400">Protein</span>
                    <span className="text-[10px] text-slate-400">g</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={protein}
                    onChange={e => setProtein(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white font-bold text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold text-amber-400">Carbs</span>
                    <span className="text-[10px] text-slate-400">g</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={carbs}
                    onChange={e => setCarbs(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold text-rose-400">Fats</span>
                    <span className="text-[10px] text-slate-400">g</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={fats}
                    onChange={e => setFats(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white font-bold text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !foodName.trim() || calories === ''}
                onClick={handleConfirmAdd}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
              >
                {saving ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirm & Add to Today
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
