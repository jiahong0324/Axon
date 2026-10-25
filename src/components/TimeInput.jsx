import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Check, Sparkles, ChevronDown, Plus, Minus } from 'lucide-react'

/**
 * Formats a 24-hr time string "HH:mm" (or "HH:mm:ss") to display format.
 * If use12hr is true, returns e.g. "02:39 AM" or "09:00 PM".
 * If use12hr is false, returns "02:39" or "21:00".
 */
export function formatIsoToDisplayTime(isoStr, use12hr = true) {
  if (!isoStr || typeof isoStr !== 'string') return ''
  const trimmed = isoStr.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return isoStr

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return isoStr
  }

  const mm = String(minutes).padStart(2, '0')

  if (!use12hr) {
    return `${String(hours).padStart(2, '0')}:${mm}`
  }

  const period = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  return `${String(h12).padStart(2, '0')}:${mm} ${period}`
}

/**
 * Parses user input (e.g. "2:30pm", "14:30", "9am", "09:15", "1430") to standard "HH:mm".
 * Returns empty string if invalid.
 */
export function parseDisplayToIsoTime(displayStr) {
  if (!displayStr || typeof displayStr !== 'string') return ''
  const raw = displayStr.trim().toLowerCase()

  // Match: "02:39 pm", "2:39pm", "2:39", "14:30"
  let match = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (match) {
    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const period = match[3]?.toLowerCase()

    if (minutes < 0 || minutes > 59) return ''

    if (period) {
      if (hours < 1 || hours > 12) return ''
      if (period === 'pm' && hours < 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
    } else {
      if (hours < 0 || hours > 23) return ''
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Match simple hour + am/pm: e.g. "9am", "9 pm", "11pm"
  match = raw.match(/^(\d{1,2})\s*(am|pm)$/i)
  if (match) {
    let hours = parseInt(match[1], 10)
    const period = match[2]?.toLowerCase()
    if (hours < 1 || hours > 12) return ''
    if (period === 'pm' && hours < 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
    return `${String(hours).padStart(2, '0')}:00`
  }

  // Match 4-digit military time: e.g. "1430" -> "14:30", "0900" -> "09:00"
  match = raw.match(/^(\d{2})(\d{2})$/)
  if (match) {
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }

  return ''
}

/**
 * Returns current local time as "HH:mm".
 */
export function getCurrentTimeIso() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const PRESET_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

/**
 * TimeInput component with keyboard input and a super user-friendly,
 * scroll-free interactive popup time picker.
 */
export default function TimeInput({
  value = '',
  onChange,
  placeholder,
  className = '',
  name,
  id,
  required = false,
  disabled = false,
  variant = 'default', // 'default' | 'compact' | 'inline'
  customTrigger,
  preferred12hr, // If undefined, reads from localStorage or defaults to true
  ...props
}) {
  // Check preference (default to 12hr for AM/PM picker unless explicitly set)
  const is12hrPref = preferred12hr !== undefined 
    ? preferred12hr 
    : (typeof window !== 'undefined' ? localStorage.getItem('timeFormat') !== '24hr' : true)

  const [use12hr, setUse12hr] = useState(is12hrPref)
  const [displayText, setDisplayText] = useState(() => formatIsoToDisplayTime(value, use12hr))
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)

  // Temporal draft time while picker is open
  const [draftTime, setDraftTime] = useState(value || '')

  const containerRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    setDisplayText(formatIsoToDisplayTime(value, use12hr))
    if (!isOpen) {
      setDraftTime(value || '')
    }
  }, [value, use12hr, isOpen])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const notifyChange = (isoVal) => {
    if (typeof onChange === 'function') {
      onChange({ target: { value: isoVal, name } })
    }
  }

  const handleTextChange = (e) => {
    const raw = e.target.value
    setDisplayText(raw)

    if (!raw.trim()) {
      notifyChange('')
      setDraftTime('')
      return
    }

    const iso = parseDisplayToIsoTime(raw)
    if (iso) {
      notifyChange(iso)
      setDraftTime(iso)
    }
  }

  const handleBlur = () => {
    if (!displayText.trim()) {
      if (value) notifyChange('')
      return
    }
    const iso = parseDisplayToIsoTime(displayText)
    if (iso) {
      setDisplayText(formatIsoToDisplayTime(iso, use12hr))
      if (iso !== value) notifyChange(iso)
    } else {
      // Revert to last valid value
      setDisplayText(formatIsoToDisplayTime(value, use12hr))
    }
  }

  const updateCoords = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const popoverWidth = 320
    const popoverHeight = 370
    const spaceBelow = window.innerHeight - rect.bottom
    const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight

    let top = showAbove
      ? Math.max(12, rect.top - popoverHeight - 6)
      : Math.min(window.innerHeight - popoverHeight - 12, rect.bottom + 6)
    if (top < 12) top = 12

    let left = rect.left
    if (rect.width < popoverWidth) {
      left = rect.left + (rect.width - popoverWidth) / 2
    }
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12)
    }
    if (left < 12) left = 12

    setCoords({ top, left, width: popoverWidth })
  }

  const togglePicker = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
    if (disabled) return

    if (!isOpen) {
      const initial = value || draftTime || getCurrentTimeIso()
      setDraftTime(initial)
      updateCoords()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  // Parse draft time components
  const parseCurrentDraft = () => {
    const target = draftTime || value || getCurrentTimeIso()
    const parts = target.split(':')
    const h = parseInt(parts[0], 10) || 0
    const m = parseInt(parts[1], 10) || 0
    return {
      hours24: Math.max(0, Math.min(23, h)),
      minutes: Math.max(0, Math.min(59, m)),
    }
  }

  const { hours24, minutes } = parseCurrentDraft()
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hour12 = hours24 % 12 || 12

  const applyDraft = (newH24, newM) => {
    let safeH = newH24
    let safeM = newM
    if (safeM >= 60) {
      safeH += Math.floor(safeM / 60)
      safeM = safeM % 60
    } else if (safeM < 0) {
      const hoursBack = Math.ceil(Math.abs(safeM) / 60)
      safeH -= hoursBack
      safeM = ((safeM % 60) + 60) % 60
    }
    safeH = ((safeH % 24) + 24) % 24
    const iso = `${String(safeH).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`
    setDraftTime(iso)
    notifyChange(iso)
    setDisplayText(formatIsoToDisplayTime(iso, use12hr))
  }

  const handleSelectHour12 = (selectedH12) => {
    let newH24 = selectedH12
    if (period === 'PM') {
      newH24 = selectedH12 === 12 ? 12 : selectedH12 + 12
    } else {
      newH24 = selectedH12 === 12 ? 0 : selectedH12
    }
    applyDraft(newH24, minutes)
  }

  const handleSelectHour24 = (selectedH24) => {
    applyDraft(selectedH24, minutes)
  }

  const handleSelectMinute = (selectedM) => {
    applyDraft(hours24, selectedM)
  }

  const handleTogglePeriod = (targetPeriod) => {
    if (targetPeriod === period) return
    let newH24 = hours24
    if (targetPeriod === 'PM' && hours24 < 12) {
      newH24 += 12
    } else if (targetPeriod === 'AM' && hours24 >= 12) {
      newH24 -= 12
    }
    applyDraft(newH24, minutes)
  }

  const handleNudgeMinute = (delta) => {
    applyDraft(hours24, minutes + delta)
  }

  const handleSetNow = () => {
    const nowIso = getCurrentTimeIso()
    setDraftTime(nowIso)
    notifyChange(nowIso)
    setDisplayText(formatIsoToDisplayTime(nowIso, use12hr))
  }

  const handleClear = () => {
    setDraftTime('')
    notifyChange('')
    setDisplayText('')
    setIsOpen(false)
  }

  const handleDone = () => {
    if (!value && draftTime) {
      notifyChange(draftTime)
    }
    setIsOpen(false)
  }

  // Outside click and esc listeners
  useEffect(() => {
    if (!isOpen) return

    updateCoords()

    const handleScrollOrResize = () => updateCoords()
    const handleMouseDown = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('touchstart', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('touchstart', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Content for the friendly time picker popover
  const pickerContent = (
    <div className="w-[316px] text-slate-100 select-none">
      {/* Top Header: Large Digital Display & Period Switch */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
            <span className="font-mono text-xl font-extrabold tracking-tight text-white">
              {use12hr ? String(hour12).padStart(2, '0') : String(hours24).padStart(2, '0')}
            </span>
            <span className="font-mono text-xl font-bold text-indigo-400 mx-1 animate-pulse">:</span>
            <span className="font-mono text-xl font-extrabold tracking-tight text-white">
              {String(minutes).padStart(2, '0')}
            </span>
          </div>

          {use12hr && (
            <div className="flex bg-slate-950/80 p-0.5 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => handleTogglePeriod('AM')}
                className={`!min-h-0 !min-w-0 px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                  period === 'AM'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handleTogglePeriod('PM')}
                className={`!min-h-0 !min-w-0 px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                  period === 'PM'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                PM
              </button>
            </div>
          )}
        </div>

        {/* 12h / 24h format toggle */}
        <button
          type="button"
          onClick={() => setUse12hr(prev => !prev)}
          className="!min-h-0 !min-w-0 text-[11px] font-semibold text-slate-400 hover:text-indigo-300 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors border border-white/5"
          title="Toggle 12h / 24h format"
        >
          {use12hr ? '12-hr' : '24-hr'}
        </button>
      </div>

      {/* Main Dual-Column Selector: Hours on left, Minutes on right */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Hours Column */}
        <div className="bg-slate-950/40 border border-white/5 rounded-xl p-2 flex flex-col">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Hour
            </span>
            <span className="text-[10px] font-mono text-indigo-400">
              {use12hr ? `${hour12} ${period}` : `${hours24}:00`}
            </span>
          </div>

          {use12hr ? (
            /* 12-Hour Grid (3 columns x 4 rows) */
            <div className="grid grid-cols-3 gap-1 place-items-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                const isSelected = hour12 === h
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleSelectHour12(h)}
                    className={`!min-h-0 !min-w-0 w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-1 ring-indigo-400'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {h}
                  </button>
                )
              })}
            </div>
          ) : (
            /* 24-Hour Grid (4 columns x 6 rows) */
            <div className="grid grid-cols-4 gap-1 place-items-center max-h-[148px] overflow-y-auto scrollbar-hide">
              {Array.from({ length: 24 }, (_, i) => i).map((h) => {
                const isSelected = hours24 === h
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleSelectHour24(h)}
                    className={`!min-h-0 !min-w-0 w-7 h-7 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Minutes Column */}
        <div className="bg-slate-950/40 border border-white/5 rounded-xl p-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                Minute
              </span>
              <span className="text-[10px] font-mono text-indigo-400">
                :{String(minutes).padStart(2, '0')}
              </span>
            </div>

            {/* Common Minute Presets (00, 05, 10, ... 55) */}
            <div className="grid grid-cols-3 gap-1 place-items-center mb-2">
              {PRESET_MINUTES.map((m) => {
                const isSelected = minutes === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectMinute(m)}
                    className={`!min-h-0 !min-w-0 w-8 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/40 ring-1 ring-indigo-400'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fine Tuning: -1m and +1m steppers */}
          <div className="flex items-center justify-between bg-slate-900/90 rounded-lg p-1 border border-white/10">
            <button
              type="button"
              onClick={() => handleNudgeMinute(-1)}
              className="!min-h-0 !min-w-0 h-6 w-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Minus 1 minute"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-200">
              {String(minutes).padStart(2, '0')}m
            </span>
            <button
              type="button"
              onClick={() => handleNudgeMinute(1)}
              className="!min-h-0 !min-w-0 h-6 w-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Plus 1 minute"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Interval Shortcuts */}
      <div className="flex items-center gap-1.5 mb-3 px-1">
        <span className="text-[10px] text-slate-500 font-medium">Quick:</span>
        {[0, 15, 30, 45].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleSelectMinute(m)}
            className={`!min-h-0 !min-w-0 flex-1 py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors ${
              minutes === m
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-transparent'
            }`}
          >
            :{String(m).padStart(2, '0')}
          </button>
        ))}
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleSetNow}
          className="!min-h-0 !min-w-0 px-2.5 py-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 font-bold transition-colors inline-flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Now
        </button>

        <div className="flex items-center gap-1.5">
          {!required && (
            <button
              type="button"
              onClick={handleClear}
              className="!min-h-0 !min-w-0 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleDone}
            className="!min-h-0 !min-w-0 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 inline-flex items-center gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            Done
          </button>
        </div>
      </div>
    </div>
  )

  const defaultPlaceholder = use12hr ? 'hh:mm AM/PM' : 'HH:mm'

  return (
    <>
      {customTrigger ? (
        <div
          ref={containerRef}
          onClick={togglePicker}
          className="relative inline-flex items-center group cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              togglePicker(e)
            }
          }}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          {typeof customTrigger === 'function'
            ? customTrigger({
                isOpen,
                toggle: togglePicker,
                value,
                displayValue: displayText,
                hours24,
                minutes,
                period,
                hour12
              })
            : customTrigger}
        </div>
      ) : variant === 'compact' ? (
        /* Compact Pill Variant (used in Food Scanner & Modals) */
        <div
          ref={containerRef}
          onClick={togglePicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              togglePicker(e)
            }
          }}
          className={`relative inline-flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg shadow-sm cursor-pointer transition-all ${
            isOpen ? 'ring-2 ring-indigo-500/50 border-indigo-500/50' : ''
          } ${className}`}
          title="Click to change time"
        >
          <Clock className={`h-3.5 w-3.5 ${isOpen ? 'text-indigo-400' : 'text-blue-400'} shrink-0`} />
          <span className="text-white font-semibold text-xs tracking-wide">
            {displayText || placeholder || 'Select time'}
          </span>
          <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} />
        </div>
      ) : variant === 'inline' ? (
        /* Ultra-compact inline table variant */
        <div ref={containerRef} className="relative inline-flex items-center">
          <input
            type="text"
            id={id}
            name={name}
            required={required}
            disabled={disabled}
            value={displayText}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onClick={togglePicker}
            placeholder={placeholder || defaultPlaceholder}
            className={`bg-transparent hover:bg-white/5 focus:bg-slate-900/90 rounded px-1.5 py-0.5 text-xs text-slate-200 font-medium border border-transparent focus:border-indigo-500/40 focus:outline-none text-center cursor-pointer ${className}`}
            {...props}
          />
        </div>
      ) : (
        /* Standard Full-width Form Input with Clock Button */
        <div ref={containerRef} className="relative flex items-center w-full min-w-0">
          <input
            type="text"
            id={id}
            name={name}
            required={required}
            disabled={disabled}
            value={displayText}
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder={placeholder || defaultPlaceholder}
            className={`w-full min-w-0 ${className || 'input'} pr-9 text-sm sm:text-base`}
            {...props}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={togglePicker}
              disabled={disabled}
              className={`!min-h-0 !min-w-0 h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isOpen ? 'text-indigo-400 bg-indigo-500/15' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Open time picker"
              aria-label="Open time picker"
            >
              <Clock className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Popover / Modal Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        isMobile ? (
          /* Mobile centered modal with backdrop */
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
            onTouchStart={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false)
            }}
          >
            <div
              ref={popoverRef}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700/90 rounded-2xl p-4 shadow-2xl shadow-black/90 animate-in zoom-in-95 duration-150"
            >
              {pickerContent}
            </div>
          </div>
        ) : (
          /* Desktop anchored popover */
          coords && (
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700/90 rounded-2xl p-4 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
            >
              {pickerContent}
            </div>
          )
        ),
        document.body
      )}
    </>
  )
}
