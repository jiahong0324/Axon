import { useState, useRef, useEffect } from 'react'
import Modal from '../Modal'
import TimePicker from '../TimePicker'
import { Camera, Upload, Sparkles, AlertCircle, Check, RotateCcw, Flame, Clock, HardDrive } from 'lucide-react'
import { analyzeImageWithGroq } from '../../lib/groq'
import { MEAL_TYPES, MEAL_TYPE_ICONS, getTodayDateStr, getCurrentTimeStr, getMealTypeFromTime } from '../../lib/nutritionUtils'
import { purgeStorageBloat } from '../../lib/safeStorage'
import { useLanguage } from '../LanguageProvider'

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

function processFoodImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No image file selected.'))

    let objectUrl = null
    try {
      objectUrl = URL.createObjectURL(file)
    } catch (e) {
      // Fallback below
    }

    const img = new Image()

    function cleanup() {
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl) } catch (e) {}
      }
    }

    img.onload = () => {
      try {
        const origWidth = img.naturalWidth || img.width
        const origHeight = img.naturalHeight || img.height

        if (!origWidth || !origHeight) {
          cleanup()
          return reject(new Error('Unable to read image dimensions.'))
        }

        // 1. Generate AI Vision image (max 2048px, JPEG 0.9) for high-definition Groq/Gemini detection
        const aiMax = 2048
        let aiWidth = origWidth
        let aiHeight = origHeight
        if (aiWidth > aiMax || aiHeight > aiMax) {
          if (aiWidth > aiHeight) {
            aiHeight = Math.round((aiHeight * aiMax) / aiWidth)
            aiWidth = aiMax
          } else {
            aiWidth = Math.round((aiWidth * aiMax) / aiHeight)
            aiHeight = aiMax
          }
        }

        const aiCanvas = document.createElement('canvas')
        aiCanvas.width = aiWidth
        aiCanvas.height = aiHeight
        const aiCtx = aiCanvas.getContext('2d')
        if (!aiCtx) {
          cleanup()
          return reject(new Error('Canvas context not available.'))
        }
        aiCtx.drawImage(img, 0, 0, aiWidth, aiHeight)
        const aiBase64 = aiCanvas.toDataURL('image/jpeg', 0.9)

        // 2. Generate crisp high-DPI thumbnail for storage (max 480px, JPEG 0.82)
        // Stays razor-sharp on Retina/mobile screens (~20-30KB) while protecting storage quota
        const thumbMax = 480
        let thumbWidth = origWidth
        let thumbHeight = origHeight
        if (thumbWidth > thumbMax || thumbHeight > thumbMax) {
          if (thumbWidth > thumbHeight) {
            thumbHeight = Math.round((thumbHeight * thumbMax) / thumbWidth)
            thumbWidth = thumbMax
          } else {
            thumbWidth = Math.round((thumbWidth * thumbMax) / thumbHeight)
            thumbHeight = thumbMax
          }
        }

        const thumbCanvas = document.createElement('canvas')
        thumbCanvas.width = thumbWidth
        thumbCanvas.height = thumbHeight
        const thumbCtx = thumbCanvas.getContext('2d')
        thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight)
        const thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.82)

        cleanup()
        resolve({
          aiBase64,
          thumbnailBase64
        })
      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    img.onerror = () => {
      cleanup()
      // Fallback to FileReader if objectUrl was rejected by WebKit
      const reader = new FileReader()
      reader.onload = (e) => {
        const fallbackImg = new Image()
        fallbackImg.onload = () => {
          try {
            const w = fallbackImg.width || 400
            const h = fallbackImg.height || 300
            const canvas = document.createElement('canvas')
            canvas.width = Math.min(w, 1600)
            canvas.height = Math.round((h * canvas.width) / w)
            const ctx = canvas.getContext('2d')
            ctx.drawImage(fallbackImg, 0, 0, canvas.width, canvas.height)
            const b64 = canvas.toDataURL('image/jpeg', 0.88)
            resolve({ aiBase64: b64, thumbnailBase64: b64 })
          } catch (err) {
            reject(err)
          }
        }
        fallbackImg.onerror = () => reject(new Error('Failed to load image from camera or library.'))
        fallbackImg.src = e.target.result
      }
      reader.onerror = () => reject(new Error('Failed to read image file.'))
      reader.readAsDataURL(file)
    }

    if (objectUrl) {
      img.src = objectUrl
    } else {
      const reader = new FileReader()
      reader.onload = (e) => { img.src = e.target.result }
      reader.onerror = () => reject(new Error('Failed to read image file.'))
      reader.readAsDataURL(file)
    }
  })
}

export default function AIFoodScannerModal({ isOpen, onClose, defaultDate, onSave, onSwitchToManual }) {
  const { language } = useLanguage()
  const [step, setStep] = useState('upload') // 'upload' | 'analyzing' | 'review'
  const [imagePreview, setImagePreview] = useState(null)
  const [errorInfo, setErrorInfo] = useState(null) // { type: 'limit' | 'unrecognized' } | null
  const [saving, setSaving] = useState(false)

  // Review Form States
  const [foodName, setFoodName] = useState('')
  const [mealTime, setMealTime] = useState(() => getCurrentTimeStr())
  const [mealType, setMealType] = useState(() => getMealTypeFromTime(getCurrentTimeStr()))
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [portionNotes, setPortionNotes] = useState('')

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const savedThumbnailRef = useRef('')

  useEffect(() => {
    if (isOpen) {
      setStep('upload')
      if (imagePreview && imagePreview.startsWith('blob:')) {
        try { URL.revokeObjectURL(imagePreview) } catch (e) {}
      }
      setImagePreview(null)
      savedThumbnailRef.current = ''
      setErrorInfo(null)
      setFoodName('')
      const nowTime = getCurrentTimeStr()
      setMealTime(nowTime)
      setMealType(getMealTypeFromTime(nowTime))
      setCalories('')
      setProtein('')
      setCarbs('')
      setFats('')
      setPortionNotes('')
    } else {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        try { URL.revokeObjectURL(imagePreview) } catch (e) {}
      }
    }
  }, [isOpen])

  async function handleFileSelect(file) {
    if (!file) return
    setErrorInfo(null)
    setStep('analyzing')

    // Generate immediate crystal-clear original preview for UI (no downsampling)
    let localPreviewUrl = null
    try {
      localPreviewUrl = URL.createObjectURL(file)
      setImagePreview(localPreviewUrl)
    } catch (e) {}

    try {
      const { aiBase64, thumbnailBase64 } = await processFoodImage(file)
      savedThumbnailRef.current = thumbnailBase64
      if (!localPreviewUrl) {
        setImagePreview(aiBase64)
      }

      // Call AI Vision endpoint with optimized AI image
      const rawResponse = await analyzeImageWithGroq(
        aiBase64,
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
        const currentScanTime = mealTime || getCurrentTimeStr()
        setMealTime(currentScanTime)
        setMealType(getMealTypeFromTime(currentScanTime))
        setStep('review')
      } else {
        setErrorInfo({ type: 'unrecognized' })
        setStep('upload')
      }
    } catch (err) {
      console.error('Food scanning error:', err)
      const rawMsg = String(err?.message || '').toLowerCase()
      if (rawMsg.includes('identify') || rawMsg.includes('unclear') || rawMsg.includes('dimen') || rawMsg.includes('read image')) {
        setErrorInfo({ type: 'unrecognized' })
      } else if (rawMsg.includes('quota') || err?.name === 'QuotaExceededError') {
        purgeStorageBloat()
        setErrorInfo({ type: 'storage_quota' })
      } else {
        // AI model error, rate limit, provider exhaustion, timeout, etc.
        setErrorInfo({ type: 'limit' })
      }
      setStep('upload')
    }
  }

  function handleTimeChange(e) {
    const newTime = e.target.value
    setMealTime(newTime)
    if (newTime) {
      setMealType(getMealTypeFromTime(newTime))
    }
  }

  async function handleConfirmAdd() {
    if (!foodName.trim() || calories === '') return
    setSaving(true)
    try {
      const logDate = defaultDate || getTodayDateStr()
      let createdAt = new Date().toISOString()
      if (mealTime && logDate) {
        try {
          createdAt = new Date(`${logDate}T${mealTime}:00`).toISOString()
        } catch (e) {}
      }

      await onSave({
        date: logDate,
        meal_type: mealType || getMealTypeFromTime(mealTime),
        meal_time: mealTime,
        name: foodName.trim(),
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fats: Number(fats) || 0,
        notes: portionNotes.trim(),
        image_url: savedThumbnailRef.current || imagePreview || '',
        created_at: createdAt
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
        {/* Hidden inputs with delayed value clear to prevent WebKit dropping file stream */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
            setTimeout(() => {
              if (fileInputRef.current) fileInputRef.current.value = ''
            }, 100)
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
            setTimeout(() => {
              if (cameraInputRef.current) cameraInputRef.current.value = ''
            }, 100)
          }}
        />

        {/* STEP 1: Upload or Take Photo */}
        {step === 'upload' && (
          <div className="space-y-4">
            {errorInfo && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs space-y-2.5 animate-[fadeIn_.2s_ease]">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>
                    {errorInfo.type === 'unrecognized'
                      ? (language === 'zh' ? '未能清晰辨识食物' : 'Could Not Identify Food')
                      : errorInfo.type === 'storage_quota'
                      ? (language === 'zh' ? '手机浏览器缓存已满' : 'Browser Storage Full')
                      : (language === 'zh' ? 'AI 算力额度达上限或繁忙' : 'AI Rate Limit or Busy')}
                  </span>
                </div>

                <div className="text-slate-300 leading-relaxed text-xs whitespace-pre-line">
                  {errorInfo.type === 'unrecognized' ? (
                    language === 'zh'
                      ? 'AI 暂时未能清晰识别出照片中的食物。你可以尝试换个光线更好、更清晰的角度重新拍摄，或者直接使用“手动记录”快速添加～'
                      : "AI couldn't clearly identify the food in this photo. Please try a clearer picture with good lighting, or log it manually."
                  ) : errorInfo.type === 'storage_quota' ? (
                    language === 'zh'
                      ? '手机浏览器的本地存储额度已达到上限（多张高画质照片或历史聊天占满空间）。我们已自动为你清理了旧图片的冗余缓存，请点击“重新扫描”即可正常使用！✨'
                      : "Your mobile browser's local storage is full from saved meal photos or chat history. We've automatically cleaned up cached thumbnails—please tap 'Try Again' now!"
                  ) : (
                    language === 'zh'
                      ? '非常抱歉！🥹 因为 Axon 是一款完全免费向大家开放的学习与健身平台，我们能提供的免费 AI 视觉算力与识别额度确实有限。\n\n如果遇到使用高峰导致限额或系统繁忙，请稍等 3～5 分钟后再试～\n\n💡 提示：你也可以点击下方直接切换为手动记录快速添加饮食热量，非常感谢你的包容与体谅！✨'
                      : "We're really sorry! 🥹 Since Axon is a completely free companion platform, our free AI vision compute resources and scanning limits are limited.\n\nIf peak usage limit has been reached or the service is temporarily busy, please wait 3–5 minutes and try again~\n\n💡 Tip: You can also switch to Manual Entry to log your meal instantly. Thank you so much for your kind patience and understanding! ✨"
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setErrorInfo(null)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium text-xs transition-colors"
                  >
                    {language === 'zh' ? '稍后再试' : 'Try Again'}
                  </button>

                  {onSwitchToManual && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorInfo(null)
                        onSwitchToManual()
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-medium text-xs transition-colors"
                    >
                      {language === 'zh' ? '转为手动记录' : 'Log Manually'}
                    </button>
                  )}
                </div>
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
                onClick={() => {
                  if (imagePreview && imagePreview.startsWith('blob:')) {
                    try { URL.revokeObjectURL(imagePreview) } catch (e) {}
                  }
                  setImagePreview(null)
                  savedThumbnailRef.current = ''
                  setStep('upload')
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors inline-flex items-center justify-center shrink-0"
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

            {/* Food Name Editable (FIRST) */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Food Name (Editable)
              </label>
              <input
                type="text"
                value={foodName}
                onChange={e => setFoodName(e.target.value)}
                placeholder=""
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Confirm Meal Time (THEN) */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-400" /> Confirm Meal Time
              </label>
              <TimePicker
                value={mealTime}
                onChange={(newTime) => {
                  setMealTime(newTime)
                  if (newTime) {
                    setMealType(getMealTypeFromTime(newTime))
                  }
                }}
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
                  placeholder="0"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-bold text-base focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    placeholder="0"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white font-bold text-xs focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    placeholder="0"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white font-bold text-xs focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    placeholder="0"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white font-bold text-xs focus:outline-none focus:border-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
